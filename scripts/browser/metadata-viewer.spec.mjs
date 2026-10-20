import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const upload=async(page,record,name='metadata.json')=>page.locator('#mv-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof record==='string'?record:JSON.stringify(record))});
const record={schema:'https://w3id.org/fair-bioheaders/fhr/v0.4.0',schemaVersion:'2.0',genome:'Synthetic local record',metadataAuthor:[{name:'Ω author'}],vitalStats:{N50:0},documentation:'<img src="https://evil.example/track" onerror="alert(1)">',relatedLink:['javascript:alert(1)']};
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/metadata-viewer/');await expect(page.locator('#mv-file')).toBeEnabled();});
test('local JSON is displayed as text without requests, links or verification claims',async({page})=>{
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await upload(page,record);
 const display=page.locator('fair-bioheaders-metadata');
 await expect(display).toContainText('Ω author');await expect(display).toContainText('/vitalStats/N50');
 await expect(display).toContainText('javascript:alert(1)');await expect(display.locator('img,a,script')).toHaveCount(0);
 await expect(display).toContainText('Schema validation: not checked');await expect(display).toContainText('File checksum: not verified');await expect(display).toContainText('Parent files: not verified');
 expect(requests).toEqual([]);
 await display.locator('summary').click();expect(JSON.parse(await display.locator('pre').textContent())).toEqual(record);
 await page.click('#mv-clear');await expect(display).toBeEmpty();await expect(page.locator('#mv-file')).toHaveValue('');
});
test('all bundled records and error examples have distinct states',async({page})=>{
 const select=page.locator('#mv-example');const options=await select.locator('option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,text:n.textContent})));
 for(const option of options) {
  await select.selectOption(option.value);await page.click('#mv-example-load');
  if(option.text==='Malformed JSON') await expect(page.locator('#mv-status')).toContainText('not valid JSON');
  else if(option.text==='JSON without a header identity') await expect(page.locator('#mv-status')).toContainText('no FAIR BioHeaders schema identity');
  else {
   await expect(page.locator('#mv-status')).toContainText('JSON metadata parsed');
   await expect(page.locator('fair-bioheaders-metadata')).toContainText(option.text==='Unsupported schema version'?'Unsupported or unrecognized':'Recognized schema/version identity');
  }
 }
});
test('invalid, oversized, missing-identity and unsupported input clear stale results',async({page})=>{
 await upload(page,record);await expect(page.locator('fair-bioheaders-metadata')).not.toBeEmpty();
 await upload(page,'{bad');await expect(page.locator('#mv-status')).toContainText('not valid JSON');await expect(page.locator('fair-bioheaders-metadata')).toBeEmpty();
 await upload(page,'x'.repeat(262145));await expect(page.locator('#mv-status')).toContainText('256 KiB');
 await upload(page,{});await expect(page.locator('#mv-status')).toContainText('no FAIR BioHeaders schema identity');
 await upload(page,{schema:'https://w3id.org/fair-bioheaders/fhr/v999.0.0',schemaVersion:'2.0'});await expect(page.locator('fair-bioheaders-metadata')).toContainText('Unsupported or unrecognized');
});
test('clearing while a local read is pending prevents it from repopulating the display',async({page})=>{
 await page.evaluate(()=>{const original=File.prototype.text;File.prototype.text=async function(){const text=await original.call(this);await new Promise(resolve=>window.finishLocalRead=resolve);return text;};});
 await upload(page,record);await page.waitForFunction(()=>typeof window.finishLocalRead==='function');
 await page.click('#mv-clear');await page.evaluate(()=>window.finishLocalRead());
 await expect(page.locator('#mv-status')).toContainText('Metadata cleared');await expect(page.locator('fair-bioheaders-metadata')).toBeEmpty();
});
test('example fetch failure is actionable and never keeps a previous record visible',async({page})=>{
 await upload(page,record);await page.route('**/assets/examples/viewer/*.json',route=>route.abort());
 await page.click('#mv-example-load');await expect(page.locator('#mv-status')).toContainText('could not be loaded');await expect(page.locator('fair-bioheaders-metadata')).toBeEmpty();
});
for(const theme of ['light','dark']) test(`populated viewer is accessible and contained in ${theme}`,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.reload();await upload(page,record);
 await page.locator('fair-bioheaders-metadata summary').click();
 await page.evaluate(()=>document.fonts.ready);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(1);
 await page.locator('.mv-table').focus();await expect(page.locator('.mv-table')).toBeFocused();
});
test('without JavaScript the controls are disabled and alternatives remain available',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(baseURL+'/metadata-viewer/');
 await expect(page.locator('noscript strong')).toBeVisible();await expect(page.locator('noscript strong')).toContainText('JavaScript is required');await expect(page.locator('#mv-file')).toBeDisabled();await expect(page.locator('noscript a')).toHaveAttribute('href',/v0.4.0\/examples/);await context.close();
});

test('navigation links clear the overflow button after local fonts load',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.reload();
 await page.evaluate(()=>document.fonts.ready);
 await expect.poll(async()=>page.evaluate(()=>{
  const button=document.querySelector('#site-nav .nav-toggle');
  if(button.classList.contains('hidden')) return true;
  const edge=button.getBoundingClientRect().left;
  return [...document.querySelectorAll('#site-nav .visible-links li')].every(node=>node.getBoundingClientRect().right<=edge);
 })).toBe(true);
});

test('numeric underflow errors clear the previous display instead of showing zero',async({page})=>{
 for(const token of ['1e-400','-1e-400']) {
  await upload(page,record);
  await upload(page,'{"schema":"https://w3id.org/fair-bioheaders/fhr/v0.4.0","gcContent":'+token+'}');
  await expect(page.locator('#mv-status')).toContainText('cannot be represented safely');
  await expect(page.locator('fair-bioheaders-metadata')).toBeEmpty();
 }
});

test('expanded pointer limits reject a small input without freezing or keeping stale values',async({page})=>{
 await upload(page,record);
 await upload(page,{schema:'x',['a'.repeat(240000)]:Array(2995).fill(0)});
 await expect(page.locator('#mv-status')).toContainText('Expanded metadata is too large');
 await expect(page.locator('fair-bioheaders-metadata')).toBeEmpty();
 await page.click('#mv-clear');await expect(page.locator('#mv-status')).toContainText('Metadata cleared');
 await upload(page,record);await expect(page.locator('fair-bioheaders-metadata')).toContainText('Synthetic local record');
});
