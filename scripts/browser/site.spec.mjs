import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { focusFirstLink, prepareClipboard, copiedText } from './engine-helpers.mjs';

// Representative pages: home (h-cards, theme), publications (cite controls),
// resources (repo references + citations).
const PAGES = ['/', '/publications/', '/guide/', '/resources/', '/table-builder/', '/metadata-viewer/',
  '/specifications/', '/specifications/fhr/', '/specifications/fht/', '/specifications/fhp/',
  '/specifications/fhgff3/', '/specifications/fhgm/', '/mappings/',
  '/tools/', '/tools/r/', '/tools/javascript/', '/tools/java/', '/tools/julia/'];

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
  test('skip link focuses the main landmark', async ({ page, browserName }) => {
    await openPage(page, '/');
    // WebKit's platform default keeps links out of the sequential Tab order
    // entirely (engine-helpers.mjs), so the keyboard path is asserted where
    // Tab reaches links and the activation contract is asserted everywhere.
    await focusFirstLink(page, browserName, '.skip-link');
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
  test('Cite reveals BibTeX and Copy updates the button', async ({ page, context, browserName }) => {
    await prepareClipboard(page, context, browserName);
    await openPage(page, '/resources/');
    const reference = page.locator('#Wright2024');
    await reference.locator('.cite-button').click();
    const output = reference.locator('.cite-output');
    await expect(output).toBeVisible();
    await expect(output).toContainText('@article{Wright2024,');
    await reference.locator('.cite-copy').click();
    await expect(reference.locator('.cite-copy')).toHaveText('Copied');
    expect(await copiedText(page, browserName)).toContain('@article{Wright2024,');
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
  // axe-core's in-page analysis is the slowest step of the suite on Firefox
  // (the 2026-11-19 final matrix had three /specifications/ scans exceed the
  // 30 s default under four-worker contention — timeouts, not violations:
  // every scan that completed reported zero violations on all engines).
  for (const path of PAGES) {
    for (const value of ['light', 'dark']) {
      test(`axe passes on ${path} (${value})`, async ({ page }) => {
        test.setTimeout(120000);
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

// These source-build guides must not silently become registry/released-type claims.
for (const [language, revision] of Object.entries({
  r: 'a91e135aa11c56ca37f99d222430343babe4da30',
  javascript: 'bac1781aac5162ccb18003a8bc268fe576f6eba7',
  java: '5fb3d1d1b98304c908a6fb40b02340fa7048c65d',
  julia: '8b306fac947c615b1c170e6ac76d8cb60665057b'
})) {
  test(`source support boundaries on /tools/${language}/`, async ({ page }) => {
    await openPage(page, `/tools/${language}/`);
    const content = page.locator('.page__content');
    await expect(content).toContainText(revision);
    await expect(content).toContainText('not support for the subsequently published');
    await expect(content.locator('a[href="/tools/"]')).toBeVisible();
    await expect(content.locator('a[href="/metadata-viewer/"]')).toBeVisible();
  });
}
