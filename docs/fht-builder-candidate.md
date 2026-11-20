# FHT v0.7.0 browser activation preparation — Round 15

This branch prepares normal FHT support; it is not yet the deployed website.
Do not merge or publish until the final released fair-bioheaders 0.13.0 artifact
has been installed, verified and exercised against these exact exports, then
current independent different-model review and full CI pass. No FHGM publication
condition is added. Website #15/#39 stay open until actual Pages/live receipts.

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

## Remaining final publication work

- Promote the generated FHT schema-reference page/pins/notes and public guide
  status from their historical owning-draft snapshot to this published source.
  Those existing historical bytes have deliberately not been overwritten here.
- Install and verify the actual published final toolkit artifact, then re-run
  the seven JSON/FASTA/HTML interoperability pairs and exact exported HTML/YAML
  equality; a locally built0.13.0 candidate is not that release.
- Run the full final site/browser suite and obtain current-head independent
  review after the documentation promotion, then recheck findings/base/dependencies.
- Merge only after all gates pass, await actual Pages, test the live form/exports,
  and close #15/#39 only if the complete accepted scope is met.
