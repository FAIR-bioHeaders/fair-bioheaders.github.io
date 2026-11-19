// Round-trip driver for the released-type builder exports (issue #15 item 3).
//
// This is the Node half of `scripts/test_builder_roundtrip.py`. It runs the
// shipping `assets/js/table-builder.js` export functions over the pinned
// v0.6.0 fixtures plus hostile vectors and prints the results as one JSON
// report on stdout; the Python test then re-reads those exports with standard
// library parsing only and feeds reconstructed records back through this
// driver's --validate mode. The driver holds no assertions itself: CI gates on
// the Python side, so a broken driver fails loudly instead of agreeing with
// itself.
//
// This is not the toolkit round trip. `fair-bioheaders` is not installed in
// website CI (pinning a toolkit version there is an open maintainer decision);
// the dated converter round trips stay the local procedure recorded in
// docs/maintenance.md. What is automated here is strictly this repository's
// own producer/validator boundary: export -> stdlib re-read -> this repo's
// snapshot validator.
//
// Modes:
//   node scripts/builder_roundtrip.mjs --export
//   node scripts/builder_roundtrip.mjs --validate <snapshot-file>   (record JSON on stdin)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const tb = require('../assets/js/table-builder.js');
const { parse } = require('yaml');

const read = (path) => readFileSync(new URL(path, import.meta.url));
const json = (path) => JSON.parse(read(path).toString('utf8'));
const snapshots = Object.fromEntries(['fhr.json', 'fhr-v0.3.1.json', 'fhr-v0.4.0.json', 'fhr-v0.6.0.json',
  'fhp-v0.4.0.json', 'fhp-v0.6.0.json', 'fhgff3-v0.4.0.json', 'fhgff3-v0.6.0.json']
  .map((file) => [file, json(`../assets/schema/${file}`)]));

const readFixture = (name) => {
  const text = read(`./fixtures/family-v0.6.0/${name}`).toString('utf8');
  return name.endsWith('.json') ? JSON.parse(text) : parse(text);
};

function build(name, record) {
  const kind = tb.recordType(record);
  const entry = tb.selectRelease(record.schema);
  if (!entry || entry.type !== kind) throw new Error(`${name}: cites an unsupported or cross-type target`);
  const schema = snapshots[entry.snapshot];
  const errors = tb.validateRecord(record, schema);
  let microdataDiv = null;
  let microdataThrows = false;
  if (kind === 'FHGFF3') {
    try { tb.microdataDiv(record, schema); } catch (_) { microdataThrows = true; }
  } else {
    microdataDiv = tb.microdataDiv(record, schema);
  }
  return {
    name,
    kind,
    release: entry.release,
    snapshot: entry.snapshot,
    declares: entry.declares,
    record,
    extensions: tb.extensionKeys(record, schema),
    validationErrors: errors,
    yaml: tb.toYaml(record, schema),
    standaloneHtml: tb.standaloneHtml(record, schema),
    tableHtml: tb.tableHtml(record),
    microdataDiv,
    microdataThrows
  };
}

if (process.argv[2] === '--validate') {
  const snapshot = snapshots[process.argv[3]];
  if (!snapshot) throw new Error(`unknown snapshot ${process.argv[3]}`);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const record = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  process.stdout.write(JSON.stringify(tb.validateRecord(record, snapshot)));
  process.exit(0);
}

// Hostile vectors: every payload sits in a field the released contract leaves
// unconstrained (or, for relatedLink, one whose generic `uri` format a WHATWG
// URL parser accepts), so the records below must validate cleanly while their
// values survive export untouched and inert. The Python test asserts both
// halves; nothing here excuses an inertness failure by expecting invalidity.
const fhrVector = () => {
  const record = readFixture('example.fhr.json');
  record.schema = 'https://w3id.org/fair-bioheaders/fhr/v0.6.0';
  record.schemaVersion = '2.1';
  record.documentation = '</script><script>alert(1)</script> & "quotes" \'x\' <img src=x onerror=alert(1)>';
  record.instrument = [
    'line\nbreak: injected',
    '  - leading dash sequence',
    '*anchor-ref',
    '&anchor definition',
    '!!python/object:evil.tag',
    '@reserved indicator',
    '`reserved backtick',
    'x\u202Eoverriding\u202B text\ufeff\u200b',
    'tab\there\u0007bel\u001bescape',
    'key: value # comment sigil'
  ];
  record.relatedLink = [
    'javascript:alert(1)',
    'data:text/html,%3Cscript%3Ealert(1)%3C%2Fscript%3E',
    "https://example.org/a&b%3Cc%3Ed%22e'f"
  ];
  record['x-site-builder'] = '</script><img src=x onerror=alert(1)>';
  return record;
};

// The RFC 3986 boundary the released toolkit enforces: the percent-encoded
// data: URL above is a valid URI (and renders as inert text); the raw
// angle-bracket form is NOT, and the site validator must reject it like the
// runtime does instead of emitting a record the toolkit would refuse.
const fhrUriRejection = () => {
  const record = fhrVector();
  record.relatedLink = ['data:text/html,<script>alert(1)</script>'];
  return record;
};

const fhpVector = () => {
  const record = readFixture('rich-database.fhp.json');
  // The U+2029 is deliberate: an unescaped line separator inside a double-
  // quoted scalar is the classic YAML line-splicing attack.
  record.proteome = 'UP000005640\u2029<a href="javascript:alert(1)">link</a>';
  record.relatedLink = [...(record.relatedLink || []), 'javascript:alert(document.domain)'];
  record['x-site-builder'] = { note: '\u202eRLO value', list: ['- injection', 'k: v'] };
  return record;
};

const report = {
  fixtures: [
    'example.fhr.json', 'extension-fields.fhr.yaml', 'rich-database.fhp.json', 'rich-mixed.fhp.yaml',
    'minimal-reference.fhgff3.json', 'rich.fhgff3.yaml', 'dotted-lineage.fhp.yaml'
  ].map((name) => build(name, readFixture(name))),
  vectors: [build('vector.fhr', fhrVector()), build('vector.fhp', fhpVector())],
  // Built through the same export path but EXPECTED to carry validation
  // errors; the Python test asserts the rejection, and export-blocking is the
  // browser wiring's job (covered by table-builder.spec.mjs).
  rejections: [build('reject.fhr.data-uri', fhrUriRejection())]
};
process.stdout.write(JSON.stringify(report));
