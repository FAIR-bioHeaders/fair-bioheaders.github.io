import { test, expect } from '@playwright/test';
import { midSessionThemeAxeEngines } from './engine-helpers.mjs';

// Fill the required fields plus one metadata and one assembly author.
async function fillValid(page) {
  const set = (id, value) => page.fill('#' + id, value);
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-form fieldset');
  await set('tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.3.1');
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
  // Nine authored FHR groups plus the extension-field section.
  await expect(page.locator('#tb-form .tb-form > fieldset.tb-group')).toHaveCount(10);
  expect(external).toEqual([]);
});

test('only the pinned snapshots are requested, and they are the current release', async ({ page }) => {
  const loaded = [];
  page.on('request', (request) => {
    if (/\/assets\/schema\/.*\.json$/.test(request.url())) loaded.push(request.url().replace('http://127.0.0.1:4000', ''));
  });
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-schema');
  expect(loaded.sort()).toEqual([
    '/assets/schema/fhgff3-v0.4.0.json', '/assets/schema/fhgff3-v0.6.0.json',
    '/assets/schema/fhp-v0.4.0.json', '/assets/schema/fhp-v0.6.0.json',
    '/assets/schema/fhr-v0.3.1.json', '/assets/schema/fhr-v0.4.0.json', '/assets/schema/fhr-v0.6.0.json',
    '/assets/schema/fhr.json'
  ].sort());
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

test('field errors become accessible descriptions and clear without losing help', async ({ page }) => {
  await fillValid(page);
  const uri = page.locator('#tb-taxon-uri');
  const error = page.locator('#tb-taxon-uri-error');
  const help = await page.locator('#tb-taxon-uri-help').textContent();
  await uri.fill('bad uri');
  await page.click('#tb-add-relatedLink');
  const related = page.locator('#relatedLink-0');
  await related.fill('bad uri');
  await page.click('#tb-generate');
  await expect(uri).toHaveAttribute('aria-invalid', 'true');
  await expect(error).toBeVisible();
  await expect(error).toContainText('must be a URI');
  await expect(uri).toHaveAttribute('aria-describedby', 'tb-taxon-uri-help tb-taxon-uri-error');
  await expect(uri).toHaveAccessibleDescription(help + ' ' + await error.textContent());
  await expect(related).toHaveAccessibleDescription('must be a URI');
  await page.click('#tb-generate');
  await expect(uri).toHaveAttribute('aria-describedby', 'tb-taxon-uri-help tb-taxon-uri-error');
  await uri.fill('https://identifiers.org/taxonomy:9606');
  await related.fill('https://example.org/');
  await page.click('#tb-generate');
  await expect(uri).not.toHaveAttribute('aria-invalid');
  await expect(uri).toHaveAttribute('aria-describedby', 'tb-taxon-uri-help');
  await expect(uri).toHaveAccessibleDescription(help);
  await expect(error).toBeHidden();
  await expect(related).not.toHaveAttribute('aria-describedby');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
});

test('current release defaults to schema 2.1 and preserves new fields through exports', async ({ page }) => {
  await page.goto('/table-builder/');
  await expect(page.locator('#tb-schema')).toHaveValue('https://w3id.org/fair-bioheaders/fhr/v0.6.0');
  await expect(page.locator('#tb-schemaVersion')).toHaveValue('2.1');
  await expect(page.locator('#tb-schemaVersion')).toHaveAttribute('readonly', '');
  await fillValid(page);
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.6.0');
  await page.selectOption('#tb-metadataAuthor-0-nameType', 'Organizational');
  await page.fill('#tb-vitalStats-scaffoldN50', '200');
  await page.fill('#tb-vitalStats-scaffoldL50', '0');
  await page.fill('#tb-vitalStats-gcContent', '0.42');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
  await page.click('#tb-generate');
  await expect(page.locator('#tb-status')).toContainText('FHR v0.6.0 (schema 2.1)');
  await expect(page.locator('#tb-yaml-source')).toContainText('schemaVersion: "2.1"');
  await expect(page.locator('#tb-yaml-source')).toContainText('scaffoldL50: 0');
  await expect(page.locator('#tb-yaml-source')).toContainText('gcContent: 0.42');
  await expect(page.locator('#tb-table')).toContainText('Organizational');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.3.1');
  await expect(page.locator('#tb-schemaVersion')).toHaveValue('1');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
  await expect(page.locator('#tb-yaml-source')).toContainText('schemaVersion: 1.0');
  await expect(page.locator('#tb-vitalStats-scaffoldN50')).toHaveValue('200');
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.4.0');
  await expect(page.locator('#tb-schemaVersion')).toHaveValue('2.0');
  await page.fill('#tb-vitalStats-scaffoldL50', '-1');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-vitalStats-scaffoldL50')).toHaveAttribute('aria-invalid', 'true');
});

test('extension fields reach the YAML and the table but not the microdata item', async ({ page }) => {
  await fillValid(page);
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.6.0');
  await page.click('#tb-add-extension');
  await page.fill('#tb-extension-0-name', 'x-site-builder');
  await page.fill('#tb-extension-0-value', 'built on fhref.org');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-status')).toContainText('Structural validation passed');
  const { parse } = await import('yaml');
  const record = parse(await page.textContent('#tb-yaml-source'));
  expect(record['x-site-builder']).toBe('built on fhref.org');
  await expect(page.locator('#tb-table')).toContainText('Extension fields');
  await expect(page.locator('#tb-table')).toContainText('x-site-builder');
  const htmlSource = await page.textContent('#tb-html-source');
  expect(htmlSource).not.toContain('itemprop="x-site-builder"');
  expect(htmlSource).toContain('Extension fields are not carried by HTML microdata');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#tb-download-yaml')]);
  expect((await import('node:fs')).readFileSync(await download.path(), 'utf8')).toContain('x-site-builder: "built on fhref.org"');
  // A name the cited contract does not allow is reported against its own row.
  await page.fill('#tb-extension-0-name', 'X-site-builder');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
  await expect(page.locator('#tb-extension-0-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#tb-extension-0-name')).toHaveAccessibleDescription(/not an allowed property/);
  await page.locator('#tb-errors a[href="#tb-extension-0-name"]').click();
  await expect(page.locator('#tb-extension-0-name')).toBeFocused();
  // The older frozen release declares no extension fields at all.
  await page.fill('#tb-extension-0-name', 'x-site-builder');
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.4.0');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
  await expect(page.locator('#tb-errors')).toContainText('x-site-builder: is not an allowed property');
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.6.0');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();

  // A second row writing the same key, and a row renaming itself onto a standard
  // field, are both reported against the row that caused them.
  await page.click('#tb-add-extension');
  await page.fill('#tb-extension-1-name', 'x-site-builder');
  await page.fill('#tb-extension-1-value', 'second writer');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
  await expect(page.locator('#tb-errors')).toContainText('written by more than one extension row');
  await expect(page.locator('#tb-extension-1-name')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#tb-errors a[href="#tb-extension-1-name"]').click();
  await expect(page.locator('#tb-extension-1-name')).toBeFocused();
  await page.fill('#tb-extension-1-name', 'documentation');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-errors')).toContainText('extension fields never override one');
  await expect(page.locator('#tb-extension-1-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#tb-documentation')).not.toHaveAttribute('aria-invalid', 'true');
  await page.locator('#tb-row-extension-1 .tb-remove, #tb-extensions .tb-list__row:nth-child(2) .tb-remove').first().click();
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
});

test('Object.prototype names in an extension row get the not-allowed message', async ({ page }) => {
  await fillValid(page);
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.6.0');
  await page.click('#tb-add-extension');
  await page.fill('#tb-extension-0-value', 'value');
  for (const name of ['toString', '__proto__', 'constructor']) {
    await page.fill('#tb-extension-0-name', name);
    await page.click('#tb-generate');
    await expect(page.locator('#tb-download-yaml')).toBeDisabled();
    await expect(page.locator('#tb-extension-0-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#tb-extension-0-name')).toHaveAccessibleDescription(/not an allowed property/);
    await expect(page.locator('#tb-errors')).not.toContainText('more than one extension row');
  }
});

test('an unpinned real release is unsupported instead of falling back', async ({ page }) => {
  await fillValid(page);
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.4.1');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeDisabled();
  await expect(page.locator('#tb-errors')).toContainText('Unsupported schema target');
});

test('FHT stays disabled and FHGM is absent from the builder', async ({ page }) => {
  await page.goto('/table-builder/');
  await expect(page.locator('#tb-profile option[value="FHT"]')).toHaveCount(0);
  const fht = page.locator('#tb-profile option').filter({ hasText: 'FHT' });
  await expect(fht).toHaveCount(1);
  await expect(fht).toBeDisabled();
  await expect(page.locator('#tb-profile option')).toHaveCount(4);
  await expect(page.locator('#tb-profile')).not.toContainText('FHGM');
});

test('a 320px narrow layout keeps the extension rows and table inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await fillValid(page);
  await page.fill('#tb-schema', 'https://w3id.org/fair-bioheaders/fhr/v0.6.0');
  await page.click('#tb-add-extension');
  await page.fill('#tb-extension-0-name', 'x-site-builder');
  await page.fill('#tb-extension-0-value', 'a deliberately long extension value to stress the narrow layout');
  await page.click('#tb-generate');
  await expect(page.locator('#tb-download-yaml')).toBeEnabled();
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

for (const [kind, release, fixture] of [
  ['FHP', 'v0.4.0', 'rich-mixed-canonical.fhp.yaml'], ['FHGFF3', 'v0.4.0', 'rich.fhgff3.yaml'],
  ['FHP', 'v0.6.0', 'rich-database.fhp.json'], ['FHGFF3', 'v0.6.0', 'rich.fhgff3.yaml']
]) {
  test(`${kind} ${release} form preserves nested values, downloads, draft switching and local requests`, async ({ page, browserName }) => {
    // This test is deliberately thorough (recursive fill of a released record,
    // two themes, four downloads). In the 2026-11-19 matrix all four Firefox
    // runs exceeded the 30 s default and one Chromium desktop run flaked in the
    // same download stage; with the raised ceiling every engine completes with
    // margin (Chromium 6-10 s, Firefox 14-20 s, WebKit 2-3 s per case).
    test.setTimeout(180000);
    const { readFileSync } = await import('node:fs');
    const { parse } = await import('yaml');
    const directory = release === 'v0.4.0' ? 'family-v0.4.0' : 'family-v0.6.0';
    const text = readFileSync(new URL(`../fixtures/${directory}/${fixture}`, import.meta.url), 'utf8');
    const record = fixture.endsWith('.json') ? JSON.parse(text) : parse(text);
    record.schema = `https://w3id.org/fair-bioheaders/${kind.toLowerCase()}/${release}`;
    await page.emulateMedia({reducedMotion:'reduce'});
    const external=[];
    page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:4000/')) external.push(request.url());});
    await page.goto('/table-builder/');
    await page.waitForSelector('#tb-schema');
    await page.fill('#tb-genome','Retained genome draft');
    await page.selectOption('#tb-profile',kind);
    const slug=path=>path.replace(/[^A-Za-z0-9]+/g,'-');
    async function fill(value,path) {
      if(Array.isArray(value)) {
        for(let index=0;index<value.length;index++) {
          await page.click('#tb-add-'+slug(path));
          await fill(value[index],path+'.'+index);
        }
      } else if(value && typeof value==='object') {
        for(const [key,item] of Object.entries(value)) await fill(item,path ? path+'.'+key : key);
      } else {
        const control=page.locator('#tb-'+slug(path));
        if(path==='schemaVersion') {await expect(control).toHaveValue(String(value));return;}
        if(await control.evaluate(node=>node.tagName==='SELECT')) await control.selectOption(String(value));
        else await control.fill(String(value));
      }
    }
    await fill(record,'');
    await page.click('#tb-generate');
    await expect(page.locator('#tb-status')).toContainText('Structural validation passed');
    // Both-theme axe scans of the filled form run on engines where axe reads
    // colors reliably after a mid-session theme switch; WebKit's mid-session
    // scans return colors that contradict getComputedStyle (engine-helpers.mjs),
    // and WebKit still gets load-time light+dark axe scans of this page from
    // site.spec's PAGES list, where it is reliable.
    if (midSessionThemeAxeEngines.includes(browserName)) {
      const { default: AxeBuilder } = await import('@axe-core/playwright');
      for (const theme of ['light','dark']) {
        await page.evaluate(value=>document.documentElement.setAttribute('data-theme',value),theme);
        expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      }
    }
    // The theme switch itself stays functionally verified on every engine:
    // the site's own disclosure toggles attribute, pressed state and label
    // together.
    for (const theme of ['light', 'dark']) {
      const current = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      if (current !== theme) await page.click('#theme-toggle');
      expect(await page.evaluate(() => ({
        attr: document.documentElement.getAttribute('data-theme'),
        pressed: document.getElementById('theme-toggle').getAttribute('aria-pressed'),
        label: document.getElementById('theme-toggle').getAttribute('aria-label')
      })), theme).toEqual({ attr: theme, pressed: String(theme === 'dark'),
        label: theme === 'dark' ? 'Use light theme' : 'Use dark theme' });
    }
    const yaml=await page.textContent('#tb-yaml-source');
    expect(parse(yaml)).toEqual(record);
    const htmlSource=await page.textContent('#tb-html-source');
    if(kind==='FHP'){
      expect(htmlSource).toContain('<h2>Machine-readable FHP microdata</h2>');
      expect(htmlSource).toContain('itemscope itemtype="https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhp.json"');
      expect(htmlSource).not.toContain('fhr.json');
      expect(htmlSource).toContain('itemprop="schemaVersion" data-fhr-type="string"');
      if(record.isoformPolicy) expect(htmlSource).toContain('itemprop="isoformPolicy" data-fhr-type="string">'+record.isoformPolicy+'</span>');
    } else {
      expect(htmlSource).toContain('itemscope itemtype="https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhgff3.json"');
      expect(htmlSource).toContain('Experimental FHGFF3 HTML binding');
      expect(htmlSource).not.toContain('main/fhr.json');
    }
    const [download]=await Promise.all([page.waitForEvent('download'),page.click('#tb-download-yaml')]);
    expect(download.suggestedFilename()).toBe(kind.toLowerCase()+'-metadata.yaml');
    expect(readFileSync(await download.path(),'utf8')).toBe(yaml);
    const [htmlDownload]=await Promise.all([page.waitForEvent('download'),page.click('#tb-download-html')]);
    expect(htmlDownload.suggestedFilename()).toBe(kind.toLowerCase()+'-metadata.html');
    expect(readFileSync(await htmlDownload.path(),'utf8')).toBe(htmlSource);
    if(kind==='FHGFF3') {
      await page.selectOption('#tb-derivedFrom-0-headerType','FHP');
      await page.click('#tb-generate');
      await expect(page.locator('#tb-download-yaml')).toBeDisabled();
      await page.locator('#tb-errors a[href="#tb-derivedFrom-0-headerType"]').click();
      await expect(page.locator('#tb-derivedFrom-0-headerType')).toBeFocused();
      await page.selectOption('#tb-derivedFrom-0-headerType','FHR');
    }
    await page.selectOption('#tb-profile','FHR');
    await expect(page.locator('#tb-genome')).toHaveValue('Retained genome draft');
    await expect(page.locator('#tb-download-yaml')).toBeDisabled();
    await expect(page.locator('#tb-yaml-source')).toBeEmpty();
    await page.selectOption('#tb-profile',kind);
    await page.click('#tb-generate');
    expect(parse(await page.textContent('#tb-yaml-source'))).toEqual(record);
    await page.fill('#tb-schema',record.schema.replace(release,'v999.0.0'));
    await page.click('#tb-generate');
    await expect(page.locator('#tb-download-yaml')).toBeDisabled();
    expect(external).toEqual([]);
  });
}

for (const kind of ['FHP', 'FHGFF3']) {
  test(`selecting ${kind} while schemas load initializes the selected profile`, async ({ page }) => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route('**/assets/schema/*.json', async route => { await pending; await route.continue(); });
    await page.goto('/table-builder/');
    await page.selectOption('#tb-profile', kind);
    await expect(page.locator('#tb-form')).toBeEmpty();
    release();
    await expect(page.locator('#tb-schema')).toHaveValue(`https://w3id.org/fair-bioheaders/${kind.toLowerCase()}/v0.6.0`);
    await expect(page.locator(kind === 'FHP' ? '#tb-proteome' : '#tb-annotation')).toBeVisible();
    await expect(page.locator('#tb-genome')).toHaveCount(0);
    await page.click('#tb-generate');
    await expect(page.locator('#tb-yaml-source')).toContainText(`schema: "https://w3id.org/fair-bioheaders/${kind.toLowerCase()}/v0.6.0"`);
    await expect(page.locator('#tb-yaml-source')).toContainText(`schemaVersion: "${kind === 'FHP' ? '1.2' : '1.2'}"`);
    if (kind === 'FHP') {
      await expect(page.locator('#tb-html-source')).toContainText('itemtype="https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhp.json"');
    } else {
      await expect(page.locator('#tb-html-source')).toContainText('itemscope itemtype="https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhgff3.json"');
      await expect(page.locator('#tb-html-source')).toContainText('Experimental FHGFF3 HTML binding');
    }
  });
}

test('pruned blank parents keep errors, accessible descriptions and focus on the populated draft row', async ({ page }) => {
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-schema');
  await page.selectOption('#tb-profile', 'FHGFF3');
  await page.click('#tb-add-derivedFrom');
  await page.click('#tb-add-derivedFrom');
  await page.selectOption('#tb-derivedFrom-1-headerType', 'FHP');
  await page.selectOption('#tb-derivedFrom-1-relationship', 'annotates');
  await page.click('#tb-generate');
  const wrong = page.locator('#tb-derivedFrom-1-headerType');
  const blank = page.locator('#tb-derivedFrom-0-headerType');
  await expect(wrong).toHaveAttribute('aria-invalid', 'true');
  await expect(blank).not.toHaveAttribute('aria-invalid');
  await expect(wrong).toHaveAccessibleDescription(/must equal "FHR"/);
  await page.locator('#tb-errors a[href="#tb-derivedFrom-1-headerType"]').click();
  await expect(wrong).toBeFocused();
  await expect(page.locator('#tb-errors')).toContainText('derivedFrom.1.headerType');
  const { parse } = await import('yaml');
  const record = parse(await page.textContent('#tb-yaml-source'));
  expect(record.derivedFrom).toHaveLength(1);
  expect(record.derivedFrom[0].headerType).toBe('FHP');
  await page.selectOption('#tb-derivedFrom-1-headerType', 'FHR');
  await page.click('#tb-generate');
  await expect(wrong).not.toHaveAttribute('aria-invalid');
});

test('error paths map through blank entries in both outer and nested arrays', async ({ page }) => {
  // Exercise nested index translation with a supported URI constraint on this
  // test-only schema copy; the released command-line strings have no constraint.
  await page.route('**/assets/schema/fhp-v0.6.0.json', async route => {
    const response = await route.fetch();
    const schema = await response.json();
    schema.$defs.Software.properties.commandLineOption.items.format = 'uri';
    await route.fulfill({ response, json: schema });
  });
  await page.goto('/table-builder/');
  await page.waitForSelector('#tb-schema');
  await page.selectOption('#tb-profile', 'FHP');
  await page.click('#tb-add-predictionSoftware');
  await page.click('#tb-add-predictionSoftware');
  await page.click('#tb-add-predictionSoftware-1-commandLineOption');
  await page.click('#tb-add-predictionSoftware-1-commandLineOption');
  await page.fill('#tb-predictionSoftware-1-commandLineOption-1', 'bad uri');
  await page.click('#tb-generate');
  const invalid = page.locator('#tb-predictionSoftware-1-commandLineOption-1');
  await expect(invalid).toHaveAttribute('aria-invalid', 'true');
  await expect(invalid).toHaveAccessibleDescription(/must be a URI/);
  await expect(page.locator('#tb-predictionSoftware-1-commandLineOption-0')).not.toHaveAttribute('aria-invalid');
  await page.locator('#tb-errors a[href="#tb-predictionSoftware-1-commandLineOption-1"]').click();
  await expect(invalid).toBeFocused();
  // A missing property has no exact record path: use its enclosing object's
  // mapping, then let errorTarget fall back to the visible object fieldset.
  await page.locator('#tb-errors a[href="#tb-predictionSoftware-1-name"]').click();
  await expect(page.locator('#tb-predictionSoftware-1-name')).toBeFocused();
});
