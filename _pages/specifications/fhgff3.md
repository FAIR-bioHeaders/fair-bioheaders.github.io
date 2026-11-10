---
title: "FHGFF3 schema reference"
permalink: /specifications/fhgff3/
excerpt: "Complete field reference for the FHGFF3 GFF3 annotation header: schemaVersion 1.1, released in FAIR-bioHeaders-Specification v0.5.0, with types, constraints, units, examples and compatibility notes."
---

FHGFF3 is the FAIR-bioHeaders header for a **GFF3 annotation file**. It adds `#~`
YAML lines after the `##gff-version 3` line and one SHA-512/256 checksum over the
file's exact bytes, and it records which genome the coordinates refer to and how the
annotation was made.

This page is the field reference, generated from the published schema. For the
narrative guide, see [Using FH*](/guide/).

## What FHGFF3 describes

An FHGFF3 header answers: which annotation this is, of which organism, which version,
who asserts it, when, **which genome its coordinates are for**, how the annotation was
produced, what non-FAIR-bioHeaders sources it drew on, how many features of each type
the producer counts, which Sequence Ontology release the feature types follow, what
one BUSCO run measured, and which exact bytes the record belongs to.

It does **not** describe, and never claims:

- that the features are valid. A header never makes a GFF3 file's contents correct,
  and a GFF3 file without a header is still plain, valid GFF3;
- sequence, structure or ontology correctness — feature and Sequence Ontology
  validation belongs to the
  [gff3-validator](https://github.com/FAIR-bioHeaders/gff3-validator), which keeps
  header findings and feature findings separate;
- the proteins themselves ([FHP](/specifications/fhp/)) or the assembly
  ([FHR](/specifications/fhr/)), each with its own header and checksum.

{% include schema/fhgff3-reference.html %}

## Examples

Both records are **synthetic**: names, checksums, counts and accessions are
placeholders. Copy the shape, never the values.

- [examples/fhgff3/minimal-reference.fhgff3.json](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/minimal-reference.fhgff3.json) —
  the smallest record that satisfies the genome-link rule, using a `genomeReference`
  (assembly accession plus SeqCol digest) with no FHR parent file.
- [examples/fhgff3/rich.fhgff3.yaml](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/rich.fhgff3.yaml) —
  every optional field: both genome-link forms, software, protocol, SO release,
  feature counts, sources and a BUSCO report.
- In-file headers: [annotation.fhgff3.gff3](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/annotation.fhgff3.gff3)
  and [embedded-fasta.fhgff3.gff3](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/embedded-fasta.fhgff3.gff3),
  next to the [FHR genome they link to](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/genome.fhr.fasta).
  [no-header.gff3](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/no-header.gff3),
  [header-invalid.fhgff3.gff3](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/header-invalid.fhgff3.gff3)
  and [stale-parent.fhgff3.gff3](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhgff3/stale-parent.fhgff3.gff3)
  show the negative and stale cases.
- The [conformance vectors](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/main/conformance)
  are the byte-backed valid and rejection fixtures, format `fhgff3`.

## Validation boundaries

Four questions, four tools, four separate answers.

1. **Schema validity.** Required keys, types, patterns and the closed nested objects,
   and FHGFF3's conditional genome rule: `genomeReference`, or a `derivedFrom` item
   with `headerType` FHR and `relationship` `annotates` — at most one, and it must be
   FHR. This says nothing about the features.
2. **File checksum verification.** `bioheaders verify` recomputes SHA-512/256 over
   every byte of the GFF3 — directives, features and any `##FASTA` section — except
   the root `#~checksum:` line. Because the coverage is the whole file, any tool that
   sorts or tidies the GFF3 (for example `gt gff3 -sort -tidy`) breaks the copied
   header's checksum, and nothing repairs it silently.
3. **Parent-link verification.** `bioheaders verify-links annotation.fhgff3.gff3 genome.fhr.fasta`
   checks each recorded parent against candidate files and reports `matched`,
   `not matched` or `not checked`; `stale-parent.fhgff3.gff3` is the case where the
   annotation names a genome file whose bytes have since changed. For a
   `genomeReference`, `verify-links` can compare its recorded SeqCol digest with the
   digest recorded in a supplied FHR genome header. It does not compute SeqCol or
   resolve the accession; the producer's identity assertion is still not biological
   verification (requirement FR-006).
4. **Feature, ontology and biological validation.** Columns, types, parent/child
   coherence, Sequence Ontology terms and biological plausibility belong to the
   [gff3-validator](https://github.com/FAIR-bioHeaders/gff3-validator). Its header
   checks (rules HDR-001 onward) and its feature findings are reported separately:
   **a valid header never implies valid features**, and valid features do not make a
   header's provenance true.

## Related guidance

- [Using FH*](/guide/) and the [family overview](/specifications/).
- [Table builder](/table-builder/) — builds and structurally validates FHGFF3 records
  against its documented v0.4.0 snapshot (`schemaVersion` 1.0). Its HTML export is a
  readable table only: there is no FHGFF3 microdata yet, so download the YAML to keep
  the structured record. v0.5.0 support is tracked in
  [issue #15](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues/15).
- [docs/FHGFF3.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FHGFF3.md)
  for header placement in GFF3, plus
  [FORMAT.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FORMAT.md)
  and [SCHEMA-VERSIONS.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-VERSIONS.md).
- [gff3-validator](https://github.com/FAIR-bioHeaders/gff3-validator) — feature,
  ontology and (optionally) header checks. Header checking runs through the
  `fair-bioheaders` version it depends on: the published 0.1.0 release pins an older
  toolkit, so it reports a v0.5.0 header as an unsupported schema version (HDR-007)
  instead of checking it against FHGFF3 1.1. Feature validation is unaffected, and no
  validator may substitute a different schema for a version it does not have.
- [FAIR-bioHeaders-Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools) —
  `combine`, `verify`, `verify-links`, `strip` and `assess` for GFF3.
- Propose FHGFF3 field changes in [FHGFF3](https://github.com/FAIR-bioHeaders/FHGFF3);
  released contracts are published through
  [FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification).
