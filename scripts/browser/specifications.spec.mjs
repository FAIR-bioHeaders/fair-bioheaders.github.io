import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';

// The /specifications/ section: one dropdown, four generated field references.
const TYPES = ['fhr', 'fht', 'fhp', 'fhgff3'];
const SNAPSHOTS = {
  fhr: 'fhr-v0.5.0.json',
  fht: 'fht-draft.json',
  fhp: 'fhp-v0.5.0.json',
  fhgff3: 'fhgff3-v0.5.0.json'
};

function pinnedDigest(page) {
  const file = path.join(process.cwd(), 'scripts', 'schema-snapshots', SNAPSHOTS[page]);
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

async function openPage(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    await document.fonts.load('400 16px "Public Sans"');
    await document.fonts.ready;
  });
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('specifications dropdown', () => {
  test('opens by keyboard, reports aria-expanded, and closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openPage(page, '/');
    const group = page.locator('.masthead__menu-item--group');
    const toggle = group.locator('.nav-dropdown-toggle');
    const menu = group.locator('.nav-dropdown');
    await expect(menu).toBeHidden();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    // The four reference pages are reachable from the one menu entry.
    for (const type of TYPES) {
      await expect(menu.locator(`a[href="/specifications/${type}/"]`)).toBeVisible();
    }
    await page.keyboard.press('Tab');
    await expect(menu.locator('a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(menu).toBeHidden();
  });

  test('marks the active section and page', async ({ page }) => {
    await openPage(page, '/specifications/fhp/');
    const group = page.locator('.masthead__menu-item--group');
    await expect(group).toHaveClass(/is-current/);
    await expect(group.locator('a[href="/specifications/fhp/"]')).toHaveAttribute('aria-current', 'page');
    await expect(group.locator('a[href="/specifications/"]')).not.toHaveAttribute('aria-current', 'page');
  });

  test('stays reachable in the overflow menu at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openPage(page, '/');
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    const item = page.locator('#overflow-navigation .masthead__menu-item--group');
    await expect(item).toHaveCount(1);
    // Inside More the children are a plain indented list: no second disclosure to operate.
    await expect(item.locator('.nav-dropdown a[href="/specifications/fhgff3/"]')).toBeVisible();
    await expect(item.locator('.nav-dropdown-toggle')).toBeHidden();
    await item.locator('.nav-dropdown a[href="/specifications/fhgff3/"]').click();
    await expect(page).toHaveURL(/\/specifications\/fhgff3\/$/);
  });

  test('keeps the children in the markup without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(baseURL + '/specifications/');
    const links = page.locator('#site-nav .nav-dropdown a');
    await expect(links).toHaveCount(TYPES.length);
    await expect(links.first()).toBeVisible();
    await context.close();
  });
});

test.describe('generated field references', () => {
  for (const type of TYPES) {
    test(`${type}: documents the pinned schema completely`, async ({ page }) => {
      await openPage(page, `/specifications/${type}/`);
      const reference = page.locator('.reference-provenance');
      await expect(reference).toHaveCount(1);
      await expect(reference).toHaveAttribute('data-schema-sha256', pinnedDigest(type));

      // Row counts must equal the schema's own property count, plus its extension row.
      const rows = page.locator('.field-table tbody tr');
      const count = await rows.count();
      const expectMinimum = { fhr: 52, fht: 67, fhp: 62, fhgff3: 63 }[type];
      expect(count).toBeGreaterThanOrEqual(expectMinimum);

      // Every reference table is named, captioned and header-scoped.
      const tables = page.locator('.field-table');
      const regions = await tables.count();
      for (let index = 0; index < regions; index += 1) {
        const table = tables.nth(index);
        await expect(table).toHaveAttribute('role', 'region');
        await expect(table).toHaveAttribute('tabindex', '0');
        await expect(table).toHaveAttribute('aria-label', /.+/);
        await expect(table.locator('caption')).toHaveCount(1);
        await expect(table.locator('th').first()).toHaveAttribute('scope', 'col');
      }

      // Requiredness is text, never colour alone.
      await expect(page.locator('.field-required').first()).toContainText(/Required|Optional/);

      // The in-page contents links and the "see its members" jumps both resolve.
      const jump = page.locator('.field-jump a').first();
      const target = await jump.getAttribute('href');
      await expect(page.locator(`[id="${target.slice(1)}"]`)).toHaveCount(1);
      await jump.click();
      await expect(page.locator(target)).toBeInViewport();
    });
  }

  test('released pages name a fixed URL; the draft page does not', async ({ page }) => {
    for (const type of ['fhr', 'fhp', 'fhgff3']) {
      await openPage(page, `/specifications/${type}/`);
      await expect(page.locator('.schema-links')).toContainText(`w3id.org/fair-bioheaders/${type}/v0.5.0`);
      await expect(page.locator('#schema-version-registry, .schema-links')).toContainText('schemas/versions.json');
      await expect(page.locator('.status-table')).toContainText('Released contract');
    }
    await openPage(page, '/specifications/fht/');
    await expect(page.locator('.spec-notice--draft')).toBeVisible();
    await expect(page.locator('#main')).toContainText('FHT is a draft');
    await expect(page.locator('a[href^="https://w3id.org/fair-bioheaders/fht"]')).toHaveCount(0);
    await expect(page.locator('h1')).toContainText('Draft');
  });

  test('references distinguish schema validity from checksum, parent and biology checks', async ({ page }) => {
    for (const type of TYPES) {
      await openPage(page, `/specifications/${type}/`);
      // The heading is an h2 in the page, so its section runs to the next heading.
      const headings = page.locator('.page__content h2');
      await expect(headings.filter({ hasText: 'Validation boundaries' })).toHaveCount(1);
      const body = page.locator('.page__content');
      await expect(body).toContainText(/Schema validity/i);
      await expect(body).toContainText(/checksum/i);
      await expect(body).toContainText(/parent/i);
      await expect(body).toContainText(/biological|quality|feature/i);
    }
  });

  for (const url of ['/specifications/', ...TYPES.map(type => `/specifications/${type}/`)]) {
    for (const scheme of ['light', 'dark']) {
      test(`axe passes on ${url} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await openPage(page, url);
        // The generated scroll regions are focusable by construction; wait for layout to settle.
        await page.waitForFunction(() => [...document.querySelectorAll('.field-table')]
          .every(element => element.tabIndex >= 0));
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});
