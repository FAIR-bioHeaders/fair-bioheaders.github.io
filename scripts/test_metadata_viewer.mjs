import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const viewer=require('../assets/js/metadata-viewer.js');
for(const [name,type] of [['minimal-fhr','FHR'],['minimal-fhp','FHP'],['rich-fhp','FHP'],['minimal-fhgff3','FHGFF3'],['rich-fhgff3','FHGFF3'],
 ['release-v0.6.0-fhr','FHR'],['release-v0.6.0-fhp','FHP'],['release-v0.6.0-fhgff3','FHGFF3']]) {
 test(`${name} identity is recognized without claiming validation`,()=>{
  const text=readFileSync(new URL(`../assets/examples/viewer/${name}.json`,import.meta.url),'utf8');
  const result=viewer.inspect(text);assert.equal(result.type,type);assert.equal(result.known,true);
  assert.deepEqual(result.record,JSON.parse(text));
  assert.ok(!Object.hasOwn(result,'valid'));assert.ok(!Object.hasOwn(result,'verified'));
 });
}
test('the bundled v0.6.0 examples are the released fixture bytes unchanged',()=>{
 for(const [example,fixture] of [['release-v0.6.0-fhr','example.fhr.json'],
   ['release-v0.6.0-fhp','rich-database.fhp.json'],['release-v0.6.0-fhgff3','minimal-reference.fhgff3.json']]) {
  assert.deepEqual(readFileSync(new URL(`../assets/examples/viewer/${example}.json`,import.meta.url)),
   readFileSync(new URL(`./fixtures/family-v0.6.0/${fixture}`,import.meta.url)),example);
 }
});
test('the recognized-release table is the pinned shared registry, not an opinion',()=>{
 // The two pinned registries carry the declared schemaVersion per type per release;
 // v0.4.0 rows are tied to the builder's frozen-release table, which its own test
 // checks against the release bytes.
 for(const [file,digest] of [['versions-v0.6.0.json','7535e3569ce4157b22f14b9cd89dc98612b4e90cf553ef0a3250f5811529ce62'],
   ['versions-v0.5.0.json','a570c2a5b742e02ecfec5ebc548775092e4ebc51bd272fef164d26b11efc9e61']])
  assert.equal(createHash('sha256').update(readFileSync(new URL(`./schema-snapshots/${file}`,import.meta.url))).digest('hex'),digest,file);
 const registry60=JSON.parse(readFileSync(new URL('./schema-snapshots/versions-v0.6.0.json',import.meta.url),'utf8'));
 const registry50=JSON.parse(readFileSync(new URL('./schema-snapshots/versions-v0.5.0.json',import.meta.url),'utf8'));
 assert.deepEqual(viewer.KNOWN_RELEASES['v0.6.0'],registry60.releases['v0.6.0']);
 assert.deepEqual(viewer.KNOWN_RELEASES['v0.5.0'],registry50.releases['v0.5.0']);
 const builder=require('../assets/js/table-builder.js');
 for(const kind of ['FHR','FHP','FHGFF3']){
  const declared=builder.RELEASES[kind].find((entry)=>entry.release==='v0.4.0').declares;
  assert.equal(viewer.KNOWN_RELEASES['v0.4.0'][kind],declared,kind);
 }
});
test('recognition is per (release, type, version) and never borrows a neighbor',()=>{
 const known=(schema,schemaVersion)=>viewer.inspect(JSON.stringify({schema,schemaVersion})).known;
 assert.ok(known('https://w3id.org/fair-bioheaders/fhr/v0.5.0','2.1'));
 assert.ok(known('https://w3id.org/fair-bioheaders/fhp/v0.5.0','1.1'));
 assert.ok(known('https://w3id.org/fair-bioheaders/fhgff3/v0.6.0','1.2'));
 // A release that does not publish the stated version stays unrecognized.
 assert.ok(!known('https://w3id.org/fair-bioheaders/fhp/v0.5.0','1.2'));
 assert.ok(!known('https://w3id.org/fair-bioheaders/fhr/v0.6.0','2.0'));
 assert.ok(!known('https://w3id.org/fair-bioheaders/fhgff3/v0.5.0',1));
 // Unreleased and unpinned identities stay unrecognized.
 assert.ok(!known('https://w3id.org/fair-bioheaders/fht/v0.7.0','1.0'));
 assert.ok(!known('https://w3id.org/fair-bioheaders/fhr/v0.4.2','2.0'));
 assert.ok(known('https://w3id.org/fair-bioheaders/fhr/v0.6.0/','2.1'),'a trailing slash is the same cited alias');
});
test('no identity, unsupported versions, and wrong types remain distinct',()=>{
 assert.equal(viewer.inspect('').record,null);assert.equal(viewer.inspect('{}').record,null);
 assert.throws(()=>viewer.inspect('[]'),/one JSON/);assert.throws(()=>viewer.inspect('null'),/one JSON/);
 assert.throws(()=>viewer.inspect(';~schema: x\n>seq\nACGT'),/not valid JSON/);
 for(const record of [{schema:'https://w3id.org/fair-bioheaders/fhp/v999.0.0',schemaVersion:'1.0'}, {schema:'javascript:alert(1)'}, {schema:'https://w3id.org/fair-bioheaders/fhr/v0.4.0',schemaVersion:2}]) assert.equal(viewer.inspect(JSON.stringify(record)).known,false);
});
test('raw-tag identities are fixed and raw-main never substitutes a release',()=>{
 const record={schema:'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/v0.4.0/fhp.json',schemaVersion:'1.0'};
 assert.equal(viewer.inspect(JSON.stringify(record)).known,true);
 record.schema=record.schema.replace('v0.4.0','main');assert.equal(viewer.inspect(JSON.stringify(record)).known,false);
});
test('file size, UTF-8 bytes, nesting and total values are bounded',()=>{
 assert.throws(()=>viewer.inspect(' '.repeat(viewer.MAX_BYTES+1)),/256 KiB/);
 assert.throws(()=>viewer.inspect(JSON.stringify({text:'Ω'.repeat(viewer.MAX_BYTES/2)})),/256 KiB/);
 let record={};for(let i=0;i<14;i++)record={nested:record};assert.throws(()=>viewer.inspect(JSON.stringify(record)),/complex/);
 assert.throws(()=>viewer.inspect(JSON.stringify({values:Array(3000).fill(0)})),/complex/);
});
test('field paths preserve scope, array order, scalar values, and empty containers',()=>{
 const record={schema:'x',a:[0,false,null,'Ω <script>'],empty:[],object:{},'a/b':{'~':1}};
 const rows=viewer.rows(record);
 assert.deepEqual(rows.filter(r=>r.path.startsWith('/a/')).map(r=>r.value),['0','false','null','Ω <script>']);
 assert.ok(rows.some(r=>r.path==='/a~1b/~0'&&r.value==='1'));
 assert.ok(rows.some(r=>r.path==='/empty'&&r.value==='[]'));
 assert.ok(rows.some(r=>r.path==='/object'&&r.value==='{}'));
});

test('non-finite and unsafe integer values are rejected rather than silently changed',()=>{
 assert.throws(()=>viewer.inspect('{"schema":"x","count":9007199254740993}'),/safely/);
 assert.throws(()=>viewer.inspect('{"schema":"x","count":1e400}'),/safely/);
});

test('positive and negative underflow tokens are rejected while zero and strings survive',()=>{
 for(const token of ['1e-400','-1e-400','1e-324','-1e-324','0.'+'0'.repeat(330)+'1']) {
  assert.throws(()=>viewer.inspect('{"schema":"x","gcContent":'+token+'}'),/safely/,token);
 }
 for(const token of ['0','-0','0e-400','-0e-400','5e-324','-5e-324','0.42']) {
  assert.equal(viewer.inspect('{"schema":"x","gcContent":'+token+'}').record.gcContent,JSON.parse(token));
 }
 const text='{"schema":"x","1e-400":"-1e-400","quoted":"escaped \\"1e-400\\""}';
 assert.deepEqual(viewer.inspect(text).record,JSON.parse(text));
});

test('long shared ancestor keys cannot multiply into unbounded JSON Pointer output',()=>{
 const record={schema:'x', ['a'.repeat(240000)]:Array(2995).fill(0)};
 const text=JSON.stringify(record);assert.ok(Buffer.byteLength(text)<viewer.MAX_BYTES);
 assert.throws(()=>viewer.inspect(text),/Expanded metadata/);
 assert.throws(()=>viewer.rows(record),/Expanded metadata/);
 const escaped={schema:'x',['/~'.repeat(60000)]:[0,1,2]};
 assert.throws(()=>viewer.inspect(JSON.stringify(escaped)),/Expanded metadata/);
 assert.deepEqual(viewer.rows({a:'x'.repeat(viewer.MAX_OUTPUT_CHARS-2)}).map(r=>r.path),['/a']);
 assert.throws(()=>viewer.rows({a:'x'.repeat(viewer.MAX_OUTPUT_CHARS-1)}),/Expanded metadata/);
});

test('embedding input requires JSON text rather than coerced objects',()=>{
 assert.throws(()=>viewer.inspect({schema:'x'}),/Supply JSON text/);
});
