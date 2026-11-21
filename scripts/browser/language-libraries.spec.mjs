import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the guide leads to the library hub and every language has a setup route', async ({ page }) => {
  await page.goto('/guide/');
  await expect(page.locator('#current-fhr-only-workflow')).toBeVisible();
  const links = page.locator('#main a[href^="/language-libraries/"]');
  expect(await links.count()).toBeGreaterThanOrEqual(5);
  await links.first().click(); await expect(page).toHaveURL(/\/language-libraries\/$/);
  for (const path of ['/tools/', '/tools/r/', '/tools/javascript/', '/tools/java/', '/tools/julia/']) {
    const href = page.locator(`#main a[href="${path}"]`).first(); await expect(href).toBeVisible();
  }
  await expect(page.locator('#main')).toContainText('not new');
});

for (const theme of ['light', 'dark']) test(`hub is accessible at page-load theme ${theme}`, async ({ page }, info) => {
  await page.addInitScript(theme => localStorage.setItem('fhr-theme', theme), theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/language-libraries/', '/guide/']) {
    await page.goto(path); await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (['desktop','mobile-320'].includes(info.project.name) && path === '/language-libraries/') await page.screenshot({ path: info.outputPath(`libraries-${info.project.name}-${theme}.png`), fullPage: true });
  }
});

test('library hub stays reachable through the dropdown without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4000/');
  const link = page.locator('#site-nav a[href="/language-libraries/"]'); await expect(link).toBeVisible();
  await link.click(); await expect(page).toHaveURL(/\/language-libraries\/$/); await context.close();
});
