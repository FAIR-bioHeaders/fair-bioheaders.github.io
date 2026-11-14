---
title: "FHR schema reference"
permalink: /specifications/fhr/
excerpt: "Complete field reference for the FHR reference-genome header: schemaVersion 2.1, unchanged in FAIR-bioHeaders-Specification v0.6.0, with types, constraints, units, examples and compatibility notes."
---

FHR is the FAIR-bioHeaders header for a **reference genome assembly**. It is the
original type of the family, described in the 2024 paper in
*Briefings in Bioinformatics* ([doi:10.1093/bib/bbae122](https://doi.org/10.1093/bib/bbae122)),
and it is the type the genome files of other header types link to.

This page is the field reference: every field of the contract, its type, its
constraints and its units, with an example and the compatibility notes that matter
when you write or read a header. It is generated from the published schema, so it
cannot quietly fall behind the contract. For the narrative guide, see
[Using FH*](/guide/).

## What FHR describes

An FHR header answers, close to the data itself: which assembly this is, of which
organism, which version, who assembled it, who wrote the metadata, when, on what
instruments and with which software, how it is masked, how big and how contiguous it
is, under what conditions it may be reused, and which exact bytes the record belongs
to.

It does **not** describe:

- individual sequences, scaffolds or contigs — FHR describes the file as one resource;
- annotation — that is [FHGFF3](/specifications/fhgff3/), and proteins are
  [FHP](/specifications/fhp/);
- sequence correctness or biological quality — FHR records what the producer asserts;
- a parent link: FHR is the root of the family's parent chain and has no `derivedFrom`
  slot. FHP, FHT and FHGFF3 link *to* genomes, not the other way round.

{% include schema/fhr-reference.html %}

## Examples

Both records are **synthetic**: the names, statistics and sequence bytes are invented
and the identifiers are placeholders, so copy the shape, never the values.

- [examples/minimal.fhr.json](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/minimal.fhr.json) —
  the ten required fields and nothing else (current shared release v0.6.0,
  `schemaVersion` "2.1" — the FHR contract is byte-identical to v0.5.0's).
- [examples/example.fhr.json](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/example.fhr.json) —
  a full record with authors, accessions, statistics and software.
- [examples/extension-fields.fhr.yaml](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/extension-fields.fhr.yaml) —
  the `x-` extension fields added in 2.1, including nested and array values.
- The same record as a headed file: [examples/example.fhr.fasta](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/example.fhr.fasta)
  and [examples/example.fhr.gfa](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/example.fhr.gfa),
  plus [JSON-LD](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/example.fhr.jsonld)
  and [microdata](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/example.microdata.fhr.html)
  forms.
- The [conformance vectors](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/main/conformance)
  are the byte-backed valid and invalid files behind the format rules, including the
  extension-field cases.

To write a real header, supply your own values and let `bioheaders combine` compute
the checksum: a hand-written or copied checksum never verifies.

## Validation boundaries

Four different questions get four different answers. Do not merge them.

1. **Schema validity.** Does the parsed record satisfy `fhr.json`? Required keys,
   types, patterns, enums, ranges and closed objects — and, from 2.1, the `x-`
   extension keys. This says nothing about whether the values are true or the file
   intact. On this site, the [table builder](/table-builder/) performs structural
   validation against its documented v0.4.0 snapshot.
2. **File checksum verification.** `bioheaders verify` recomputes SHA-512/256 over
   the exact bytes of the FASTA or GFA, excluding the root `;~checksum:` or
   `#~checksum:` line, and compares it with the header's `checksum`. It proves the
   metadata and the sequence bytes still belong together. It is not authentication,
   and it does not detect a wrong taxon name or a fabricated author.
3. **Parent-link verification.** FHR records no parents, so there is nothing to
   verify at this level for FHR itself. `bioheaders verify-links` belongs to the
   types that do: an FHGFF3 annotation or FHP/FHT set that names an FHR genome. What
   `seqcol_id` records for FHR is a user-supplied identifier that a *child* file may
   later be checked against; FHR neither computes nor resolves it.
4. **Biological and data-quality review.** Assembling, polishing, contamination
   screening and BUSCO assessment are outside the header. `vitalStats` and
   `completeness` are producer assertions that no validator recomputes.

A file can therefore be schema-valid and checksum-verified while still stating
something false. The header makes that claim identifiable and durable, not correct.

## Related guidance

- [Using FH*](/guide/) — choosing a header type and a supported workflow.
- [Table builder](/table-builder/) — build and structurally validate FHR metadata in
  the browser (v0.4.0 snapshot; support for the current release is tracked in
  [issue #15](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues/15)).
- [Metadata viewer](/metadata-viewer/) — read FHR JSON and microdata, with the
  JavaScript integration guide.
- [Resources & citation](/resources/) — repositories, releases and citation records.
- Format and versioning:
  [FORMAT.md rules R1–R15](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FORMAT.md),
  [SCHEMA-VERSIONS.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-VERSIONS.md),
  [SCHEMA-CHANGES-v0.4.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-CHANGES-v0.4.md),
  [tool compatibility](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/TOOL_COMPATIBILITY.md),
  [JSON-LD](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/JSONLD.md)
  and [microdata](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/MICRODATA.md).
- Toolkit: [FAIR-bioHeaders-Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools)
  (`fair-bioheaders`, command `bioheaders`).
- Propose FHR field changes in [FHR-Specification](https://github.com/FAIR-bioHeaders/FHR-Specification);
  shared publication runs through
  [FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification).
