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

test('biological images decode with reserved space and local responsive sources', async ({ page }) => {
  await page.goto('/');
  const pictures = page.locator('.biology-image picture');
  await expect(pictures).toHaveCount(2);
  for (const picture of await pictures.all()) {
    const img = picture.locator('img');
    await img.scrollIntoViewIfNeeded();
    // Lazy loading and responsive candidate changes can abort an in-flight decode.
    await expect.poll(() => img.evaluate(image =>
      image.decode().then(() => image.complete && image.naturalWidth > 0).catch(() => false)
    )).toBe(true);
    const info = await img.evaluate(image => ({
      width: image.width, height: image.height,
      naturalWidth: image.naturalWidth,
      declaredWidth: image.getAttribute('width'),
      declaredHeight: image.getAttribute('height'),
      currentSrc: image.currentSrc,
      alt: image.alt
    }));
    expect(info.naturalWidth).toBeGreaterThan(0);
    expect(Number(info.declaredWidth)).toBeGreaterThan(0);
    expect(Number(info.declaredHeight)).toBeGreaterThan(0);
    expect(info.width).toBeGreaterThan(0);
    expect(info.height).toBeGreaterThan(0);
    expect(info.currentSrc).toMatch(/^http:\/\/127\.0\.0\.1:4000\/images\/biology\/.*\.webp$/);
    expect(info.alt.length).toBeGreaterThan(0);
  }
});
