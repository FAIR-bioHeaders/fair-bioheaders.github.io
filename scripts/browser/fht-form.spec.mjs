import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
const folder = new URL('../fht-candidate/examples/fht/', import.meta.url);
const records = readdirSync(folder).filter(n => n.endsWith('.json')).map(n => [n, JSON.parse(readFileSync(new URL(n, folder)))]);
const id = p => '#tb-' + p.replace(/[^a-zA-Z0-9_-]/g, '-');
async function populate(page, record) {
  async function write(value, p) {
    if (p === 'schemaVersion') return;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        await page.locator(id('add-' + p)).click();
        await write(value[i], p + '.' + i);
      }
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) await write(child, p ? p + '.' + key : key);
    } else {
      const field = page.locator(id(p));
      if (await field.evaluate(e => e.tagName) === 'SELECT') await field.selectOption(String(value));
      else await field.fill(String(value));
    }
  }
  await write(record, '');
}
for (const [name, record] of records) test('released FHT normal form: ' + name, async ({page}) => {
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await page.selectOption('#tb-profile', 'FHT');
  await populate(page, record);
  await page.click('#tb-generate');
  await expect(page.locator('#tb-errors')).toBeHidden();
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
  expect(parse(await page.locator('#tb-yaml-source').innerText())).toEqual(record);
  const html = await page.locator('#tb-html-source').innerText();
  for (const [kind, expected] of [['html', html], ['yaml', await page.locator('#tb-yaml-source').innerText()]]) {
    const event = page.waitForEvent('download');
    await page.locator('#tb-download-' + kind).click();
    const download = await event;
    expect(readFileSync(await download.path(), 'utf8')).toBe(expected);
  }
  expect(html).toContain('itemtype="https://w3id.org/fair-bioheaders/fht/v0.7.0"');
  expect(html).not.toContain('main/fhr.json');
  await page.fill('#tb-transcriptome', 'changed');
  await expect(page.locator('#tb-download-html')).toBeDisabled();
});
test('FHT C1, unsafe number, unsupported selectors and inert text stay guarded', async ({page}) => {
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await page.selectOption('#tb-profile', 'FHT');
  const record = structuredClone(records.find(([,r]) => r.completeness)[1]);
  record.documentation = '</script><img src=x onerror=alert(1)> & "quote"';
  await populate(page, record);
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-html')).toBeEnabled();
  expect(await page.locator('#tb-html-source').innerText()).toContain('&lt;img');
  await page.fill('#tb-completeness-total', String(record.completeness.total + 1));
  await page.click('#tb-generate');
  await expect(page.locator('#tb-errors')).toContainText('C1');
  await expect(page.locator('#tb-download-html')).toBeDisabled();
  await page.fill('#tb-completeness-total', String(record.completeness.total));
  await page.fill('#tb-vitalStats-totalTranscripts', '9007199254740993');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-errors')).toContainText('cannot preserve');
  await page.fill('#tb-vitalStats-totalTranscripts', String(record.vitalStats.totalTranscripts));
  await page.fill('#tb-vitalStats-averageTranscriptLength', '1e-400');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-html')).toBeDisabled();
  await expect(page.locator('#tb-errors')).toContainText('number');
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fht/v99.0.0');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-errors')).toContainText('Unsupported schema target');
});
for (const theme of ['light', 'dark']) test('FHT form accessibility and narrow layout: ' + theme, async ({page}) => {
  await page.addInitScript(value => localStorage.setItem('fhr-theme', value), theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await page.selectOption('#tb-profile', 'FHT');
  await populate(page, records.find(([name]) => name === 'minimal-de-novo.fht.json')[1]);
  await page.click('#tb-generate');
  await page.evaluate(async () => { await document.fonts.load('400 16px "Public Sans"'); await document.fonts.ready; });
  const {default: AxeBuilder} = await import('@axe-core/playwright');
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#tb-schema').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#tb-schemaVersion')).toBeFocused();
});
