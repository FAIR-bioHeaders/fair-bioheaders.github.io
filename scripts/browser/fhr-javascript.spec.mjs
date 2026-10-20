import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/metadata-viewer/');await expect(page.locator('#fhr-run-json')).toBeEnabled();});
test('paired microdata and JSON run, query, edit and restore without network access',async({page})=>{
 const original=JSON.parse(await page.locator('#fhr-json-input').inputValue());
 expect(original.schemaVersion).toBe('2.0');expect(original.vitalStats.N50).toBe(0);
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.click('#fhr-run-json');
 await expect(page.locator('#fhr-query-output')).toContainText('Synthetic metadata author');
 await expect(page.locator('#fhr-query-output')).toContainText('"N50": 0');
 await expect(page.locator('#fhr-playground-display')).toContainText('Schema validation: not checked');
 await page.click('#fhr-edit-json');
 const changed=JSON.parse(await page.locator('#fhr-json-input').inputValue());
 expect(changed).toEqual({...original,genome:'My JavaScript example'});
 await page.click('#fhr-read-microdata');
 expect(JSON.parse(await page.locator('#fhr-json-input').inputValue())).toEqual(original);
 expect(requests).toEqual([]);
});
test('edited JSON clears stale output and renders hostile strings as text',async({page})=>{
 await page.click('#fhr-run-json');
 const record=JSON.parse(await page.locator('#fhr-json-input').inputValue());
 record.genome='<img src="https://evil.example/track" onerror="alert(1)">';
 await page.locator('#fhr-json-input').fill(JSON.stringify(record));
 await expect(page.locator('#fhr-playground-display')).toBeEmpty();
 await page.click('#fhr-run-json');
 await expect(page.locator('#fhr-playground-display')).toContainText(record.genome);
 await expect(page.locator('#fhr-playground-display img')).toHaveCount(0);
 await page.locator('#fhr-json-input').fill('{bad');await page.click('#fhr-run-json');
 await expect(page.locator('#fhr-playground-display')).toBeEmpty();
 await expect(page.locator('#fhr-playground-status')).toContainText('not valid JSON');
 await page.locator('#fhr-json-input').fill('{"schema":"x","count":1e-400}');await page.click('#fhr-run-json');
 await expect(page.locator('#fhr-playground-status')).toContainText('safely');
});
test('teaching helper preserves nested types/order and rejects ambiguous properties',async({page})=>{
 const result=await page.evaluate(()=>{
  const root=document.querySelector('#fhr-microdata-template').content.firstElementChild.cloneNode(true);
  const author=root.querySelector('[itemprop="metadataAuthor"]');
  const second=author.firstElementChild.cloneNode(true);second.firstElementChild.textContent='Second Ω author';author.append(second);
  const record=FhrExamples.readMicrodata(root);
  const errors=[];
  root.append(root.querySelector('[itemprop="genome"]').cloneNode(true));
  try{FhrExamples.readMicrodata(root);}catch(e){errors.push(e.message);}
  root.lastElementChild.remove();
  root.querySelector('[itemprop="N50"]').textContent='1e-400';
  try{FhrExamples.readMicrodata(root);}catch(e){errors.push(e.message);}
  return {record,errors};
 });
 expect(result.record.metadataAuthor.map(a=>a.name)).toEqual(['Synthetic metadata author','Second Ω author']);
 expect(result.record.taxon.name).toBe('Homo sapiens');expect(result.record.vitalStats.N50).toBe(0);
 expect(result.errors[0]).toContain('Repeated');expect(result.errors[1]).toContain('Unsafe');
});
for(const theme of ['light','dark'])test(`runnable FHR lessons are accessible in ${theme}`,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.reload();await page.click('#fhr-read-microdata');
 await page.evaluate(()=>document.fonts.ready);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.locator('#fhr-json-input').focus();await expect(page.locator('#fhr-json-input')).toBeFocused();
});
test('copied microdata example works on an ordinary host page with the teaching helper',async({page,baseURL})=>{
 const markup=await page.locator('#fhr-microdata-code code').textContent();
 const expected=JSON.parse(await page.locator('#fhr-json-input').inputValue());
 await page.route('**/fhr-example-host.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FHR example host</title></head><body>'+markup+'<script src="/assets/js/fhr-javascript-example.js"></script></body></html>'}));
 await page.goto(baseURL+'/fhr-example-host.html');
 const extracted=await page.evaluate(()=>FhrExamples.readMicrodata(document.querySelector('#fhr-example')));
 expect(extracted).toEqual(expected);
 await expect(page.locator('#site-nav')).toHaveCount(0);
});
