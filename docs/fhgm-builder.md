# Native FHGM record builder

`/fhgm-builder/` is separate from the four-type file-header builder. It supports
all fields in the published native model0.1 schema, pinned byte-for-byte from
shared v0.8.0. `assets/schema/fhgm-0.1.provenance.json` records source identity,
retrieval and measured digests. Runtime checks the local schema's SHA-256 before
enabling the form. No user-supplied URL is fetched, no data uploaded or persisted.

The editor validates record structure, then exports one JSON/YAML record, an
escaped readable HTML table without FHGM microdata, and a YAML
`x-fhgm-models: [record]` insertion snippet. It never edits an annotation or
computes a file checksum. Appending to existing models and regenerating the
whole-file checksum remain explicit downstream operations.

The existing browser schema validator is reused, with `minProperties` support
for populated native methods/publication objects. Native-only pattern adaptation
matches the owning Python whitespace class rather than JavaScript's different
`\s`/`\S` classes; frozen schema bytes stay unchanged. Source descriptions that
say draft are owning history, not the current publication state. This is pinned
schema coverage, not general JSON Schema support or agreement with all92 layered
FHGM vectors. K1/K3–K6/B1, carrier/reference agreement, feature resolution,
predecessor lookup, integrity and biology are not run by this form.

Requiredness, object members, enums and scalar/array/object shape come from the
schema. Optional objects are explicitly included; arrays have add/remove controls,
keep their order and are omitted when unused. Text is preserved without trimming
or version coercion. Consumer limits:100entries per array and1MiB per record. Text is never silently
truncated; an oversized record is refused with its entered values preserved. No checksum or SeqCol identity is inferred. Errors focus
the relevant control; edits clear stale sources/previews and disable downloads.

Validation: Node producer/refusal/round-trip tests, Python jsonschema4.26.0
(with the format extra, explicitly installed in CI and documented setup) reference-validator
parity on site-authored structural cases, full existing site regressions, and
Playwright form/accessibility tests. These cases are not upstream conformance
vectors. New public routes are in source and deployment sitemap allowlists.
