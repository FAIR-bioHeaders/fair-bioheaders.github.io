import {test, expect} from '@playwright/test';

test('family overview and guide keep type scope and historical workflow clear', async ({page}) => {
  await page.goto('/');
  const main = page.locator('#main');
  await expect(main).toContainText('collectively called FH*');
  for (const type of ['FHR — reference genomes', 'FHT — transcriptomes', 'FHP — protein sets', 'FHGFF3 — annotations']) {
    await expect(main).toContainText(type);
  }
  await expect(main).toContainText('FHT has no released family contract yet');
  await page.goto('/guide/');
  await expect(page.locator('h1')).toHaveText('Using FH*');
  await expect(page.locator('#choose-a-header')).toBeVisible();
  await expect(page.locator('#main')).toContainText('historical FHR-only workflow');
  await expect(page.locator('#main')).toContainText('fhr==0.3.3');
});

test('JavaScript examples stays in More across resize and supports keyboard access', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1920, height: 1000});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const secondary = page.locator('#overflow-navigation a[href="/metadata-viewer/"]');
  const toggle = page.locator('.nav-toggle');
  for (const width of [1920, 320, 1920]) {
    await page.setViewportSize({width, height: 1000});
    await expect(page.locator('.visible-links a[href="/metadata-viewer/"]')).toHaveCount(0);
    await expect(secondary).toHaveCount(1);
    await expect(toggle).toBeVisible();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(secondary).toBeVisible();
    await secondary.focus();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  }
  await toggle.click();
  await secondary.click();
  await expect(page).toHaveURL(/\/metadata-viewer\/$/);
});

test('JavaScript examples navigation remains accessible without JavaScript', async ({browser, baseURL}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 320, height: 800}});
  const page = await context.newPage();
  await page.goto(baseURL + '/');
  const link = page.locator('#site-nav a[href="/metadata-viewer/"]');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/metadata-viewer\/$/);
  await context.close();
});
