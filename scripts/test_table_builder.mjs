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

test('the legacy development cache retains its documented identity', () => {
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
  assert.ok(statistics.rows.some((row) => row.label === 'Contig N50 (bp)' && row.value === '16'));
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

const currentSchema = JSON.parse(readFileSync(new URL('../assets/schema/fhr-v0.4.0.json', import.meta.url)));
function currentRecord() {
  const record = exampleRecord();
  record.schema = tb.CURRENT_URL;
  record.schemaVersion = '2.0';
  record.metadataAuthor[0].nameType = 'Personal';
  record.vitalStats.scaffoldN50 = 200;
  record.vitalStats.scaffoldL50 = 0;
  return record;
}
test('v0.4.0 snapshot is pinned and only explicit release aliases select it', () => {
  const bytes = readFileSync(new URL('../assets/schema/fhr-v0.4.0.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '168a60467e3651dfdfe9855747f38257d5889bfcce6ec8661d9a378762a362dd');
  assert.equal(tb.selectSchema(tb.CURRENT_URL, schema, schema, currentSchema), currentSchema);
  assert.equal(tb.selectSchema('https://w3id.org/fair-bioheaders/fhr/v999', schema, schema, currentSchema), null);
});
test('schema 2 preserves typed authors, scaffold statistics and percentage values', () => {
  const record = currentRecord();
  record.vitalStats.gcContent = 0.42;
  assert.deepEqual(tb.validateRecord(record, currentSchema), []);
  assert.deepEqual(parse(tb.toYaml(record, currentSchema)), record);
  assert.match(tb.microdataDiv(record, currentSchema), /itemprop="schemaVersion" data-fhr-type="string">2.0<\/span>/);
  assert.match(tb.tableHtml(record), /Scaffold N50/);
  record.schemaVersion = 2;
  assert.ok(tb.validateRecord(record, currentSchema).some(e => e.path.join('.') === 'schemaVersion'));
});
test('v0.4 checks scaffold bounds, author vocabulary and referenced checksum', () => {
  const record = currentRecord();
  record.vitalStats.scaffoldL50 = -1;
  record.metadataAuthor[0].nameType = 'Person';
  record.checksum = '!'.repeat(44);
  const paths = tb.validateRecord(record, currentSchema).map(e => e.path.join('.'));
  for (const path of ['vitalStats.scaffoldL50', 'metadataAuthor.0.nameType', 'checksum']) assert.ok(paths.includes(path));
});

const familySchemas = Object.fromEntries(['FHP', 'FHGFF3'].map(kind => [kind, JSON.parse(readFileSync(new URL(`../assets/schema/${kind.toLowerCase()}-v0.4.0.json`, import.meta.url)))]));
const familyFixture = name => parse(readFileSync(new URL(`./fixtures/family-v0.4.0/${name}`, import.meta.url), 'utf8'));
for (const name of ['rich-database.fhp.json', 'rich-mixed.fhp.yaml', 'minimal-reference.fhgff3.json', 'rich.fhgff3.yaml']) {
  test(`released example ${name} validates and survives YAML/table export`, () => {
    const record = familyFixture(name);
    const kind = tb.recordType(record);
    const schema = familySchemas[kind];
    assert.deepEqual(tb.validateRecord(record, schema), []);
    assert.deepEqual(parse(tb.toYaml(record, schema)), record);
    const html = tb.standaloneHtml(record, schema);
    if (kind === 'FHP') {
      assert.match(html, /<h2>Machine-readable FHP microdata<\/h2>/);
      assert.ok(html.includes('<div itemscope itemtype="' + tb.FHP_ITEMTYPE_URL + '">'));
    } else {
      assert.ok(!html.includes('itemscope'));
      assert.match(html, /HTML microdata is not supported/);
      assert.throws(() => tb.microdataDiv(record, schema), /only supported for FHR and FHP/);
    }
    for (const key of Object.keys(record)) assert.ok(tb.tableRows(record)[0].rows.some(row => row.label === key || row.label.startsWith(key + '.')), key);
  });
}
test('FHGFF3 enforces both reference alternatives and annotates cardinality/header type', () => {
  const schema = familySchemas.FHGFF3;
  const base = familyFixture('minimal-reference.fhgff3.json');
  delete base.genomeReference;
  assert.ok(tb.validateRecord(base, schema).length);
  const parent = {headerType:'FHR', relationship:'annotates', checksum:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='};
  base.derivedFrom = [parent];
  assert.deepEqual(tb.validateRecord(base, schema), []);
  base.derivedFrom.push({...parent});
  assert.ok(tb.validateRecord(base, schema).length);
  base.derivedFrom = [{...parent, headerType:'FHP'}];
  base.genomeReference = {accession:'example.1',seqcol_id:'A'.repeat(32)};
  assert.ok(tb.validateRecord(base, schema).length, 'wrong annotates type is invalid even with genomeReference');
  base.derivedFrom = [{...parent, relationship:'derivedFrom'}];
  assert.ok(tb.validateRecord(base, schema).length, 'unknown relationship is rejected');
});
test('FHP preserves numeric boundaries, enums and nested required fields', () => {
  const schema = familySchemas.FHP;
  const record = familyFixture('rich-database.fhp.json');
  for (const geneticCode of [1,6,9,16,21,33]) { record.geneticCode=geneticCode; assert.deepEqual(tb.validateRecord(record,schema),[]); }
  for (const geneticCode of [0,7,8,17,20,34,1.5]) { record.geneticCode=geneticCode; assert.ok(tb.validateRecord(record,schema).length); }
  delete record.geneticCode;
  record.completeness = { total: 0 };
  record.sequenceStats = {sequenceCount:-1};
  record.sourceType='unknown-value';
  const paths=tb.validateRecord(record,schema).map(e=>e.path.join('.'));
  for(const path of ['completeness.total','completeness.lineageDataset','sequenceStats.sequenceCount','sourceType']) assert.ok(paths.includes(path),path);
});

test('FHP microdata carries the FHP itemtype and never the FHR identity', () => {
  const record = familyFixture('rich-database.fhp.json');
  assert.equal(tb.FHP_ITEMTYPE_URL,
    'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhp.json');
  const div = tb.microdataDiv(record, familySchemas.FHP);
  assert.ok(div.startsWith('<div itemscope itemtype="' + tb.FHP_ITEMTYPE_URL + '">'));
  assert.ok(!div.includes('fhr.json'));
  assert.ok(!div.includes('/fhr/'));
  assert.ok(!div.includes(tb.SCHEMA_URL));
});

test('FHP microdata keeps record order, typed scalars, nesting and ordered arrays', () => {
  const record = familyFixture('rich-database.fhp.json');
  const div = tb.microdataDiv(record, familySchemas.FHP);
  let last = -1;
  for (const key of Object.keys(record)) {
    const at = div.indexOf('itemprop="' + key + '"');
    assert.ok(at > last, `${key} keeps its record position`);
    last = at;
  }
  assert.match(div, /itemprop="schema" data-fhr-type="string">https:\/\/w3id\.org\/fair-bioheaders\/fhp\/v0\.4\.0<\/span>/);
  assert.match(div, /itemprop="schemaVersion" data-fhr-type="string">1\.0<\/span>/);
  assert.match(div, /itemprop="taxon" itemscope data-fhr-type="object"><span itemprop="name" data-fhr-type="string">Homo sapiens<\/span>/);
  assert.match(div, /itemprop="metadataAuthor" data-fhr-type="array"><span itemprop="item" itemscope data-fhr-type="object">/);
  assert.match(div, /itemprop="source" data-fhr-type="array"><span itemprop="item" itemscope data-fhr-type="object"><span itemprop="name" data-fhr-type="string">UniProtKB<\/span>/);
  assert.match(div, /itemprop="sequenceCount" data-fhr-type="integer">147520<\/span>/);
  assert.match(div, /itemprop="total" data-fhr-type="integer">13780<\/span>/);
  assert.match(div, /itemprop="relatedLink" data-fhr-type="array"><span itemprop="item" data-fhr-type="string">https:\/\/www\.uniprot\.org\/help\/proteome_id<\/span>/);
});

test('FHP numeric-like strings stay strings, zero counts stay values, markup escapes once', () => {
  const record = familyFixture('rich-mixed.fhp.yaml');
  record.sequenceStats.geneCount = 0;
  record.documentation = '<script>alert("x")</script> & <b>café — naïve</b>';
  const div = tb.microdataDiv(record, familySchemas.FHP);
  assert.match(div, /itemprop="version" data-fhr-type="string">2\.0<\/span>/);
  assert.match(div, /itemprop="geneCount" data-fhr-type="integer">0<\/span>/);
  assert.match(div, /itemprop="isoformPolicy" data-fhr-type="string">all<\/span>/);
  assert.match(div, /itemprop="derivedFrom" data-fhr-type="array"><span itemprop="item" itemscope data-fhr-type="object"><span itemprop="headerType" data-fhr-type="string">FHP<\/span>/);
  assert.ok(!/<script/i.test(div));
  assert.ok(div.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;b&gt;café — naïve&lt;/b&gt;'));
});

test('FHP standalone HTML pairs the readable table with typed microdata', () => {
  const record = familyFixture('rich-database.fhp.json');
  const html = tb.standaloneHtml(record, familySchemas.FHP);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<h1>FHP metadata: UniProt human reference proteome UP000005640<\/h1>/);
  assert.match(html, /<h2>Machine-readable FHP microdata<\/h2>/);
  assert.ok(html.includes('<div itemscope itemtype="' + tb.FHP_ITEMTYPE_URL + '">'));
  assert.doesNotMatch(html, /<script/i);
  assert.ok(html.indexOf('<table>') < html.indexOf('<div itemscope'), 'the readable table precedes the microdata');
});
test('each family type only accepts its supported fixed release', () => {
  for(const kind of ['FHP','FHGFF3']) {
    const url=`https://w3id.org/fair-bioheaders/${kind.toLowerCase()}/v0.4.0`;
    assert.equal(tb.selectSchema(url,null,null,null,familySchemas),familySchemas[kind]);
    assert.equal(tb.selectSchema(url.replace('v0.4.0','v999.0.0'),null,null,null,familySchemas),null);
  }
});

test('family schema snapshots stay pinned and use only implemented validation keywords', () => {
  const digests={FHP:'e3f8f45260b833f931644e87ff7530cb9b4151e67094023dd96edde9a1d90366',FHGFF3:'f89635f252f6e204944de99e6c40bad1b0c9b37af5108fce05ee63f6dfd40bbd'};
  const known=new Set(['$schema','$id','$ref','$defs','definitions','title','description','type','properties','required','additionalProperties','items','anyOf','allOf','not','if','then','else','const','contains','minContains','enum','format','minimum','maximum','pattern','minLength','maxLength']);
  for(const [kind,schema] of Object.entries(familySchemas)) {
    const bytes=readFileSync(new URL(`../assets/schema/${kind.toLowerCase()}-v0.4.0.json`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),digests[kind]);
    function visit(node) {
      if(!node || typeof node!=='object') return;
      for(const [key,value] of Object.entries(node)) {
        assert.ok(known.has(key),`Unsupported schema keyword ${key}`);
        if(key==='$ref') assert.ok(value.startsWith('#/') && value.slice(2).split('/').reduce((n,k)=>n?.[k],schema));
        else if(['properties','$defs','definitions'].includes(key)) Object.values(value).forEach(visit);
        else if(['anyOf','allOf'].includes(key)) value.forEach(visit);
        else if(['items','not','if','then','else','contains'].includes(key)) visit(value);
      }
    }
    visit(schema);
  }
});
