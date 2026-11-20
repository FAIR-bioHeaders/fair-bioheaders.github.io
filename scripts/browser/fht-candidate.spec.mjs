import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
const folder = new URL('../fht-candidate/examples/fht/', import.meta.url);
const records = readdirSync(folder).filter(n => n.endsWith('.json')).map(n => JSON.parse(readFileSync(new URL(n, folder))));
const schema = JSON.parse(readFileSync(new URL('../fht-candidate/schema.json', import.meta.url)));

test('released FHT exports round-trip through a real DOM', async ({ page }) => {
  await page.goto('/table-builder/');
  await expect(page.locator('#tb-profile option').filter({ hasText: 'FHT' })).toBeEnabled();
  expect(await page.locator('script[src*="fht-builder-candidate"]').count()).toBe(0);
  await page.addScriptTag({ url: '/assets/js/fht-builder-candidate.js' });
  const rebuilt = await page.evaluate(({ records, schema }) => records.map(record => {
    if (window.FHTBuilderCandidate.ITEMTYPE !== schema.$id) throw new Error('candidate itemtype differs from reviewed schema identity');
    const out = window.FHTBuilderCandidate.exportsFor(record, schema, { candidate: true });
    const doc = new DOMParser().parseFromString(out.html, 'text/html');
    const scope = [...doc.querySelectorAll('[itemscope][itemtype]')];
    if (scope.length !== 1 || scope[0].getAttribute('itemtype') !== window.FHTBuilderCandidate.ITEMTYPE) throw new Error('wrong scope');
    if (doc.querySelector('script,a,img,iframe,form,link,[href],[src],[itemref]')) throw new Error('active markup');
    const styles = doc.querySelectorAll('style');
    if (styles.length !== 1 || styles[0].textContent !== window.FHTBuilderCandidate.STATIC_STYLE) throw new Error('uncontrolled style');
    function value(node) {
      const kind = node.getAttribute('data-fhr-type');
      if (kind === 'array') return [...node.children].map(value);
      if (kind === 'object') return Object.fromEntries([...node.children].map(n => [n.getAttribute('itemprop'), value(n)]));
      if (kind === 'string') return node.textContent;
      if (kind === 'integer' || kind === 'number') return Number(node.textContent);
      if (kind === 'boolean') return node.textContent === 'true';
      if (kind === 'null') return null;
      throw new Error('untyped value');
    }
    return { status: out.status, record: Object.fromEntries([...scope[0].children].map(n => [n.getAttribute('itemprop'), value(n)])) };
  }), { records, schema });
  expect(rebuilt).toEqual(records.map(record => ({ status: 'published-v0.7.0', record: Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith('x-'))) })));
  await expect(page.locator('#tb-profile option').filter({ hasText: 'FHT' })).toBeEnabled();
});
