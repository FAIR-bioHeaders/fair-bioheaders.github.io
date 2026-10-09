// Unit tests for the pure functions in the FHR table builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

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

test('type, pattern and format violations are reported', () => {
  const record = exampleRecord();
  record.schemaVersion = 'one';
  record.scholarlyArticle = 'not-a-doi';
  record.checksum = 'short';
  record.vitalStats.gcContent = 150;
  record.taxon.uri = 'not a uri';
  const paths = tb.validateRecord(record, schema).map((e) => e.path.join('.'));
  assert.ok(paths.includes('schemaVersion'));
  assert.ok(paths.includes('scholarlyArticle'));
  assert.ok(paths.includes('checksum'));
  assert.ok(paths.includes('vitalStats.gcContent'));
  assert.ok(paths.includes('taxon.uri'));
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

test('YAML output round-trips through the schema-prescribed shapes', () => {
  const yaml = tb.toYaml(exampleRecord(), schema);
  assert.match(yaml, /^schema: https:\/\/raw\.githubusercontent\.com\//m);
  assert.match(yaml, /^schemaVersion: 1\.0$/m);
  assert.match(yaml, /^metadataAuthor:$/m);
  assert.match(yaml, /^- name: Adam Wright$/m);
  assert.match(yaml, /^  uri: https:\/\/orcid\.org\/0000-0002-5719-4024$/m);
  assert.match(yaml, /^assemblySoftware:$/m);
  assert.match(yaml, /^  commandLineOption:$/m);
  assert.match(yaml, /^  - -t$/m);
  assert.match(yaml, /^  - '2'$/m);
});

test('YAML quotes values that would otherwise change type', () => {
  const record = exampleRecord();
  record.genome = 'true';
  record.version = '1.0';
  assert.match(tb.toYaml(record), /^genome: 'true'$/m);
  assert.match(tb.toYaml(record), /^version: '1\.0'$/m);
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
  assert.match(authors.rows[0].value, /Adam Wright/);
  assert.match(authors.rows[1].value, /David Molik/);
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
