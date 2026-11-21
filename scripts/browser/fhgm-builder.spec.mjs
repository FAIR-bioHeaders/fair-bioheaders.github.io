import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

async function ready(page) {
  await page.goto('/fhgm-builder/');
  await expect(page.getByRole('button', { name: 'Check structure and build table' })).toBeEnabled();
}
async function valid(page) {
  await ready(page);
  await page.locator('[name=modelId]').fill('example:gene-1');
  await page.locator('[name=modelVersion]').fill('opaque-v1');
  await page.locator('[name=featureId]').fill('gene-1');
  await page.getByLabel('Include genome reference', { exact: true }).check();
  await page.locator('[name="reference.genomeReference.accession"]').fill('EXAMPLE_1');
  await page.locator('[name="reference.genomeReference.seqcol_id"]').fill('A'.repeat(32));
  await page.getByRole('button', { name: 'Check structure and build table' }).click();
  await expect(page.locator('#fhgm-builder [role=status]')).toContainText('Record structure passed');
}

test('local-only editing, lossless downloads, injection escaping and stale clearing', async ({ page }) => {
  const external = []; const errors = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4000/')) external.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await valid(page);
  for (const kind of ['json', 'yaml', 'snippet']) {
    const source = await page.locator(`[data-source=${kind}]`).textContent();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-download=${kind}]`).click()]);
    expect(readFileSync(await download.path(), 'utf8')).toBe(source);
  }
  const attack = '<script>alert("model")</script>';
  await page.locator('[name=modelId]').fill(attack);
  await expect(page.locator('[data-download=json]')).toBeDisabled();
  await expect(page.locator('[data-source=json]')).toHaveText('');
  await page.getByRole('button', { name: 'Check structure and build table' }).click();
  await expect(page.locator('[data-model-table]')).toContainText(attack);
  await expect(page.locator('[data-model-table] script')).toHaveCount(0);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-download=html]').click()]);
  const html = readFileSync(await download.path(), 'utf8');
  expect(html).toContain('&lt;script&gt;'); expect(html).not.toMatch(/itemscope|itemprop|<script>/);
  expect(external).toEqual([]); expect(errors).toEqual([]);
  await page.reload(); await expect(page.locator('[name=modelId]')).toHaveValue('');
});

test('error links retain hints and follow reindexed repeatable fields', async ({ page }) => {
  await valid(page);
  await page.locator('[name=modelId]').fill('bad\u200b');
  await page.getByRole('button', { name: 'Check structure and build table' }).click();
  await expect(page.locator('[data-model-errors]')).toContainText('invisible formatting');
  await expect(page.locator('[data-model-errors]')).not.toContainText('parent relationship');
  await page.locator('[name=modelId]').fill('example:gene-1');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add contributors entry' }).click();
  await page.locator('[name="contributors.0.name"]').fill('First');
  await page.locator('[name="contributors.0.role"]').fill('annotation');
  await page.locator('[name="contributors.1.name"]').fill('Removed');
  await page.locator('[name="contributors.1.role"]').fill('annotation');
  await page.locator('[name="contributors.2.name"]').fill('Last');
  await page.locator('[name="contributors.2.role"]').fill('annotation');
  await page.locator('fieldset').filter({ has: page.locator('[name="contributors.1.name"]') }).last().locator('..').getByRole('button', { name: 'Remove entry', exact: true }).click();
  await page.locator('[name="contributors.1.role"]').fill('');
  await page.getByRole('button', { name: 'Check structure and build table' }).click();
  await page.locator('[data-model-errors]').getByRole('button', { name: /contributors.1.role/ }).first().click();
  await expect(page.locator('[name="contributors.1.role"]')).toBeFocused();
  await expect(page.locator('[name="contributors.1.role"]')).toHaveAttribute('aria-describedby', /fm-error-/);
  await page.locator('[name="contributors.1.role"]').fill('review');
  await page.getByRole('button', { name: 'Check structure and build table' }).click();
  const record = JSON.parse(await page.locator('[data-source=json]').textContent());
  expect(record.contributors.map(c => c.name)).toEqual(['First', 'Last']);
  await expect(page.locator('[name="contributors.1.role"]')).not.toHaveAttribute('aria-invalid', 'true');
});

for (const theme of ['light', 'dark']) test(`readable keyboard layout and accessibility in ${theme}`, async ({ page }, info) => {
  await page.addInitScript(theme => { localStorage.setItem('fhr-theme', theme); }, theme);
  await valid(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
  await page.locator('[name=modelId]').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('[name=modelVersion]')).toBeFocused();
  if (['desktop', 'mobile-320'].includes(info.project.name)) await page.screenshot({ path: info.outputPath(`fhgm-${info.project.name}-${theme}.png`), fullPage: true });
});

test('schema tampering refuses all editing and exports', async ({ page }) => {
  await page.route('**/assets/schema/fhgm-0.1.json', async route => {
    const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()) + '\n' });
  });
  await page.goto('/fhgm-builder/');
  await expect(page.locator('#fhgm-builder [role=status]')).toContainText('could not be verified');
  await expect(page.locator('[name=modelId]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check structure and build table' })).toBeDisabled();
  await expect(page.locator('[data-download=json]')).toBeDisabled();
});

test('without JavaScript the form remains disabled and the scope stays readable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4000/fhgm-builder/');
  await expect(page.getByText('JavaScript is required for the form.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check structure and build table' })).toBeDisabled();
  await context.close();
});


test('preserves long identifiers without silently truncating input', async ({ page }) => {
  await valid(page);
  const value = 'model-' + 'a'.repeat(9000);
  await page.locator('[name=modelId]').fill(value);
  await expect(page.locator('[name=modelId]')).toHaveValue(value);
  await page.getByRole('button', { name: 'Check structure and build table' }).click();
  expect(JSON.parse(await page.locator('[data-source=json]').textContent()).modelId).toBe(value);
});
