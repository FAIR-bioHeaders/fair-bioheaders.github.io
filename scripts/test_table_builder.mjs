// Unit tests for the pure functions in the FAIR BioHeaders table builder.
//
// Every released-contract claim here is bound to a byte-pinned snapshot under
// assets/schema/ and, where the record is a released example, under
// scripts/fixtures/. The digests are pinned deliberately: a snapshot is replaced
// only together with its form support, fixtures and provenance (AGENTS.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';

const require = createRequire(import.meta.url);
const tb = require('../assets/js/table-builder.js');
const read = (path) => readFileSync(new URL(path, import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (path) => JSON.parse(read(path).toString('utf8'));

// The builder's local catalog, keyed by snapshot file name exactly as the browser
// wiring builds it in `init()`.
const snapshots = {
  'fhr.json': json('../assets/schema/fhr.json'),
  'fhr-v0.3.1.json': json('../assets/schema/fhr-v0.3.1.json'),
  'fhr-v0.4.0.json': json('../assets/schema/fhr-v0.4.0.json'),
  'fhr-v0.6.0.json': json('../assets/schema/fhr-v0.6.0.json'),
  'fhp-v0.4.0.json': json('../assets/schema/fhp-v0.4.0.json'),
  'fhp-v0.6.0.json': json('../assets/schema/fhp-v0.6.0.json'),
  'fhgff3-v0.4.0.json': json('../assets/schema/fhgff3-v0.4.0.json'),
  'fhgff3-v0.6.0.json': json('../assets/schema/fhgff3-v0.6.0.json')
};
const development = snapshots['fhr.json'];
const v031 = snapshots['fhr-v0.3.1.json'];
const fhrCurrent = snapshots['fhr-v0.6.0.json'];

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
  assert.equal(development.$id, tb.SCHEMA_URL);
  assert.equal(development.type, 'object');
  assert.ok(development.required.includes('checksum'));
  assert.equal(development.additionalProperties, false);
  assert.deepEqual(tb.extensionPatterns(development), [], 'the October 9 cache declares no extension fields');
});

test('a valid fixture passes schema validation', () => {
  assert.deepEqual(tb.validateRecord(exampleRecord(), development), []);
});

test('missing required fields are reported with paths', () => {
  const record = exampleRecord();
  delete record.checksum;
  delete record.taxon;
  const errors = tb.validateRecord(record, development);
  assert.ok(errors.some((e) => e.path.join('.') === 'checksum'));
  assert.ok(errors.some((e) => e.path.join('.') === 'taxon'));
});

test('taxon subfields remain optional within the required object', () => {
  const record = exampleRecord();
  record.taxon = { name: 'Homo sapiens' };
  assert.deepEqual(tb.validateRecord(record, development), []);
});

test('type, pattern and format violations are reported', () => {
  const record = exampleRecord();
  record.schemaVersion = 'one';
  record.scholarlyArticle = 'not-a-doi';
  record.checksum = 'short';
  record.vitalStats.gcContent = 150;
  record.taxon.uri = 'not a uri';
  record.assemblyProtocol = 'https://bad host';
  const paths = tb.validateRecord(record, development).map((e) => e.path.join('.'));
  for (const path of ['schemaVersion', 'scholarlyArticle', 'checksum', 'vitalStats.gcContent', 'taxon.uri', 'assemblyProtocol']) {
    assert.ok(paths.includes(path), path);
  }
});

test('unknown properties are rejected', () => {
  const record = exampleRecord();
  record.notAField = 'x';
  assert.ok(tb.validateRecord(record, development).some((e) => e.path.join('.') === 'notAField'));
});

test('masking enum is enforced', () => {
  const record = exampleRecord();
  record.masking = 'maybe-masked';
  assert.ok(tb.validateRecord(record, development).some((e) => e.path.join('.') === 'masking'));
});

test('YAML output round-trips through an actual parser without changing types', () => {
  const record = exampleRecord();
  const yaml = tb.toYaml(record, development);
  assert.deepEqual(parse(yaml), record);
  assert.match(yaml, /^schemaVersion: 1\.0$/m);
});

test('YAML preserves ambiguous strings and control characters', () => {
  for (const value of ['true', '1.0', '- draft', '0x10', '.inf', '1:20', '.5', '.nan',
    '2026-10-09', 'line\nbreak', 'tab\tvalue', 'quote"', 'null', 'yes', '', 'a\u0085b', 'a\u2028b', 'a\u2029b']) {
    const record = { genome: value };
    for (const version of ['1.1', '1.2']) {
      assert.deepEqual(parse(tb.toYaml(record, development), { version }), record);
    }
  }
});

// YAML 1.1/1.2 printable set (c-printable). Every other code unit, and any
// surrogate not part of a pair, must reach the file as an escape sequence.
const YAML_PRINTABLE = /^[\t\n\r\u0020-\u007e\u0085\u00a0-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]*$/u;

test('YAML escapes every character a YAML loader treats as non-printable', () => {
  const awkward = ['\u007f', '\u0080', '\u0085', '\u009f', '\u2028', '\u2029', '\ufffe', '\uffff', '\ud800', '\udfff'];
  for (let code = 0x7f; code <= 0x9f; code += 1) awkward.push(String.fromCharCode(code));
  for (const character of awkward) {
    const record = { genome: 'a' + character + 'b' };
    const yaml = tb.toYaml(record, development);
    assert.match(yaml, YAML_PRINTABLE, 'U+' + character.charCodeAt(0).toString(16).padStart(4, '0') + ' is escaped');
    for (const version of ['1.1', '1.2']) {
      assert.deepEqual(parse(yaml, { version }), record);
    }
  }
  // Printable non-ASCII text, including a paired astral character, stays literal.
  const literal = { genome: 'caf\u00e9 \u{1f9ec} \u00a0' };
  const yaml = tb.toYaml(literal, development);
  assert.ok(yaml.includes('caf\u00e9 \u{1f9ec} \u00a0'));
  assert.deepEqual(parse(yaml), literal);
});

test('inherited Object.prototype names are not treated as schema properties', () => {
  for (const name of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
    const record = currentRecord();
    Object.defineProperty(record, name, { value: 'value', enumerable: true, writable: true, configurable: true });
    const errors = tb.validateRecord(record, fhrCurrent).filter((e) => e.path.join('.') === name);
    assert.ok(errors.length, name + ' is reported');
    assert.ok(errors.some((e) => e.message === 'is not an allowed property'), name + ': ' + JSON.stringify(errors));
    assert.deepEqual(tb.extensionKeys(record, fhrCurrent), []);
  }
});

test('schema selection honors supported release aliases and never falls back', () => {
  const stubDevelopment = { properties: { genome: { type: 'string', minLength: 20 } } };
  const stubRelease = { properties: { genome: { type: 'string' } } };
  const stub = { 'fhr.json': stubDevelopment, 'fhr-v0.3.1.json': stubRelease };
  const record = { genome: 'short' };
  const legacy = tb.RELEASES.FHR.find((entry) => entry.release === 'v0.3.1');
  assert.equal(tb.selectSchema(legacy.aliases[0], stub), stubRelease);
  assert.equal(tb.selectSchema(tb.SCHEMA_URL, stub), stubDevelopment);
  assert.deepEqual(tb.validateRecord(record, tb.selectSchema(legacy.aliases[0], stub)), []);
  assert.equal(tb.validateRecord(record, tb.selectSchema(tb.SCHEMA_URL, stub)).length, 1);
  assert.equal(tb.selectSchema('https://w3id.org/fair-bioheaders/fhr/v999', stub), null);
});

test('v0.3.1 snapshot stays fixed independently of the development cache', () => {
  const bytes = read('../assets/schema/fhr-v0.3.1.json');
  assert.equal(sha256(bytes), 'e3d3843e1a1646e12495ccc9a615df94b7abe71b833c5f336c59444e0a49620a');
});

test('microdata preserves types, nesting, and array markers', () => {
  const div = tb.microdataDiv(exampleRecord(), development);
  assert.match(div, /itemscope itemtype="https:\/\/raw\.githubusercontent\.com\/FAIR-bioHeaders\/FHR-Specification\/main\/fhr\.json"/);
  assert.match(div, /itemprop="schemaVersion" data-fhr-type="number">1<\/span>/);
  assert.match(div, /itemprop="taxon" itemscope data-fhr-type="object"/);
  assert.match(div, /itemprop="genomeSynonym" data-fhr-type="array"/);
  assert.match(div, /itemprop="commandLineOption" data-fhr-type="array"/);
});

test('standalone HTML escapes user values and has no scripts', () => {
  const record = exampleRecord();
  record.documentation = '<script>alert(1)</script> & "quotes"';
  const html = tb.standaloneHtml(record, development);
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
  const yaml = tb.toYaml(record, development);
  assert.match(yaml, /^  N50: 0$/m);
  assert.match(yaml, /^  L50: 0$/m);
  assert.doesNotMatch(yaml, /checksum/);
});

test('absent optional fields are omitted from YAML output', () => {
  const minimal = { schema: tb.SCHEMA_URL, genome: 'G' };
  assert.doesNotMatch(tb.toYaml(minimal, development), /funding/);
});

// --------------------------------------------------- preservation and inertness
// (issue #15 items 5-6: the byte classes and sigils the earlier escaping tests
// did not place in free-text values — bidi/zero-width controls, YAML tag and
// indicator characters, and URI fields holding executable-scheme URLs.)

test('bidi and zero-width control bytes in free text survive every export as inert text', () => {
  const marks = ['\u202A', '\u202B', '\u202C', '\u202D', '\u202E',        // bidi embedding/override
    '\u2066', '\u2067', '\u2068', '\u2069',                                // bidi isolates
    '\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF'];                     // zero-width and BOM/word-joiner
  for (const mark of marks) {
    const record = currentRecord();
    record.documentation = 'a' + mark + 'b';
    assert.deepEqual(tb.validateRecord(record, fhrCurrent), [], 'U+' + mark.charCodeAt(0).toString(16));
    const value = record.documentation;
    assert.deepEqual(parse(tb.toYaml(record, fhrCurrent)), record, 'YAML preserves the byte exactly');
    const div = tb.microdataDiv(record, fhrCurrent);
    assert.ok(div.includes('itemprop="documentation" data-fhr-type="string">' + value + '</span>'),
      'microdata carries the text untouched (rendered via textContent in the browser)');
    const html = tb.standaloneHtml(record, fhrCurrent);
    assert.ok(!/<script/i.test(html) && !/<a[ >]/i.test(html), 'the byte cannot open or forge markup');
  }
});

test('YAML indicator and tag characters never escape their quoted scalar', () => {
  const tokens = ['*alias', '&anchor', '!!py/object:tag', '!custom', '@reserved', '`reserved',
    '- dash first', 'key: value', 'x: {y: 1}', '[1, 2]', '{a: 1}', '%TAG directive',
    '# comment start', '> folded', '| literal', 'line\nnext: 1', '\ttab first', '---', '...',
    '? query', ': border', ', comma', '[bracket]', '{} empty'];
  for (const token of tokens) {
    const record = currentRecord();
    record.instrument = ['plain', token];
    record.funding = token;
    assert.deepEqual(tb.validateRecord(record, fhrCurrent), [], JSON.stringify(token));
    const yaml = tb.toYaml(record, fhrCurrent);
    assert.deepEqual(parse(yaml, { version: '1.2' }), record, JSON.stringify(token) + ' (1.2)');
    assert.deepEqual(parse(yaml, { version: '1.1' }), record, JSON.stringify(token) + ' (1.1)');
    for (const line of yaml.split('\n')) {
      const shape = line.trim();
      if (!shape) continue;
      assert.ok(/^[A-Za-z_][A-Za-z0-9_.-]*:( |$)/.test(shape) || shape === '-' || /^- \S/.test(shape),
        'unexpected structural line: ' + JSON.stringify(line));
    }
  }
});

test('executable-scheme URIs are inert text: exports never write a link', () => {
  for (const target of ['javascript:alert(1)', 'vbscript:msgbox(1)',
    'data:text/html,%3Cscript%3Ealert(1)%3C%2Fscript%3E']) {
    const record = currentRecord();
    record.relatedLink = [target];
    record.documentation = target + ' javascript&colon;alert(1)';
    // These are valid absolute URIs per RFC 3986 — the grammar the released
    // toolkit enforces for `format: uri` (verified 2026-11-19 against
    // fair-bioheaders 0.12.0). Safety in the exports is rendering, not a
    // scheme allow-list, and that is what the rest of this test pins.
    assert.deepEqual(tb.validateRecord(record, fhrCurrent), [], target);
    const html = tb.standaloneHtml(record, fhrCurrent);
    assert.ok(!/<a[ >]/i.test(html) && !/href=/i.test(html) && !/<script/i.test(html), target);
    const div = tb.microdataDiv(record, fhrCurrent);
    assert.ok(!/href=/i.test(div), target + ' stays out of any attribute position');
    assert.ok(div.includes('>' + tb.escapeHtml(target) + '<'), target + ' is a typed string leaf');
    assert.ok(div.includes(tb.escapeHtml(record.documentation)) && !div.includes('javascript&colon;'),
      'the entity lookalike stays double-escaped as text');
  }
});

test('format uri follows the toolkit RFC 3986 grammar, not WHATWG laxness', () => {
  // fair-bioheaders 0.12.0 (jsonschema strict checker, run 2026-11-19) rejects
  // `data:text/html,<script>alert(1)</script>` as not a URI; WHATWG `new URL()`
  // had accepted it. The browser validator now refuses the same strings, so the
  // builder cannot export a record the released reader declines.
  for (const bad of ['data:text/html,<script>alert(1)</script>', 'https://exa mple.org/',
    'https://example.org/a"b', 'http://[unbalanced', 'not a uri at all', '', 'javascript&colon;alert(1)']) {
    const record = currentRecord();
    record.relatedLink = [bad];
    const errors = tb.validateRecord(record, fhrCurrent);
    assert.ok(errors.some((e) => e.path.join('.') === 'relatedLink.0' && /uri/i.test(e.message)),
      JSON.stringify(bad));
  }
  for (const good of ['https://example.org/a&b%3Cc%3Ed%22e%27f#frag', 'urn:isbn:0451450523',
    'https://identifiers.org/taxonomy:9606', 'http://ok.example:8080/p;params?q=1+2']) {
    const record = currentRecord();
    record.relatedLink = [good];
    assert.deepEqual(tb.validateRecord(record, fhrCurrent), [], good);
  }
});

// ---------------------------------------------------------------- pinned snapshots

const PINNED = {
  'fhr-v0.4.0.json': '168a60467e3651dfdfe9855747f38257d5889bfcce6ec8661d9a378762a362dd',
  'fhp-v0.4.0.json': 'e3f8f45260b833f931644e87ff7530cb9b4151e67094023dd96edde9a1d90366',
  'fhgff3-v0.4.0.json': 'f89635f252f6e204944de99e6c40bad1b0c9b37af5108fce05ee63f6dfd40bbd',
  'fhr-v0.6.0.json': '694ab5afaf8c3743eacf9e2aacb5551f7cbe37073b6f4afc3ae4a65b47f9d4df',
  'fhp-v0.6.0.json': '92a0b3cbcfe69939ebfaac69f0c5958ce426c005873efe8d3e3eb0fc0dab6de5',
  'fhgff3-v0.6.0.json': '1942be4cefc8b3a2537942c2252b45fbcef87a5532486e4fd0f5d4c540e0fbf9'
};

test('every builder snapshot keeps its pinned digest', () => {
  for (const [file, digest] of Object.entries(PINNED)) {
    assert.equal(sha256(read(`../assets/schema/${file}`)), digest, file);
  }
});

test('the v0.6.0 builder snapshots are the same bytes as the /specifications/ pins', () => {
  // Two pinned consumers of one release must not drift apart: the documentation
  // generator reads scripts/schema-snapshots/, the builder reads assets/schema/.
  for (const file of ['fhr-v0.6.0.json', 'fhp-v0.6.0.json', 'fhgff3-v0.6.0.json']) {
    assert.deepEqual([...read(`../assets/schema/${file}`)], [...read(`../scripts/schema-snapshots/${file}`)], file);
  }
});

test('the registry declares the versions the shared release registry publishes', () => {
  const registry = json('../scripts/schema-snapshots/versions-v0.6.0.json');
  assert.equal(sha256(read('../scripts/schema-snapshots/versions-v0.6.0.json')),
    '7535e3569ce4157b22f14b9cd89dc98612b4e90cf553ef0a3250f5811529ce62');
  assert.equal(registry.current, 'v0.6.0');
  for (const entries of Object.values(tb.RELEASES)) {
    for (const entry of entries) {
      const published = registry.releases[entry.release][entry.type];
      assert.equal(entry.declares, published, `${entry.type} ${entry.release}`);
      const enumValues = snapshots[entry.snapshot].properties.schemaVersion.enum;
      if (Array.isArray(enumValues)) {
        assert.ok(enumValues.includes(entry.declares), `${entry.type} ${entry.release} states ${entry.declares} which its schema enum allows`);
      } else {
        assert.equal(entry.declares, 1, 'only the legacy numeric contract has no enum');
      }
    }
  }
});

test('only the pinned releases select a snapshot; every other citation is unsupported', () => {
  const supported = new Set();
  for (const entries of Object.values(tb.RELEASES)) {
    for (const entry of entries) {
      for (const alias of entry.aliases) {
        supported.add(alias);
        assert.equal(tb.selectRelease(alias), entry, alias);
        assert.equal(tb.selectSchema(alias, snapshots), snapshots[entry.snapshot], alias);
      }
    }
  }
  supported.add(tb.SCHEMA_URL);
  // Real releases the builder does not pin, plus shapes that must not be guessed.
  for (const target of [
    'https://w3id.org/fair-bioheaders/fhp/v0.5.0',
    'https://w3id.org/fair-bioheaders/fhgff3/v0.5.0',
    'https://w3id.org/fair-bioheaders/fhr/v0.4.1',
    'https://w3id.org/fair-bioheaders/fhr/v0.4.2',
    'https://w3id.org/fair-bioheaders/fhr/v0.6.1',
    'https://w3id.org/fair-bioheaders/fhp/v9.9.9',
    'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/v0.5.0/fhp.json',
    'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhp.json',
    'https://w3id.org/fair-bioheaders/fht/v0.6.0',
    'https://w3id.org/fair-bioheaders/fhgm/v0.6.0',
    'https://example.org/fhr.json'
  ]) {
    assert.equal(tb.selectRelease(target), null, target);
    assert.equal(tb.selectSchema(target, snapshots), null, target);
  }
});

test('the FHR default cites the current release and declares schema 2.1', () => {
  const fhr = tb.RELEASES.FHR[0];
  assert.equal(fhr.release, 'v0.6.0');
  assert.equal(fhr.declares, '2.1');
  assert.equal(tb.GROUPS[0].fields[0].default, fhr.aliases[0]);
  assert.equal(tb.GROUPS[0].fields[1].default, '2.1');
  assert.equal(tb.contractLabel(fhr), 'FHR v0.6.0 (schema 2.1)');
  assert.equal(tb.contractLabel(tb.DEVELOPMENT), 'the cached raw-main development snapshot');
});

// ------------------------------------------------------- extension fields (rule R15)

test('each v0.6.0 snapshot declares the same extension-field pattern', () => {
  for (const file of ['fhr-v0.6.0.json', 'fhp-v0.6.0.json', 'fhgff3-v0.6.0.json']) {
    assert.deepEqual(tb.extensionPatterns(snapshots[file]), ['^x-[A-Za-z0-9][A-Za-z0-9_.-]*$'], file);
  }
  for (const file of ['fhr-v0.4.0.json', 'fhp-v0.4.0.json', 'fhgff3-v0.4.0.json', 'fhr-v0.3.1.json', 'fhr.json']) {
    assert.deepEqual(tb.extensionPatterns(snapshots[file]), [], file);
  }
});

function currentRecord() {
  const record = exampleRecord();
  record.schema = tb.RELEASES.FHR[0].aliases[0];
  record.schemaVersion = '2.1';
  record.metadataAuthor[0].nameType = 'Personal';
  record.vitalStats.scaffoldN50 = 200;
  record.vitalStats.scaffoldL50 = 0;
  return record;
}

test('an x- extension field validates against the v0.6.0 snapshot', () => {
  const record = currentRecord();
  record['x-site-builder'] = 'produced by the fhref.org builder';
  assert.deepEqual(tb.validateRecord(record, fhrCurrent), []);
  assert.deepEqual(tb.extensionKeys(record, fhrCurrent), ['x-site-builder']);
});

test('extension values keep their structure in the YAML export', () => {
  const record = currentRecord();
  record['x-refget-commonName'] = 'human';
  record['x-example-pipeline'] = { name: 'synthetic-pipeline', steps: ['assemble', 'polish'] };
  assert.deepEqual(tb.validateRecord(record, fhrCurrent), []);
  const yaml = tb.toYaml(record, fhrCurrent);
  assert.deepEqual(parse(yaml), record);
  // Standard fields keep FIELD_ORDER; the extension fields follow them.
  assert.ok(yaml.indexOf('x-refget-commonName') > yaml.indexOf('checksum:'),
    'extension fields are emitted after the canonical fields');
  assert.match(yaml, /^x-example-pipeline:$/m);
  assert.match(yaml, /^  - "assemble"$/m);
});

test('extension fields reach the readable table but never the microdata item', () => {
  const record = currentRecord();
  record['x-site-builder'] = 'text value';
  const div = tb.microdataDiv(record, fhrCurrent);
  assert.doesNotMatch(div, /itemprop="x-site-builder"/, 'docs/MICRODATA.md M5');
  assert.match(div, /itemprop="genome"/, 'the item itself is still written');
  const html = tb.standaloneHtml(record, fhrCurrent);
  assert.match(html, /Extension fields are not carried by HTML microdata/);
  assert.match(html, /"x-site-builder"/);
  const rows = tb.tableRows(record);
  const group = rows.find((entry) => entry.group === 'Extension fields');
  assert.ok(group, 'the readable table shows the extension field');
  assert.deepEqual(group.rows, [{ label: 'x-site-builder', value: 'text value' }]);
});

test('extension keys are reported for the legacy contracts too, and fail validation there', () => {
  const record = currentRecord();
  record.schema = tb.RELEASES.FHR[1].aliases[0];
  record.schemaVersion = '2.0';
  record['x-site-builder'] = 'value';
  const errors = tb.validateRecord(record, snapshots['fhr-v0.4.0.json']);
  assert.ok(errors.some((e) => e.path.join('.') === 'x-site-builder' && /not an allowed property/.test(e.message)));
});

test('a record stating the older minor is held to it: no extension fields', () => {
  const record = currentRecord();
  record.schemaVersion = '2.0';                      // cites v0.6.0, states 2.0
  record['x-site-builder'] = 'value';
  const errors = tb.validateRecord(record, fhrCurrent);
  assert.ok(errors.some((e) => e.path.join('.') === 'x-site-builder'),
    'the v0.6.0 conditional rejects an x- key in a record that states 2.0');
  delete record['x-site-builder'];
  assert.deepEqual(tb.validateRecord(record, fhrCurrent), [], 'the same record without the extension is valid');
});

test('extension field names are checked, not guessed', () => {
  for (const name of ['X-site', 'x-', 'x- bad name', 'x-.leading', 'site-builder', 'x-\u00e9t\u00e9']) {
    const record = currentRecord();
    record[name] = 'value';
    assert.ok(tb.validateRecord(record, fhrCurrent).some((e) => e.path.join('.') === name), name);
  }
});

test('no key may contain a line feed, even in the v0.6.0 contract', () => {
  const record = currentRecord();
  record['x-note\ncontinued'] = 'value';
  assert.ok(tb.validateRecord(record, fhrCurrent).some((e) => /line feed/.test(e.message)));
});

// ------------------------------------------------------------ dotted BUSCO (1.2)

// Fixtures are read as records, whatever their file format.
const releaseFixture = (name) => {
  const text = read(`./fixtures/family-v0.6.0/${name}`).toString('utf8');
  return name.endsWith('.json') ? JSON.parse(text) : parse(text);
};

function fhpRecord(version, lineageDataset) {
  const record = json('./fixtures/family-v0.6.0/rich-database.fhp.json');
  record.schemaVersion = version;
  if (lineageDataset === null) delete record.completeness;
  else record.completeness.lineageDataset = lineageDataset;
  return record;
}

test('the static extension help names exactly the pattern the snapshots declare', () => {
  for (const file of ['fhr-v0.6.0.json', 'fhp-v0.6.0.json', 'fhgff3-v0.6.0.json']) {
    assert.deepEqual(tb.extensionPatterns(snapshots[file]), [tb.EXTENSION_KEY_PATTERN], file);
  }
});

test('the development cache never drives a family form', () => {
  assert.equal(tb.recordType({ schema: tb.SCHEMA_URL }), 'FHR');
  assert.equal(tb.selectRelease(tb.SCHEMA_URL).type, 'FHR');
});

test('dotted BUSCO dataset versions are accepted by a 1.2 record', () => {
  for (const dataset of ['diptera_odb12', 'diptera_odb12.2', 'enterobacterales_odb12.2.3']) {
    assert.deepEqual(tb.validateRecord(fhpRecord('1.2', dataset), snapshots['fhp-v0.6.0.json']), [], dataset);
  }
});

test('dotted BUSCO dataset versions are held out of the minors that forbid them', () => {
  for (const version of ['1.0', '1.1']) {
    const errors = tb.validateRecord(fhpRecord(version, 'diptera_odb12.2'), snapshots['fhp-v0.6.0.json']);
    assert.ok(errors.some((e) => e.path.join('.') === 'completeness.lineageDataset'), version);
    assert.deepEqual(tb.validateRecord(fhpRecord(version, 'diptera_odb12'), snapshots['fhp-v0.6.0.json']), [],
      `${version} keeps the undotted form valid`);
  }
});

test('the FHP v0.4.0 snapshot has no dotted BUSCO path at all', () => {
  const record = fhpRecord('1.0', 'diptera_odb12.2');
  record.schema = tb.RELEASES.FHP[1].aliases[0];
  assert.ok(tb.validateRecord(record, snapshots['fhp-v0.4.0.json'])
    .some((e) => e.path.join('.') === 'completeness.lineageDataset'));
});

test('the FHGFF3 1.2 contract follows the same BUSCO rule', () => {
  const base = releaseFixture('rich.fhgff3.yaml');
  for (const [version, dataset, valid] of [['1.2', 'enterobacterales_odb12.2', true], ['1.1', 'enterobacterales_odb12.2', false], ['1.2', 'enterobacterales_odb12', true]]) {
    const record = { ...base, schemaVersion: version };
    record.completeness = { ...record.completeness, lineageDataset: dataset };
    const errors = tb.validateRecord(record, snapshots['fhgff3-v0.6.0.json']).filter((e) => e.path.join('.') === 'completeness.lineageDataset');
    assert.equal(errors.length === 0, valid, `FHGFF3 ${version} with ${dataset}`);
  }
});

// ------------------------------------------------------------------ v0.6.0 records

for (const name of ['example.fhr.json', 'extension-fields.fhr.yaml', 'rich-database.fhp.json',
  'rich-mixed.fhp.yaml', 'minimal-reference.fhgff3.json', 'rich.fhgff3.yaml', 'dotted-lineage.fhp.yaml']) {
  test(`released-shape fixture ${name} validates and survives YAML/table export`, () => {
    const record = releaseFixture(name);
    const kind = tb.recordType(record);
    const entry = tb.selectRelease(record.schema);
    assert.equal(entry.type, kind, `${name} cites its own type`);
    assert.equal(record.schemaVersion, entry.declares, `${name} states the version its release publishes`);
    const schema = snapshots[entry.snapshot];
    assert.deepEqual(tb.validateRecord(record, schema), []);
    assert.deepEqual(parse(tb.toYaml(record, schema)), record);
    const html = tb.standaloneHtml(record, schema);
    if (kind === 'FHP') {
      assert.match(html, /<h2>Machine-readable FHP microdata<\/h2>/);
      assert.ok(html.includes('<div itemscope itemtype="' + tb.FHP_ITEMTYPE_URL + '">'));
    } else if (kind === 'FHGFF3') {
      assert.ok(!html.includes('itemscope'), 'FHGFF3 HTML carries no microdata');
      assert.match(html, /HTML microdata is not supported/);
      assert.throws(() => tb.microdataDiv(record, schema), /only supported for FHR and FHP/);
    }
    const groups = tb.tableRows(record);
    if (kind === 'FHR') {
      // The FHR table is authored through its labelled groups, not raw key names:
      // assert the groups are present and that every extension key still shows.
      assert.ok(groups.length > 1, 'the labelled FHR groups are rendered');
      assert.ok(groups.some((group) => group.group === 'File integrity'), 'the integrity group is rendered');
    } else {
      const labels = groups.flatMap((group) => group.rows.map((row) => row.label));
      for (const key of Object.keys(record)) {
        assert.ok(labels.some((label) => label === key || label.startsWith(key + '.')), key);
      }
    }
    const shown = groups.flatMap((group) => group.rows.map((row) => row.label));
    for (const key of tb.extensionKeys(record, schema)) {
      assert.ok(shown.includes(key), `${key} is shown in the readable table`);
      assert.ok(!html.includes('itemprop="' + key + '"'), `${key} stays out of the microdata item (M5)`);
    }
  });
}

// ------------------------------------------------------------- frozen v0.4.0 records

const familyFixture = (name) => parse(read(`./fixtures/family-v0.4.0/${name}`).toString('utf8'));
for (const name of ['rich-database.fhp.json', 'rich-mixed.fhp.yaml', 'minimal-reference.fhgff3.json', 'rich.fhgff3.yaml']) {
  test(`frozen v0.4.0 example ${name} still validates and exports`, () => {
    const record = familyFixture(name);
    const kind = tb.recordType(record);
    const schema = kind === 'FHP' ? snapshots['fhp-v0.4.0.json'] : snapshots['fhgff3-v0.4.0.json'];
    assert.equal(record.schema, `https://w3id.org/fair-bioheaders/${kind.toLowerCase()}/v0.4.0`);
    assert.equal(record.schemaVersion, '1.0');
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
    for (const key of Object.keys(record)) {
      assert.ok(tb.tableRows(record)[0].rows.some((row) => row.label === key || row.label.startsWith(key + '.')), key);
    }
  });
}

test('FHGFF3 enforces both reference alternatives and annotates cardinality/header type', () => {
  const schema = snapshots['fhgff3-v0.6.0.json'];
  const base = json('./fixtures/family-v0.6.0/minimal-reference.fhgff3.json');
  delete base.genomeReference;
  assert.ok(tb.validateRecord(base, schema).length);
  const parent = { headerType: 'FHR', relationship: 'annotates', checksum: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' };
  base.derivedFrom = [parent];
  assert.deepEqual(tb.validateRecord(base, schema), []);
  base.derivedFrom.push({ ...parent });
  assert.ok(tb.validateRecord(base, schema).length);
  base.derivedFrom = [{ ...parent, headerType: 'FHP' }];
  base.genomeReference = { accession: 'example.1', seqcol_id: 'A'.repeat(32) };
  assert.ok(tb.validateRecord(base, schema).length, 'wrong annotates type is invalid even with genomeReference');
  base.derivedFrom = [{ ...parent, relationship: 'derivedFrom' }];
  assert.ok(tb.validateRecord(base, schema).length, 'unknown relationship is rejected');
});

test('FHP preserves numeric boundaries, enums and nested required fields', () => {
  const schema = snapshots['fhp-v0.6.0.json'];
  const record = json('./fixtures/family-v0.6.0/rich-database.fhp.json');
  for (const geneticCode of [1, 6, 9, 16, 21, 33]) { record.geneticCode = geneticCode; assert.deepEqual(tb.validateRecord(record, schema), []); }
  for (const geneticCode of [0, 7, 8, 17, 20, 34, 1.5]) { record.geneticCode = geneticCode; assert.ok(tb.validateRecord(record, schema).length, String(geneticCode)); }
  delete record.geneticCode;
  record.completeness = { total: 0 };
  record.sequenceStats = { sequenceCount: -1 };
  record.sourceType = 'unknown-value';
  const paths = tb.validateRecord(record, schema).map((e) => e.path.join('.'));
  for (const path of ['completeness.total', 'completeness.lineageDataset', 'sequenceStats.sequenceCount', 'sourceType']) {
    assert.ok(paths.includes(path), path);
  }
});

test('FHP microdata carries the FHP itemtype and never the FHR identity', () => {
  const record = json('./fixtures/family-v0.6.0/rich-database.fhp.json');
  assert.equal(tb.FHP_ITEMTYPE_URL,
    'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhp.json');
  const div = tb.microdataDiv(record, snapshots['fhp-v0.6.0.json']);
  assert.ok(div.startsWith('<div itemscope itemtype="' + tb.FHP_ITEMTYPE_URL + '">'));
  assert.ok(!div.includes('fhr.json'));
  assert.ok(!div.includes('/fhr/'));
  assert.ok(!div.includes(tb.SCHEMA_URL));
});

test('FHP microdata keeps record order, typed scalars, nesting and ordered arrays', () => {
  const record = json('./fixtures/family-v0.6.0/rich-database.fhp.json');
  const div = tb.microdataDiv(record, snapshots['fhp-v0.6.0.json']);
  let last = -1;
  for (const key of Object.keys(record)) {
    const at = div.indexOf('itemprop="' + key + '"');
    if (tb.extensionKeys(record, snapshots['fhp-v0.6.0.json']).includes(key)) {
      assert.equal(at, -1, `${key} is an extension field and stays out of microdata`);
      continue;
    }
    assert.ok(at > last, `${key} keeps its record position`);
    last = at;
  }
  assert.match(div, /itemprop="schema" data-fhr-type="string">https:\/\/w3id\.org\/fair-bioheaders\/fhp\/v0\.6\.0<\/span>/);
  assert.match(div, /itemprop="schemaVersion" data-fhr-type="string">1\.2<\/span>/);
  assert.match(div, /itemprop="taxon" itemscope data-fhr-type="object"><span itemprop="name" data-fhr-type="string">Homo sapiens<\/span>/);
  assert.match(div, /itemprop="metadataAuthor" data-fhr-type="array"><span itemprop="item" itemscope data-fhr-type="object">/);
  assert.match(div, /itemprop="source" data-fhr-type="array"><span itemprop="item" itemscope data-fhr-type="object"><span itemprop="name" data-fhr-type="string">UniProtKB<\/span>/);
  assert.match(div, /itemprop="sequenceCount" data-fhr-type="integer">147520<\/span>/);
  assert.match(div, /itemprop="total" data-fhr-type="integer">13780<\/span>/);
  assert.match(div, /itemprop="relatedLink" data-fhr-type="array"><span itemprop="item" data-fhr-type="string">https:\/\/www\.uniprot\.org\/help\/proteome_id<\/span>/);
});

test('FHP numeric-like strings stay strings, zero counts stay values, markup escapes once', () => {
  const record = familyFixture('rich-mixed.fhp.yaml');
  const schema = snapshots['fhp-v0.4.0.json'];
  record.sequenceStats.geneCount = 0;
  record.documentation = '<script>alert("x")</script> & <b>café — naïve</b>';
  const div = tb.microdataDiv(record, schema);
  assert.match(div, /itemprop="version" data-fhr-type="string">2\.0<\/span>/);
  assert.match(div, /itemprop="geneCount" data-fhr-type="integer">0<\/span>/);
  assert.match(div, /itemprop="isoformPolicy" data-fhr-type="string">all<\/span>/);
  assert.match(div, /itemprop="derivedFrom" data-fhr-type="array"><span itemprop="item" itemscope data-fhr-type="object"><span itemprop="headerType" data-fhr-type="string">FHP<\/span>/);
  assert.ok(!/<script/i.test(div));
  assert.ok(div.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;b&gt;café — naïve&lt;/b&gt;'));
});

test('FHP standalone HTML pairs the readable table with typed microdata', () => {
  const record = json('./fixtures/family-v0.6.0/rich-database.fhp.json');
  const html = tb.standaloneHtml(record, snapshots['fhp-v0.6.0.json']);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<h1>FHP metadata: UniProt human reference proteome UP000005640<\/h1>/);
  assert.match(html, /<h2>Machine-readable FHP microdata<\/h2>/);
  assert.ok(html.includes('<div itemscope itemtype="' + tb.FHP_ITEMTYPE_URL + '">'));
  assert.doesNotMatch(html, /<script/i);
  assert.ok(html.indexOf('<table>') < html.indexOf('<div itemscope'), 'the readable table precedes the microdata');
});

test('each family type only accepts its own pinned releases', () => {
  for (const kind of ['FHP', 'FHGFF3']) {
    for (const entry of tb.RELEASES[kind]) {
      assert.equal(tb.selectSchema(entry.aliases[0], snapshots), snapshots[entry.snapshot]);
      assert.equal(tb.selectSchema(entry.aliases[0].replace(entry.release, 'v999.0.0'), snapshots), null);
      // A cross-type citation never resolves through this type's snapshot.
      const other = kind === 'FHP' ? 'fhgff3' : 'fhp';
      assert.equal(tb.recordType({ schema: entry.aliases[0].replace(kind.toLowerCase(), other) }), other.toUpperCase());
    }
  }
});

test('schema 2 keeps typed authors, scaffold statistics and percentage values', () => {
  const record = currentRecord();
  record.vitalStats.gcContent = 0.42;
  assert.deepEqual(tb.validateRecord(record, fhrCurrent), []);
  assert.deepEqual(parse(tb.toYaml(record, fhrCurrent)), record);
  assert.match(tb.microdataDiv(record, fhrCurrent), /itemprop="schemaVersion" data-fhr-type="string">2\.1<\/span>/);
  assert.match(tb.tableHtml(record), /Scaffold N50/);
  record.schemaVersion = 2;
  assert.ok(tb.validateRecord(record, fhrCurrent).some((e) => e.path.join('.') === 'schemaVersion'));
});

test('v0.6.0 checks scaffold bounds, author vocabulary and referenced checksum', () => {
  const record = currentRecord();
  record.vitalStats.scaffoldL50 = -1;
  record.metadataAuthor[0].nameType = 'Person';
  record.checksum = '!'.repeat(44);
  const paths = tb.validateRecord(record, fhrCurrent).map((e) => e.path.join('.'));
  for (const path of ['vitalStats.scaffoldL50', 'metadataAuthor.0.nameType', 'checksum']) assert.ok(paths.includes(path), path);
});

test('builder snapshots use only validation keywords the browser validator implements', () => {
  const known = new Set(['$schema', '$id', '$ref', '$defs', 'definitions', 'title', 'description', 'type',
    'properties', 'required', 'additionalProperties', 'items', 'anyOf', 'allOf', 'not', 'if', 'then', 'else',
    'const', 'contains', 'minContains', 'enum', 'format', 'minimum', 'maximum', 'pattern', 'minLength',
    'maxLength', 'patternProperties', 'propertyNames']);
  const container = new Set(['properties', '$defs', 'definitions', 'patternProperties']);
  for (const [file, schema] of Object.entries(snapshots)) {
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        assert.ok(known.has(key), `${file}: unsupported schema keyword ${key}`);
        if (key === '$ref') {
          assert.ok(value.startsWith('#/') && value.slice(2).split('/').reduce((n, k) => n?.[k], schema),
            `${file}: unresolvable $ref ${value}`);
        } else if (container.has(key)) Object.values(value).forEach(visit);
        else if (['anyOf', 'allOf'].includes(key)) value.forEach(visit);
        else if (['items', 'not', 'if', 'then', 'else', 'contains', 'propertyNames'].includes(key)) visit(value);
      }
    }
    visit(schema);
  }
});
