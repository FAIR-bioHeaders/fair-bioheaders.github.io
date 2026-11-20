# Unpublished FHT browser preparation — Round 15

This is an explicitly opt-in **candidate**, not a release cache or website
support claim. The public `/table-builder/` keeps FHT disabled, does not load
`fht-builder-candidate.js`, and its release registry/defaults are unchanged.
Actual shared v0.7.0 publication and a named published supported runtime must
precede deliberate form activation and released-cache provenance.

## Exact reviewed input

`scripts/fht-candidate/provenance.json` pins shared commit
`1a0792e6f8db1b73959999d30f5e6575b982cbfc` (merged #281), schema SHA-256
`082b0790b7878940c4496c97d7485e32c65de8ba75ecc080e53f04fb44251a43`.
Its 116 unchanged files contain that schema, seven publication JSON/FASTA/HTML
triples and all 93 release-counterpart vectors plus their manifest. These are
unpublished publication test artifacts, not supported citations for new data.
No older cache, snapshot digest, fixture byte or vector ID is rewritten.

The F1 writer identity is the reviewed schema `$id`,
`https://w3id.org/fair-bioheaders/fht/v0.7.0`, matching all seven supplied HTML
examples. Record-level schema selectors remain separate: this candidate accepts
only shared raw-main, shared v0.7.0 raw tag and the v0.7.0 w3id forms. Owning
raw-main remains a distinct draft lane; unknown releases and the old FHR repo's
nonexistent FHT identity are refused, with no fallback. The regular released
builder still recognizes none of these FHT candidate selectors.

## Staged implementation

`assets/js/fht-builder-candidate.js` requires `{candidate: true}` for selection,
validation, profile construction and export. It provides the 29-field form
profile with requiredness/types/constraints supplied by the reviewed schema;
it does not mount or enable a public form. Shared pure YAML/typed-value helpers
are reused. The ordinary browser validator now implements `minItems` and
structural `uniqueItems`, including duplicate parent objects with reordered
keys, without changing schema bytes. Existing released-type tests remain green.

C1 arithmetic is separate from JSON Schema: only a fully supplied safe-integer
component set is summed, using BigInt so the sum cannot silently round. Partial
counts remain partial, not zero-filled. Canonical standard checksums, nested
parents and schema selection remain distinct from actual file verification.
Unsafe numeric values are reported as **browser capability limits**, not newly
invalid biological records; no precision loss is accepted silently.

Candidate HTML has one FHT scope, typed ordered/nested values and a readable
text-only table; all metadata is escaped. A fixed controlled stylesheet keeps
whitespace readable and never interpolates values or remote URLs. Scripts,
links, uploads, persistence, remote URL resolution and user-controlled styles
are absent. YAML preserves extension data; M5 omissions are named in HTML.
JSON-LD remains explicitly unsupported. Candidate output labels itself
unpublished and does not claim checksum, parent or biological proof.

## Measured checks

- 14 Node candidate tests: exact source pins, 93-vector inventory, all seven
  pairs, all 29 form fields, selector refusal, both bad/equal/partial BUSCO sums,
  large exact summation, duplicate/canonical parents, hostile text, zero/false,
  extensions, unsafe-number refusal and no default/UI enablement.
- All 34 valid counterpart records passed metadata-only schema/semantic checks.
  This is **not** FASTA/gzip/checksum verification; file-level rejection vectors
  are preserved as source bytes, not relabeled as browser parser tests.
- Independent Python YAML and typed HTML structural re-reading matched all seven
  records including scalar types and array/object order. 137 Python site tests
  and 70 existing Node builder tests passed, zero skips.
- Real DOM extraction of all seven outputs, controlled/inert markup and public
  FHT-disabled assertions pass in Chromium desktop/320px, Firefox desktop and
  WebKit desktop. This does not claim enabled-form lifecycle/accessibility
  coverage; those checks follow actual publication and activation.
- Pinned frozen production Jekyll build, site checker (24 pages/18 sitemap URLs),
  deterministic JS bundle and whitespace checks passed.

Installed candidate toolkit interoperability is recorded separately when its
concrete wheel is available; a development version string alone is not proof of
published support. Root coordinates actual publication, precise published
artifact/runtime pins and the final active-form browser/download/lifecycle
matrix. No proposed DOI or alias is described as live.
