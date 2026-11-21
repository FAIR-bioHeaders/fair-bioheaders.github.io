import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// /mappings/ renders the pinned mapping v1 surface (issue #29). The page is generated
// from scripts/mapping-snapshots/ bytes, so the assertions compare the rendered digest
// with the pin rather than trusting the wording, and they guard the status language the
// withheld "official" label and the recorded scope require.
const INVENTORY = 'assembly-dcmi.yml';
const MATRIX = 'profile-status.yml';

function digest(file) {
  const target = path.join(process.cwd(), 'scripts', 'mapping-snapshots', file);
  return createHash('sha256').update(readFileSync(target)).digest('hex');
}

async function openPage(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    await document.fonts.load('400 16px "Public Sans"');
    await document.fonts.ready;
  });
}

test('the crosswalk is the rendering of the pinned bytes', async ({ page }) => {
  await openPage(page, '/mappings/');
  const provenance = page.locator('.reference-provenance');
  await expect(provenance.first()).toHaveAttribute('data-mapping-sha256', digest(INVENTORY));
  await expect(provenance.first()).toHaveAttribute('data-mapping-profile-version', '0.1.0-draft.1');
  await expect(page.locator('#main')).toContainText(digest(MATRIX).slice(0, 12));
});

test('every FHR root field and context key is listed once, with its disposition', async ({ page }) => {
  await openPage(page, '/mappings/');
  await expect(page.locator('#root-fields .field-table tbody tr')).toHaveCount(24);
  const projected = await page.locator('#root-fields .field-table tbody tr').filter({ hasText: 'Conditional' }).count();
  const held = await page.locator('#root-fields .field-table tbody tr')
    .filter({ hasText: 'Not projected by mapping v1' }).count();
  expect(projected).toBe(9);
  expect(held).toBe(15);
  // The wording is the inventory's own: a field is not projected by this surface.
  await expect(page.locator('#main')).not.toContainText('unmap');
  for (const field of ['genome', 'metadataAuthor', 'checksum', 'seqcol_id', 'vitalStats']) {
    await expect(page.locator(`#root-fields code:text-is("${field}")`)).toHaveCount(1);
  }
  await expect(page.locator('#context-keys .field-table tbody tr')).toHaveCount(4);
  await expect(page.locator('#context-keys')).toContainText('not FHR fields');
});

test('planned targets are not presented as available', async ({ page }) => {
  await openPage(page, '/mappings/');
  const rows = page.locator('#target-status .field-table tbody tr');
  await expect(rows).toHaveCount(6);
  await expect(rows.filter({ hasText: 'Planned: no v1 surface exists' })).toHaveCount(5);
  await expect(rows.filter({ hasText: 'Draft fixture' })).toHaveCount(1);
  await expect(page.locator('#target-status')).toContainText('not claims that an adapter validates');
  // Coverage by type: only FHR has a v1 surface; FHT waits on its contract.
  const types = page.locator('#type-status .field-table tbody tr');
  await expect(types).toHaveCount(4);
  await expect(types.filter({ hasText: 'Not profiled' })).toHaveCount(2);
  await expect(types.filter({ hasText: 'Blocked on its contract' })).toHaveCount(1);
});

test('the adoption state is stated and the withheld claims are absent', async ({ page }) => {
  await openPage(page, '/mappings/');
  const adoption = page.locator('#adoption');
  await expect(adoption).toContainText('correct-but-not-final');
  await expect(adoption).toContainText('withheld');
  const text = (await page.locator('#main').innerText()).toLowerCase();
  for (const claim of ['official guidance', 'official mapping', 'this page exports', 'deposit-ready output']) {
    expect(text).not.toContain(claim);
  }
  // The upstream label is quoted as it stands rather than silently restated.
  await expect(adoption).toContainText('status: proposal');
  await expect(adoption).toContainText('0.1.0-draft.1');
  await expect(adoption).toContainText('0.13.1');
  await expect(adoption).toContainText('export-dcmi CLI');
  await expect(adoption).not.toContainText('ships anywhere else yet');
});

test('the worked example is reproduced verbatim and reports its own losses', async ({ page }) => {
  await openPage(page, '/mappings/');
  const pinned = readFileSync(path.join(process.cwd(), 'scripts', 'mapping-snapshots', 'qualified-dc.ttl'), 'utf8');
  const graph = page.locator('#example-qualified-dc-ttl pre');
  await expect(graph).toContainText('dcterms:conformsTo <https://w3id.org/fair-bioheaders/fhr/v0.4.0>');
  // Whitespace-insensitive equality: the file is reproduced unchanged, and escaped, so
  // nothing inside the fixture can execute on this site.
  expect((await graph.innerText()).replace(/\s+/g, ' ').trim()).toBe(pinned.replace(/\s+/g, ' ').trim());
  await expect(graph.locator('script, iframe, object, [src]')).toHaveCount(0);
  const report = page.locator('#example-report');
  await expect(report).toContainText('root fields not projected (15)');
  await expect(report).toContainText('not-assessed');
  await expect(report).toContainText('never silently prefer source or context');
  await expect(report).toContainText('retain source.json and context.json');
  // The two subjects keep separate creators and separate dates; nothing was merged.
  await expect(page.locator('#example-context-json pre')).toContainText('"publicationDate": "2026-02-02"');
});

test('the crosswalk works without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseURL + '/mappings/');
  await expect(page.locator('#root-fields .field-table tbody tr')).toHaveCount(24);
  await expect(page.locator('#target-status .field-table tbody tr')).toHaveCount(6);
  await expect(page.locator('#adoption')).toBeVisible();
  await context.close();
});

test('every scroll region is keyboard reachable and named, and jumps resolve', async ({ page }) => {
  await openPage(page, '/mappings/');
  const regions = page.locator('.field-table');
  const count = await regions.count();
  expect(count).toBeGreaterThanOrEqual(4);
  for (let index = 0; index < count; index += 1) {
    const region = regions.nth(index);
    await expect(region).toHaveAttribute('role', 'region');
    await expect(region).toHaveAttribute('tabindex', '0');
    await expect(region).toHaveAttribute('aria-label', /.+/);
    await expect(region.locator('caption')).toHaveCount(1);
    await expect(region.locator('th').first()).toHaveAttribute('scope', 'col');
  }
  // The heading anchors the in-page sections really exist.
  for (const id of ['root-fields', 'context-keys', 'target-status', 'type-status', 'worked-example', 'adoption']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('the page links the pinned upstream artifacts and no invented alias', async ({ page }) => {
  await openPage(page, '/mappings/');
  const commit = '1e6d692a37d55f322d7fa27c519b9a5254874e7e';
  await expect(page.locator(`a[href*="/FAIR-bioHeaders-Specification/blob/${commit}/mappings/proposals/assembly-dcmi.yml"]`)).toHaveCount(1);
  await expect(page.locator(`a[href*="/FAIR-bioHeaders-Specification/blob/${commit}/mappings/proposals/profile-status.yml"]`)).toHaveCount(1);
  await expect(page.locator('a[href*="/mappings/proposals/assembly-export-context.schema.json"]')).toHaveCount(1);
  // FHT and FHGM have no released contract, so no fixed alias may appear for them.
  await expect(page.locator('a[href^="https://w3id.org/fair-bioheaders/fht"]')).toHaveCount(0);
  await expect(page.locator('a[href^="https://w3id.org/fair-bioheaders/fhgm"]')).toHaveCount(0);
});

test('the mappings entry is reachable from the specifications menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page, '/specifications/');
  const group = page.locator('.masthead__menu-item--group:has(a[href="/specifications/"])');
  await group.locator('.nav-dropdown-toggle').click();
  await expect(group.locator('.nav-dropdown a[href="/mappings/"]')).toBeVisible();
  await group.locator('.nav-dropdown a[href="/mappings/"]').click();
  await expect(page).toHaveURL(/\/mappings\/$/);
  await expect(group).toHaveClass(/is-current/);
});

test('metadata-only source reference preserves roles and evidence boundaries', async ({ page }) => {
  await openPage(page, '/mappings/');
  const main = page.locator('#main');
  for (const value of [
    'GCF_000001215.4', 'Release 6 plus ISO1 MT', '2014-08-01',
    'The FlyBase Consortium/Berkeley Drosophila Genome Project/Celera Genomics',
    '2026-11-16', '3,681 bytes', 'metadata snapshot',
    'not an inferred assembly creator list', 'No sequence was obtained',
    'no exact file checksum, SeqCol digest or verified parent-file identity',
    'not a complete FHR header or export-context input',
    'does not archive the assembly or guarantee future persistence'
  ]) {
    await expect(main).toContainText(value, { useInnerText: true });
  }
  const base = 'https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/1a0792e6f8db1b73959999d30f5e6575b982cbfc/tests/fixtures/mapping-reference/';
  for (const file of ['README.md', 'reference.json', 'ncbi-response.json']) {
    await expect(main.locator('a[href="' + base + file + '"]')).toHaveCount(1);
  }
});
