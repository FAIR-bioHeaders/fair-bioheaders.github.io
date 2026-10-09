// Unit tests for the pure functions in the FHR table builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';

const require = createRequire(import.meta.url);
const tb = require('../assets/js/table-builder.js');
const schema = JSON.parse(
  readFileSync(new URL('../assets/schema/fhr.json', import.meta.url), 'utf8')
);

// The synthetic fixture mirrors the specification's example metadata.
function exampleRecord() {
  return {
    schema: tb.SCHEMA_URL,
    schemaVersion: 1.0,
    genome: 'Synthetic human reference example',
    genomeSynonym: ['synthetic example'],
    taxon: { name: 'Homo sapiens', uri: 'https://identifiers.org/taxonomy:9606' },
    version: '0.0.1',
    metadataAuthor: [{ name: 'Adam Wright', uri: 'https://orcid.org/0000-0002-5719-4024' }],
    assemblyAuthor: [{ name: 'David Molik', uri: 'https://orcid.org/0000-0003-3192-6538' }],
    dateCreated: '2022-03-21',
    accessionID: { name: 'PBARC', url: 'https://example.org/pbarc' },
    instrument: ['Example sequencer'],
    scholarlyArticle: '10.1093/bib/bbae122',
    masking: 'soft-masked',
    checksum: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    assemblySoftware: [
      { name: 'hifiasm', version: '0.19.8', uri: 'https://github.com/chhylp123/hifiasm', commandLineOption: ['-t', '2'] }
    ],
    vitalStats: { N50: 16, L50: 1, gcContent: 37.5, readTechnology: 'HiFi' }
  };
}

test('the bundled schema is the authoritative raw-main schema', () => {
  assert.equal(schema.$id, tb.SCHEMA_URL);
  assert.equal(schema.type, 'object');
  assert.ok(schema.required.includes('checksum'));
  assert.equal(schema.additionalProperties, false);
});

test('a valid fixture passes schema validation', () => {
  assert.deepEqual(tb.validateRecord(exampleRecord(), schema), []);
});

test('missing required fields are reported with paths', () => {
  const record = exampleRecord();
  delete record.checksum;
  delete record.taxon;
  const errors = tb.validateRecord(record, schema);
  assert.ok(errors.some((e) => e.path.join('.') === 'checksum'));
  assert.ok(errors.some((e) => e.path.join('.') === 'taxon'));
});

test('taxon subfields remain optional within the required object', () => {
  const record = exampleRecord();
  record.taxon = { name: 'Homo sapiens' };
  assert.deepEqual(tb.validateRecord(record, schema), []);
});

test('type, pattern and format violations are reported', () => {
  const record = exampleRecord();
  record.schemaVersion = 'one';
  record.scholarlyArticle = 'not-a-doi';
  record.checksum = 'short';
  record.vitalStats.gcContent = 150;
  record.taxon.uri = 'not a uri';
  record.assemblyProtocol = 'https://bad host';
  const paths = tb.validateRecord(record, schema).map((e) => e.path.join('.'));
  assert.ok(paths.includes('schemaVersion'));
  assert.ok(paths.includes('scholarlyArticle'));
  assert.ok(paths.includes('checksum'));
  assert.ok(paths.includes('vitalStats.gcContent'));
  assert.ok(paths.includes('taxon.uri'));
  assert.ok(paths.includes('assemblyProtocol'));
});

test('unknown properties are rejected', () => {
  const record = exampleRecord();
  record.notAField = 'x';
  assert.ok(tb.validateRecord(record, schema).some((e) => e.path.join('.') === 'notAField'));
});

test('masking enum is enforced', () => {
  const record = exampleRecord();
  record.masking = 'maybe-masked';
  assert.ok(tb.validateRecord(record, schema).some((e) => e.path.join('.') === 'masking'));
});

test('YAML output round-trips through an actual parser without changing types', () => {
  const record = exampleRecord();
  const yaml = tb.toYaml(record, schema);
  assert.deepEqual(parse(yaml), record);
  assert.match(yaml, /^schemaVersion: 1\.0$/m);
});

test('YAML preserves ambiguous strings and control characters', () => {
  for (const value of ['true', '1.0', '- draft', '0x10', '.inf', '1:20', '.5', '.nan',
    '2026-10-09', 'line\nbreak', 'tab\tvalue', 'quote"', 'null', 'yes', '', 'a\u0085b', 'a\u2028b', 'a\u2029b']) {
    const record = { genome: value };
    for (const version of ['1.1', '1.2']) {
      assert.deepEqual(parse(tb.toYaml(record, schema), { version }), record);
    }
  }
});

test('schema selection honors supported release aliases and never falls back', () => {
  const development = { properties: { genome: { type: 'string', minLength: 20 } } };
  const release = { properties: { genome: { type: 'string' } } };
  const record = { genome: 'short' };
  assert.equal(tb.selectSchema(tb.RELEASE_URL, development, release), release);
  assert.equal(tb.selectSchema(tb.SCHEMA_URL, development, release), development);
  assert.deepEqual(tb.validateRecord(record, tb.selectSchema(tb.RELEASE_URL, development, release)), []);
  assert.equal(tb.validateRecord(record, tb.selectSchema(tb.SCHEMA_URL, development, release)).length, 1);
  assert.equal(tb.selectSchema('https://w3id.org/fair-bioheaders/fhr/v999', development, release), null);
});

test('v0.3.1 snapshot stays fixed independently of the development cache', () => {
  const bytes = readFileSync(new URL('../assets/schema/fhr-v0.3.1.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'e3d3843e1a1646e12495ccc9a615df94b7abe71b833c5f336c59444e0a49620a');
});

test('microdata preserves types, nesting, and array markers', () => {
  const div = tb.microdataDiv(exampleRecord(), schema);
  assert.match(div, /itemscope itemtype="https:\/\/raw\.githubusercontent\.com\/FAIR-bioHeaders\/FHR-Specification\/main\/fhr\.json"/);
  assert.match(div, /itemprop="schemaVersion" data-fhr-type="number">1<\/span>/);
  assert.match(div, /itemprop="taxon" itemscope data-fhr-type="object"/);
  assert.match(div, /itemprop="genomeSynonym" data-fhr-type="array"/);
  assert.match(div, /itemprop="commandLineOption" data-fhr-type="array"/);
});

test('standalone HTML escapes user values and has no scripts', () => {
  const record = exampleRecord();
  record.documentation = '<script>alert(1)</script> & "quotes"';
  const html = tb.standaloneHtml(record, schema);
  assert.doesNotMatch(html, /<script/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<table>/);
  assert.match(html, /<caption>/);
});

test('the table groups fields and keeps author order', () => {
  const rows = tb.tableRows(exampleRecord());
  const groups = rows.map((g) => g.group);
  assert.deepEqual(groups, ['Resource', 'Genome identity', 'Taxon', 'Authors', 'Dates', 'Provenance', 'Assembly', 'Assembly statistics', 'File integrity']);
  const authors = rows.find((g) => g.group === 'Authors');
  assert.deepEqual(authors.rows.filter((row) => row.label.endsWith('— Name')).map((row) => row.value),
    ['Adam Wright', 'David Molik']);
  const statistics = rows.find((g) => g.group === 'Assembly statistics');
  assert.ok(statistics.rows.some((row) => row.label === 'N50 (bp)' && row.value === '16'));
  assert.ok(statistics.rows.some((row) => row.label === 'L50 (contigs)' && row.value === '1'));
  assert.ok(statistics.rows.some((row) => row.label === 'GC content (%)' && row.value === '37.5'));
});

test('zero and false values are preserved, absence is not invented', () => {
  const record = { schema: tb.SCHEMA_URL, genome: 'G', vitalStats: { N50: 0, L50: 0 } };
  const yaml = tb.toYaml(record, schema);
  assert.match(yaml, /^  N50: 0$/m);
  assert.match(yaml, /^  L50: 0$/m);
  assert.doesNotMatch(yaml, /checksum/);
});

test('absent optional fields are omitted from YAML output', () => {
  const minimal = { schema: tb.SCHEMA_URL, genome: 'G' };
  assert.doesNotMatch(tb.toYaml(minimal, schema), /funding/);
});
