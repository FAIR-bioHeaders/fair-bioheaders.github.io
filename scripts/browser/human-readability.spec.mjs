import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark']) test(`entry pages remain readable in ${theme}`, async ({ page }, info) => {
  await page.addInitScript(theme => localStorage.setItem('fhr-theme', theme), theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/table-builder/', '/specifications/', '/resources/', '/tools/', '/mappings/']) {
    await page.goto(path); await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (['desktop','mobile-320'].includes(info.project.name) && ['/','/table-builder/'].includes(path)) {
      await page.screenshot({ path: info.outputPath(`readability-${info.project.name}-${theme}-${path === '/' ? 'home' : 'builder'}.png`), fullPage: true });
    }
  }
});

test('builder puts the task first and keeps technical details keyboard-accessible', async ({ page }) => {
  await page.goto('/table-builder/');
  const details = page.locator('#tb-advanced-details');
  expect(await page.locator('#table-builder').evaluate((node) => !!(node.compareDocumentPosition(document.getElementById('tb-advanced-details')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(details).not.toHaveAttribute('open', '');
  const summary = details.locator('summary'); await summary.focus(); await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details).toContainText('Extension fields'); await expect(details).toContainText('Dotted BUSCO');
  await expect(details).toContainText('unsupported target');
});
