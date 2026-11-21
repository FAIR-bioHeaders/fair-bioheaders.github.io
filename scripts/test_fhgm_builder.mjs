import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
const require = createRequire(import.meta.url);
const model = require('../assets/js/fhgm-builder.js');
const header = require('../assets/js/table-builder.js');
const bytes = readFileSync(new URL('../assets/schema/fhgm-0.1.json', import.meta.url));
const schema = JSON.parse(bytes);
const minimum = () => ({ modelId: 'example:gene-1', modelVersion: 'v1', featureId: 'gene-1', reference: { genomeReference: { accession: 'EXAMPLE_1', seqcol_id: 'A'.repeat(32) } } });
test('pins the actual native contract without adding a header selection', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), model.PIN.sha256);
  assert.equal(schema.$id, model.PIN.id);
  assert.equal(bytes.length, 12039);
  assert.equal(header.RELEASES.FHGM, undefined);
});
test('validates complete required record structure and every optional structure', () => {
  const record = { ...minimum(), contributors: [{ name: 'Example contributor', role: 'annotation', nameType: 'Personal', uri: 'https://orcid.org/0000-0002-1825-0097' }], evidence: [{ description: 'Synthetic evidence only', uri: 'https://example.org/evidence' }], methods: { software: [{ name: 'example', version: '1', uri: 'https://example.org/tool' }], protocol: 'https://example.org/protocol', limitations: ['Synthetic test'] }, publication: { article: '10.1234/example', deposit: ['example:deposit'] }, reuseConditions: 'Example terms', predecessor: { annotationChecksum: 'A'.repeat(43) + '=', modelId: 'example:gene-1', modelVersion: 'v0' } };
  assert.deepEqual(model.validate(record, schema), []);
  const out = model.outputs(record, schema);
  assert.deepEqual(JSON.parse(out.json), record);
  assert.deepEqual(parse(out.yaml), record);
  assert.deepEqual(parse(out.snippet), { 'x-fhgm-models': [record] });
  for (const row of model.rows(record)) assert.ok(out.html.includes(header.escapeHtml(row.value)));
  assert.doesNotMatch(out.html, /itemprop|itemscope|application\/ld\+json/);
});
for (const key of schema.required) test('refuses missing ' + key, () => {
  const record = minimum(); delete record[key]; assert.ok(model.validate(record, schema).length);
});
for (const value of ['\u0085bad', '\u001cbad', 'bad\u00a0', 'bad\u200b', 'bad\ufeff', 'bad\n']) test('rejects invisible/edge whitespace ' + JSON.stringify(value), () => {
  assert.ok(model.validate({ ...minimum(), modelId: value }, schema).length);
});
test('preserves opaque versions, Unicode and escaped source values', () => {
  const record = { ...minimum(), modelId: '<script>alert("x")</script>', modelVersion: 'β=opaque', reuseConditions: 'a\'b < & " </td>' };
  assert.deepEqual(model.validate(record, schema), []);
  const out = model.outputs(record, schema); assert.ok(!out.html.includes('<script>')); assert.deepEqual(parse(out.yaml), record);
});
for (const key of ['methods', 'publication']) test('rejects empty populated ' + key, () => {
  assert.ok(model.validate({ ...minimum(), [key]: {} }, schema).length);
});
test('does not mistake carrier/predecessor semantics for a structural check', () => {
  const record = { ...minimum(), predecessor: { modelId: 'different', modelVersion: 'v1', annotationChecksum: 'A'.repeat(43) + '=' } };
  assert.deepEqual(model.validate(record, schema), []); // K6 needs prior file evidence, absent here.
  assert.match(model.outputs(record, schema).html, /have not run/);
});
test('refuses missing reference alternative, extra header keys and unsafe links', () => {
  for (const change of [{ reference: {} }, { schema: 'https://example.org' }, { schemaVersion: '0.1' }, { methods: { protocol: 'javascript:alert(1)' } }, { contributors: [{ name: 'x', role: 'y', uri: 'http://example.org' }] }]) {
    assert.ok(model.validate({ ...minimum(), ...change }, schema).length);
  }
});
test('refuses oversized records before rendering or serialization', () => {
  const record = { ...minimum(), reuseConditions: 'x'.repeat(1048576) };
  assert.match(model.validate(record, schema)[0].message, /1 MiB/); assert.throws(() => model.outputs(record, schema));
});

test('native text errors explain the actual constraint without inventing parent checks', () => {
  const errors = model.validate({ ...minimum(), modelId: 'model\u200b' }, schema);
  assert.ok(errors.some(e => e.message.includes('invisible formatting')));
  assert.ok(errors.every(e => !e.message.includes('parent relationship')));
});
