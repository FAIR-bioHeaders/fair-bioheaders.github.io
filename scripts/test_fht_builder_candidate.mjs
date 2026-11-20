import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { parse } from 'yaml';
const require = createRequire(import.meta.url);
const candidate = require('../assets/js/fht-builder-candidate.js');
const builder = require('../assets/js/table-builder.js');
const read = p => readFileSync(new URL(p, import.meta.url));
const json = p => JSON.parse(read(p));
const schema = json('./fht-candidate/schema.json');
const opt = { candidate: true };
const names = readdirSync(new URL('./fht-candidate/examples/fht/', import.meta.url)).filter(n => n.endsWith('.json')).sort();
const records = names.map(name => ({ name, record: json('./fht-candidate/examples/fht/' + name) }));
const clone = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(value).digest('hex');

if (process.argv.includes('--exports')) {
  process.stdout.write(JSON.stringify(records.map(({name, record}) => ({ name, record, ...candidate.exportsFor(record, schema, opt) }))));
} else {
  test('candidate snapshot and all 93 counterparts retain exact source byte pins', () => {
    const provenance = json('./fht-candidate/provenance.json');
    assert.equal(sha(read('./fht-candidate/schema.json')), candidate.PROFILE.schemaSha256);
    assert.equal(candidate.ITEMTYPE, schema.$id);
    for (const name of names) assert.ok(read('./fht-candidate/examples/fht/' + name.replace('.json', '.html')).toString().includes('itemtype="' + candidate.ITEMTYPE + '"'));
    assert.equal(provenance.sourceCommit, '1a0792e6f8db1b73959999d30f5e6575b982cbfc');
    assert.equal(provenance.files.length, 116);
    for (const file of provenance.files) {
      const bytes = read('./fht-candidate/' + file.local);
      assert.equal(bytes.length, file.bytes, file.local); assert.equal(sha(bytes), file.sha256, file.local);
    }
    assert.equal(json('./fht-candidate/conformance/fht-v0.7.0/manifest.json').vectors.length, 93);
  });
  test('candidate is opt-in, never in the released registry or public form', () => {
    assert.throws(() => candidate.select(candidate.ITEMTYPE), /unpublished/);
    assert.throws(() => candidate.exportsFor(records[0].record, schema), /opt-in/);
    for (const alias of candidate.PROFILE.aliases) {
      assert.equal(builder.selectRelease(alias), null);
      assert.equal(candidate.select(alias, opt).status, 'candidate-unpublished');
    }
    for (const bad of ['https://w3id.org/fair-bioheaders/fht/v99.0.0',
      'https://raw.githubusercontent.com/FAIR-bioHeaders/FHT-Specification/main/fht.json',
      'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/v0.7.0/fht.json']) {
      assert.equal(candidate.select(bad, opt), null);
    }
    const page = read('../_pages/table-builder.md').toString();
    assert.match(page, /<option disabled>FHT/); assert.ok(!page.includes('fht-builder-candidate.js'));
  });
  test('form profile covers all and only 29 schema fields with schema requiredness', () => {
    const fields = candidate.formSections(schema, opt).flatMap(s => s.fields);
    assert.equal(new Set(fields.map(f => f.key)).size, fields.length);
    assert.deepEqual(fields.map(f => f.key).sort(), Object.keys(schema.properties).sort());
    assert.deepEqual(fields.filter(f => f.required).map(f => f.key).sort(), schema.required.slice().sort());
  });
  for (const { name, record } of records) test(`seven-pair candidate ${name}: validate and inert typed export`, () => {
    assert.deepEqual(candidate.validate(record, schema, opt), []);
    const out = candidate.exportsFor(record, schema, opt);
    assert.deepEqual(parse(out.yaml), record);
    assert.ok(out.html.includes('itemtype="' + candidate.ITEMTYPE + '"'));
    assert.ok(!out.html.includes('main/fhr.json'));
    assert.ok(out.html.includes('Unpublished FHT candidate'));
    assert.ok(!/<script|<a\s|<img|href=|src=/i.test(out.html));
  });
  test('complete BUSCO arithmetic: equality, both bad sums, partial and safe exact sums', () => {
    const record = clone(records.find(r => r.record.completeness).record);
    assert.deepEqual(candidate.completenessIssues(record), []);
    record.completeness.total += 1; assert.equal(candidate.completenessIssues(record).length, 1);
    record.completeness.total -= 2; assert.equal(candidate.completenessIssues(record).length, 1);
    delete record.completeness.missing; assert.deepEqual(candidate.completenessIssues(record), []);
    record.completeness = { completeSingle: Number.MAX_SAFE_INTEGER, completeDuplicated: 1, fragmented: 0, missing: 0, total: Number.MAX_SAFE_INTEGER };
    assert.equal(candidate.completenessIssues(record).length, 1, 'BigInt sum must not round away the mismatch');
  });
  test('unique parents/minItems and canonical standard checksums are runtime checked', () => {
    const record = clone(records[0].record);
    record.metadataAuthor = []; assert.ok(candidate.validate(record, schema, opt).length);
    record.metadataAuthor = [{ name: 'Synthetic author' }];
    const parent = { headerType: 'FHR', relationship: 'transcribedFrom', checksum: 'A'.repeat(43) + '=' };
    record.derivedFrom = [parent, { checksum: parent.checksum, relationship: parent.relationship, headerType: parent.headerType }];
    assert.ok(candidate.validate(record, schema, opt).some(e => e.message.includes('unique')));
    record.derivedFrom = [{...parent, checksum: 'A'.repeat(42) + 'B='}];
    assert.ok(candidate.validate(record, schema, opt).some(e => e.message.includes('canonical')));
  });
  test('unsafe numbers are capability limits, extensions/zero/false/hostile text survive', () => {
    const record = clone(records[0].record);
    record.documentation = '</script><img src=x onerror=alert(1)> & "quote" \u202e\u200b';
    record['x-candidate'] = { enabled: false, count: 0, checksum: 'arbitrary extension' };
    record.identifier = [];
    const out = candidate.exportsFor(record, schema, opt);
    assert.deepEqual(parse(out.yaml), record); assert.ok(!out.microdata.includes('x-candidate'));
    assert.ok(out.html.includes('M5')); assert.ok(out.html.includes('&lt;/script&gt;'));
    record.vitalStats = { totalTranscripts: 9007199254740992 };
    assert.ok(candidate.validate(record, schema, opt).some(e => e.kind === 'unsupported-value'));
    assert.throws(() => candidate.exportsFor(record, schema, opt), /cannot preserve/);
    assert.throws(() => candidate.jsonld(), /unsupported/);
  });
  test('positive carrier subset is a metadata-only comparison, not file/gzip verification', () => {
    const manifest = json('./fht-candidate/conformance/fht-v0.7.0/manifest.json'); let compared = 0;
    for (const entry of manifest.vectors.filter(v => v.expected === 'valid')) {
      let data = read('./fht-candidate/conformance/fht-v0.7.0/' + entry.file);
      if (entry.compressed) data = gunzipSync(data);
      const text = data.toString('utf8').split(/\r\n|\n|\r/).filter(line => line.startsWith(';~')).map(line => line.slice(2)).join('\n');
      const record = parse(text);
      const errors = candidate.validate(record, schema, opt);
      assert.deepEqual(errors, [], entry.id); compared++;
    }
    assert.equal(compared, 34);
  });
}
