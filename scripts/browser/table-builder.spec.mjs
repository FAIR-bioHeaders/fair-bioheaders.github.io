import { test, expect } from '@playwright/test';

// Fill the required fields plus one metadata and one assembly author.
async function fillValid(page) {
  const set = (id, value) => page.fill('#' + id, value);
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await set('tb-genome', 'Synthetic human reference example');
  await set('tb-version', '0.0.1');
  await set('tb-taxon-name', 'Homo sapiens');
  await set('tb-taxon-uri', 'https://identifiers.org/taxonomy:9606');
  await set('tb-dateCreated', '2022-03-21');
  await page.selectOption('#tb-masking', 'soft-masked');
  await set('tb-checksum', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  await page.click('#tb-add-metadataAuthor');
  await set('tb-metadataAuthor-0-name', 'Adam Wright');
  await set('tb-metadataAuthor-0-uri', 'https://orcid.org/0000-0002-5719-4024');
  await page.click('#tb-add-assemblyAuthor');
  await set('tb-assemblyAuthor-0-name', 'David Molik');
  await set('tb-assemblyAuthor-0-uri', 'https://orcid.org/0000-0003-3192-6538');
  await page.click('#tb-generate');
}

test('the form loads only local assets and renders its fields', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4000/')) external.push(request.url());
  });
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await expect(page.locator('#tb-form .tb-form > fieldset.tb-group')).toHaveCount(9);
  expect(external).toEqual([]);
});

test('invalid input reports issues, preserves entries, and disables downloads', async ({ page }) => {
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await page.fill('#tb-genome', 'Kept value');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-errors')).toBeVisible();
  await expect(page.locator('#tb-status')).toContainText('Incomplete or invalid');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
  await expect(page.locator('#tb-download-html')).toBeDisabled();
  await expect(page.locator('#tb-genome')).toHaveValue('Kept value');
});

test('a valid record produces the table and both source blocks', async ({ page }) => {
  await fillValid(page);
  await expect(page.locator('#tb-status')).toContainText('Structural validation passed');
  await expect(page.locator('#tb-table')).toContainText('Synthetic human reference example');
  await expect(page.locator('#tb-table')).toContainText('Adam Wright');
  await expect(page.locator('#tb-html-source')).toContainText('<!doctype html>');
  await expect(page.locator('#tb-html-source')).toContainText('itemscope');
  await expect(page.locator('#tb-yaml-source')).toContainText('genome: "Synthetic human reference example"');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
});

test('downloads match the displayed source exactly', async ({ page }) => {
  await fillValid(page);
  const shownYaml = await page.textContent('#tb-yaml-source');
  const [yaml] = await Promise.all([page.waitForEvent('download'), page.click('#tb-download-yaml')]);
  const yamlPath = await yaml.path();
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(yamlPath, 'utf8')).toBe(shownYaml);
  expect(yaml.suggestedFilename()).toBe('fhr-metadata.yaml');

  const shownHtml = await page.textContent('#tb-html-source');
  const [html] = await Promise.all([page.waitForEvent('download'), page.click('#tb-download-html')]);
  expect(readFileSync(await html.path(), 'utf8')).toBe(shownHtml);
  expect(html.suggestedFilename()).toBe('fhr-metadata.html');
});

test('repeated generation and downloads stay consistent and revoke object URLs', async ({ page }) => {
  await page.addInitScript(() => {
    window.__revoked = [];
    const original = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => { window.__revoked.push(url); return original(url); };
  });
  await fillValid(page);
  const first = await page.textContent('#tb-yaml-source');
  const [one] = await Promise.all([page.waitForEvent('download'), page.click('#tb-download-yaml')]);
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(await one.path(), 'utf8')).toBe(first);
  await page.click('#tb-generate');
  const second = await page.textContent('#tb-yaml-source');
  const [two] = await Promise.all([page.waitForEvent('download'), page.click('#tb-download-yaml')]);
  expect(readFileSync(await two.path(), 'utf8')).toBe(second);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await page.evaluate(() => window.__revoked.length)).toBeGreaterThan(0);
});

test('editing after generating marks output stale and disables downloads', async ({ page }) => {
  await fillValid(page);
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
  await page.fill('#tb-genome', 'Changed');
  await expect(page.locator('#tb-status')).toContainText('Inputs changed');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
});

test('repeatable fields add, remove, and preserve order', async ({ page }) => {
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await page.click('#tb-add-metadataAuthor');
  await page.click('#tb-add-metadataAuthor');
  await page.fill('#tb-metadataAuthor-0-name', 'First');
  await page.fill('#tb-metadataAuthor-1-name', 'Second');
  await expect(page.locator('input[id^="tb-metadataAuthor-"][id$="-name"]')).toHaveCount(2);
  await page.locator('#tb-row-metadataAuthor-0 .tb-remove').click();
  await expect(page.locator('input[id^="tb-metadataAuthor-"][id$="-name"]')).toHaveCount(1);
  await expect(page.locator('#tb-metadataAuthor-0-name')).toHaveValue('Second');
});

test('user HTML in a value cannot become executable content', async ({ page }) => {
  await fillValid(page);
  await page.fill('#tb-documentation', '<script>window.__xss=1</script>');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-html-source')).toContainText('&lt;script&gt;');
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test('no console errors while generating and downloading', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await fillValid(page);
  await Promise.all([page.waitForEvent('download'), page.click('#tb-download-yaml')]);
  expect(errors).toEqual([]);
});

test('form statistics are typed numbers and survive YAML parsing', async ({ page }) => {
  await fillValid(page);
  await page.fill('#tb-vitalStats-N50', '100');
  await page.fill('#tb-vitalStats-L50', '0');
  await page.fill('#tb-vitalStats-gcContent', '37.5');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
  const { parse } = await import('yaml');
  const record = parse(await page.textContent('#tb-yaml-source'));
  expect(record.vitalStats).toEqual({ N50: 100, L50: 0, gcContent: 37.5 });
  await expect(page.locator('#tb-table')).toContainText('N50 (bp)');
});

test('unsupported schema targets block downloads and supported targets are explicit', async ({ page }) => {
  await fillValid(page);
  await expect(page.locator('#tb-schema')).toHaveValue('https://w3id.org/fair-bioheaders/fhr/v0.3.1');
  await expect(page.locator('#tb-status')).toContainText('FHR v0.3.1');
  await expect(page.locator('#tb-html-source')).toContainText('itemprop="schema" data-fhr-type="string">https://w3id.org/fair-bioheaders/fhr/v0.3.1</span>');
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v999');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
  await expect(page.locator('#tb-errors')).toContainText('Unsupported schema target');
  await page.fill('#tb-schema', 'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-status')).toContainText('cached raw-main development snapshot');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
});

test('nested and missing-list errors link to real focusable targets', async ({ page }) => {
  await fillValid(page);
  await page.fill('#tb-taxon-uri', 'bad uri');
  await page.fill('#tb-metadataAuthor-0-uri', 'bad uri');
  await page.fill('#tb-vitalStats-gcContent', '150');
  await page.click('#tb-add-relatedLink');
  await page.locator('#relatedLink-0').fill('bad uri');
  await page.click('#tb-generate');
  const links = page.locator('#tb-errors a');
  for (let i = 0; i < await links.count(); i++) {
    const link = links.nth(i);
    const target = await link.getAttribute('href');
    await expect(page.locator(target)).toHaveCount(1);
    await link.click();
    await expect(page.locator(target)).toBeFocused();
  }
  await page.locator('#tb-row-metadataAuthor-0 .tb-remove').click();
  await page.click('#tb-generate');
  const missing = page.locator('#tb-errors a').filter({ hasText: 'metadataAuthor: is required' });
  await missing.click();
  await expect(page.locator('#tb-metadataAuthor')).toBeFocused();
});
