# FHT v0.7.0 browser activation preparation — Round 15

> Historical Round 15 evidence. Completed actions and former authorization below
> are dated receipts. Current Round 16 guidance requires human-only PR merges;
> this document grants no agent merge or deployment authority. Current support
> is documented in the README and public contract reference.

This branch implements normal FHT support against the actual published
fair-bioheaders 0.13.1 wheel, SHA-256
9f600347711ee771c8bc8f8e545438c255685736206b1342413b16076da20a45
(338797 bytes), from actual release tag
531d98ea742277b1ec391c646f2d32d94f520b56. A fresh noneditable install compared
all 65 payload files with both wheel and tag and validated 14 real browser exports
against seven byte-equal published JSON sources, with strict typed conversion
and independent HTML/YAML rereads. All BIOHEADERS gates and PYTHONPATH were unset
for normal FHT checks. Unknown versions and JSON-LD remained refusals.
All 14 downloads matched the displayed sources and edits disabled stale output.
These are local installed-release receipts, not Pages deployment evidence.

Current full CI, independent different-model review and actual Pages/live checks
remain before publication. Root owns merge/deployment and #15/#39 completion.
No FHGM model editor or downstream workflow integration is an extra gate.

## Published source

The shared v0.7.0 tag resolves to
623c79fe58edeb238a20fb6de518c62dd69b92bc (GitHub release452203176,
version DOI10.5281/zenodo.24385024). The release archive SHA-256 is
a65d9693361fd4348f6bc0ba69dd7a8ce1c7a8e24e7658625e6b7bc2f55141a7.
scripts/fht-candidate/provenance.json now names that immutable release and pins
117 source files: schema, seven JSON/FASTA/HTML triples,93 counterpart files,
their manifest, and the published version registry. Relative to the reviewed
prepublication closure, only the manifest and seven HTML annotations changed;
the schema digest remains
082b0790b7878940c4496c97d7485e32c65de8ba75ecc080e53f04fb44251a43.
The historical fht-candidate directory name is retained to make this deliberate
refresh reviewable. Old released caches and fixtures are not refreshed.

assets/schema/fht-v0.7.0.json is the exact published schema. Normal registry
selection admits shared raw-main, raw-tag v0.7.0 and fixed w3id v0.7.0 forms,
without substituting for unknown releases or owning-draft selectors. The writer
itemtype is the schema identity https://w3id.org/fair-bioheaders/fht/v0.7.0,
separate from the record-level selector.

## Prepared behavior

table-builder.js provides the normal29-field FHT form, separate visit-local
draft/extension state, schema validation, canonical checksum checks and C1
arithmetic. Complete BUSCO counts are summed with BigInt; partial counts stay
partial. Unsafe numeric values and input underflow are refused rather than
silently exported as rounded integers or zero. Metadata validity does not prove
file bytes, parent identity or biological derivation.

Exports preserve typed nested/ordered standard values. YAML retains extension
data; HTML omits extension keys under M5 and states that omission. Values remain
inert escaped text. JSON-LD is unsupported. fht-builder-candidate.js is now only
a compatibility adapter for the existing preparation harness; the public form
uses the normal builder and does not load that adapter.

## Reference promotion completed

The generated FHT schema-reference page/pins/notes and public guide now use
the actual published source. The previous owning snapshot/example and archived
notes/rendering retain exact historical bytes and fixed source links.

## Remaining website publication work

- Current full CI and independent different-model review after the factual support refresh.
- Root's authorized merge followed by actual Pages, live FHT form/export/safety
  verification and issue acceptance readback.

## Actual narrow exporter evidence

The same installed 0.13.1 environment ran the documented export-dcmi CLI twice
on the existing adopted FHR v0.4.0 source/context. All four bundle outputs were
byte-identical across runs, and both inputs were preserved exactly.
This does not change the curated website fixture, profile token, unlabelled
adoption record, target scope, deposit readiness or any biological claim.

## Historical toolkit preparation

The earlier 0.13.0 development wheels and preserved failed v0.13.0 tag remain
historical preparation evidence. The release guard stopped that vehicle before
GitHub Release, PyPI or GHCR publication. Actual final 0.13.1 artifacts are now published and verified as described above;
version strings, tags and locally built candidates alone were never that proof.
