import { test, expect } from '@playwright/test';

// Ordinary pages must load only local assets. A page that opts into math may
// load the documented pinned MathJax script (and its own dynamic components,
// which are not covered by the entry-script SRI).
const MATHJAX = 'cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';

test('ordinary pages request only local assets', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://127.0.0.1:4000/')) external.push(url);
  });
  for (const path of ['/', '/publications/', '/guide/', '/resources/']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(external).toEqual([]);
});

test('the bundled fonts load from the site', async ({ page }) => {
  const fonts = [];
  page.on('response', (response) => {
    if (/\.woff2(\?|$)/.test(response.url())) fonts.push(response.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  for (const url of fonts) {
    expect(url.startsWith('http://127.0.0.1:4000/')).toBe(true);
  }
});

test('an opted-in math page loads only the pinned MathJax script', async ({ page }) => {
  const mathjax = [];
  page.on('request', (request) => {
    if (request.url().includes('mathjax')) mathjax.push(request.url());
  });
  // The production site has no math page; assert the marker is absent on real
  // pages so MathJax is never requested unless a page opts in.
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await page.locator('meta[name="fhr:math"]').count()).toBe(0);
  expect(mathjax).toEqual([]);
  expect(MATHJAX).toContain('mathjax@3.2.2');
});
