---
title: "Header type specifications"
permalink: /specifications/
excerpt: "Field-by-field reference for the FAIR-bioHeaders header types: FHR for reference genomes, FHT for transcriptomes, FHP for protein FASTA and FHGFF3 for GFF3 annotations, plus a draft overview of FHGM gene model records."
---

One page per FAIR-bioHeaders header type, each with the complete field reference
for its contract: every field and nested object, whether it is required, its JSON
type, its format, pattern, enum or range, its cardinality, its units, an example and
the compatibility notes that matter. The normative schemas stay in
[FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification);
these pages are generated from the published schema bytes and link back to them.
The draft FHGM proposal, which has no contract to reference yet, is the exception:
it gets a [draft overview](/specifications/fhgm/) instead of a generated inventory.

{% include nature-panel.html key="turtle-shell" %}

## The four field references

| Type | Resource | Contract and status |
| --- | --- | --- |
| [FHR](/specifications/fhr/) | Reference genome (FASTA, GFA) | `schemaVersion` "2.1"; pinned shared release v0.6.0 re-publishes the 2.1 bytes unchanged |
| [FHT](/specifications/fht/) | Transcriptome (FASTA) | `schemaVersion` "1.0", released in shared v0.7.0 |
| [FHP](/specifications/fhp/) | Protein set (FASTA) | `schemaVersion` "1.2", released in shared v0.6.0 |
| [FHGFF3](/specifications/fhgff3/) | GFF3 annotation | `schemaVersion` "1.2", released in shared v0.6.0 |

The table lists the four types that have a documented header contract, released or
released. A fifth draft,
[FHGM — gene model records](/specifications/fhgm/), is deliberately outside the
table: it describes model records *inside* FHGFF3 annotations rather than a file
header a file chooses instead of these four, and it has **no released native contract** —
no `schemaVersion`, no fixed alias, no registry entry and no field inventory.
Its draft page links the authoritative overview in the shared specification.

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
  exception, introduced in shared release v0.5.0: keys that start with `x-` are extension
  fields (rule R15), accepted in FHR 2.1, FHP 1.1 and later, FHGFF3 1.1 and later and in
  FHT 1.0. Nested objects stay closed, and an extension never overrides a standard
  field.
- **Requiredness and substance differ by contract.** Empty genome names or taxon
  objects can pass some contracts while describing nothing. FHT 1.0 explicitly
  requires nonblank transcriptome/version/dateCreated and at least one named
  metadata author. Read each type's actual constraints.
- **One `schema` value, one contract.** A record names the schema it follows; readers
  select that schema and never substitute another. Cite the versioned URL of the release
  you target, not a moving development URL.

## Mappings and citation profiles

The field tables above describe the contracts. How FHR root fields relate to qualified
Dublin Core — with each field's condition, transformation and stated loss, and the
supplemental export context a descriptive export needs — is on the
[metadata mappings reference](/mappings/). That page renders the adopted mapping v1
surface from pinned upstream bytes; it publishes no exporter, claims no deposit readiness,
and inherits v1's withheld "official" label exactly as recorded upstream.

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
