---
title: "Header type specifications"
permalink: /specifications/
excerpt: "Field-by-field reference for the FAIR-bioHeaders header types: FHR for reference genomes, FHT for transcriptomes (draft), FHP for protein FASTA and FHGFF3 for GFF3 annotations."
---

One page per FAIR-bioHeaders header type, each with the complete field reference
for its contract: every field and nested object, whether it is required, its JSON
type, its format, pattern, enum or range, its cardinality, its units, an example and
the compatibility notes that matter. The normative schemas stay in
[FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification);
these pages are generated from the published schema bytes and link back to them.

{% include nature-panel.html key="turtle-shell" %}

## The four pages

| Type | Resource | Contract and status |
| --- | --- | --- |
| [FHR](/specifications/fhr/) | Reference genome (FASTA, GFA) | `schemaVersion` "2.1", released in shared v0.5.0 |
| [FHT](/specifications/fht/) | Transcriptome (FASTA) | `schemaVersion` "1.0" proposed — **draft, not released** |
| [FHP](/specifications/fhp/) | Protein set (FASTA) | `schemaVersion` "1.1", released in shared v0.5.0 |
| [FHGFF3](/specifications/fhgff3/) | GFF3 annotation | `schemaVersion` "1.1", released in shared v0.5.0 |

A header type is chosen by the data the file holds, not by taste. Schema versions
are per type: `schemaVersion`, the shared release tag and the version of the
biological resource are three different numbers, explained in
[schema versions and selection](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-VERSIONS.md).

## Reading these pages

Each page covers the same ground in the same order: what the header describes and
does not, contract status, schema location, the complete field reference, the rules
that no single field can express, examples, validation boundaries and related
guidance.

Three points hold for the whole family:

- **The record is a closed object.** An unknown top-level key is invalid — with one
  exception from shared release v0.5.0: keys that start with `x-` are extension
  fields (rule R15), accepted in FHR 2.1, FHP 1.1 and FHGFF3 1.1 and in the FHT
  draft. Nested objects stay closed, and an extension never overrides a standard field.
- **`required` is presence, not substance.** `genome: ""`, `taxon: {}` or
  `metadataAuthor: []` pass the released schemas while describing nothing; conforming
  values are non-empty, and validators report that rather than rejecting it.
- **One `schema` value, one contract.** A record names the schema it follows; readers
  select that schema and never substitute another. Cite the versioned URL of the release
  you target, not a moving development URL.

## Where the authority lies

These pages are generated from byte-pinned copies of the published schemas and are
re-checked against them in CI, but they are not the authority. The authoritative
artifacts are:

- [Released schemas](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification)
  and the [schema-version registry](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/schemas/versions.json);
- the [format rules R1–R15](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FORMAT.md),
  which define the header block, the checksum and the extension fields;
- the [FAIR-bioHeaders Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools)
  package (`fair-bioheaders` on PyPI) that implements them.

Propose a field or contract change in the type's development repository or in the
shared specification repository, never here: see
[Resources & citation](/resources/) for which repository owns what, and
[Using FH*](/guide/) for choosing and writing a header.
