import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Representative pages: home (h-cards, theme), publications (cite controls),
// resources (repo references + citations).
const PAGES = ['/', '/publications/', '/guide/', '/resources/', '/table-builder/'];

// Inspect settled layouts, not the intro animation or a fallback-font frame.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function openPage(page, path) {
  await page.goto(path);
  await page.evaluate(async () => {
    await document.fonts.load('400 16px "Public Sans"');
    await document.fonts.ready;
  });
}


// Emulate the color scheme before navigation so theme.js picks it up, and
// reduce motion so transitions are not sampled mid-animation.
async function withTheme(page, value) {
  await page.emulateMedia({ colorScheme: value, reducedMotion: 'reduce' });
}

test.describe('layout and motion', () => {
  for (const path of PAGES) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await openPage(page, path);
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test(`article clears the fixed masthead on ${path}`, async ({ page }) => {
      await openPage(page, path);
      const clears = await page.evaluate(() => {
        const masthead = document.querySelector('.masthead');
        const main = document.querySelector('#main');
        if (!masthead || !main) return false;
        return main.getBoundingClientRect().top >= masthead.getBoundingClientRect().bottom - 1;
      });
      expect(clears).toBe(true);
    });
  }

  test('reduced motion disables the intro animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPage(page, '/');
    const duration = await page.evaluate(() => getComputedStyle(document.querySelector('#main')).animationDuration);
    expect(duration === '0.001ms' || parseFloat(duration) < 0.01).toBe(true);
  });
});

test.describe('keyboard and theme', () => {
  test('skip link focuses the main landmark', async ({ page }) => {
    await openPage(page, '/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('overflow menu opens, closes on Escape, and reports aria-expanded', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openPage(page, '/');
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('theme toggle persists across reloads', async ({ page }) => {
    await withTheme(page, 'light');
    await openPage(page, '/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    for (const path of PAGES) {
      await openPage(page, path);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('citation controls', () => {
  test('Cite reveals BibTeX and Copy updates the button', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openPage(page, '/resources/');
    const reference = page.locator('#Wright2024');
    await reference.locator('.cite-button').click();
    const output = reference.locator('.cite-output');
    await expect(output).toBeVisible();
    await expect(output).toContainText('@article{Wright2024,');
    await reference.locator('.cite-copy').click();
    await expect(reference.locator('.cite-copy')).toHaveText('Copied');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('@article{Wright2024,');
  });

  test('Copy falls back when the Clipboard API rejects', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('clipboard unavailable')) }
      });
      document.execCommand = () => true;
    });
    await openPage(page, '/resources/');
    const reference = page.locator('#Wright2024');
    await reference.locator('.cite-button').click();
    await reference.locator('.cite-copy').click();
    await expect(reference.locator('.cite-copy')).toHaveText('Copied');
  });

  test('Copy reports failure when the Clipboard API and fallback fail', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined
      });
      document.execCommand = () => false;
    });
    await openPage(page, '/resources/');
    const reference = page.locator('#Wright2024');
    await reference.locator('.cite-button').click();
    await reference.locator('.cite-copy').click();
    await expect(reference.locator('.cite-copy')).toHaveText('Copy failed');
  });
});

test.describe('accessibility', () => {
  for (const path of PAGES) {
    for (const value of ['light', 'dark']) {
      test(`axe passes on ${path} (${value})`, async ({ page }) => {
        await withTheme(page, value);
        await openPage(page, path);
        // The existing ready handler makes code scrollers keyboard reachable.
        await page.waitForFunction(() => [...document.querySelectorAll(".highlight pre")]
          .every(pre => pre.tabIndex >= 0));
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});
