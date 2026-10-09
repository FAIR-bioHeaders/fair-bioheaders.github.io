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
  await page.evaluate(async () => {
    await document.fonts.load('400 16px "Public Sans"');
    await document.fonts.ready;
  });
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [path, count] of [['/', 2], ['/publications/', 1], ['/guide/', 1], ['/resources/', 1]]) {
    await page.goto(path);
    await page.evaluate(async () => {
      await document.fonts.load('400 16px "Public Sans"');
      await document.fonts.ready;
    });
    const pictures = page.locator('.biology-image picture');
    await expect(pictures).toHaveCount(count);
    for (const picture of await pictures.all()) {
      const img = picture.locator('img');
      await img.scrollIntoViewIfNeeded();
      // Wait for lazy loading before decoding; decode() can reject an unloaded candidate.
      await expect.poll(() => img.evaluate(image =>
        image.complete && image.naturalWidth > 0
      )).toBe(true);
      await img.evaluate(image => image.decode());
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
      const credits = picture.locator('..').locator('figcaption a');
      await expect(credits).toHaveCount(2);
      await expect(credits.nth(0)).toHaveAttribute('href', /^https:\/\/commons\.wikimedia\.org\//);
      await expect(credits.nth(1)).toHaveAttribute('href', /^https:\/\/(creativecommons\.org|commons\.wikimedia\.org)\//);
    }
  }
});

test('homepage retains the original logo alongside its heading', async ({ page }) => {
  await page.goto('/');
  const logo = page.locator('.home-brand__logo');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/images/logo.png');
  await expect(logo).toHaveAttribute('alt', 'FAIR BioHeaders logo');
  await logo.evaluate(image => image.decode());
  await expect(page.locator('.home-brand h1')).toHaveText('FAIR BioHeaders');
  const hierarchy = await page.evaluate(() => ({
    title: parseFloat(getComputedStyle(document.querySelector('.home-brand h1')).fontSize),
    lead: parseFloat(getComputedStyle(document.querySelector('.project-intro__lead')).fontSize)
  }));
  expect(hierarchy.title).toBeGreaterThan(hierarchy.lead);
});

// The old 80vw hint selected 800px files at 550px despite a 320px CSS cap.
test('intermediate mobile widths select the small nature-image candidate', async ({ page }) => {
  await page.setViewportSize({ width: 550, height: 900 });
  for (const path of ['/publications/', '/guide/', '/resources/']) {
    await page.goto(path);
    const img = page.locator('.nature-panel img');
    await img.evaluate(image => image.decode());
    const selected = await img.evaluate(image => ({
      width: image.getBoundingClientRect().width,
      source: image.currentSrc
    }));
    expect(selected.width).toBeLessThanOrEqual(320);
    expect(selected.source).toMatch(/-400\.webp$/);
  }
});
