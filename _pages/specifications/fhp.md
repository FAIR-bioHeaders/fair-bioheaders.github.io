---
title: "FHP schema reference"
permalink: /specifications/fhp/
excerpt: "Complete field reference for the FHP protein FASTA header: schemaVersion 1.2, released in FAIR-bioHeaders-Specification v0.6.0, with types, constraints, units, examples and compatibility notes."
---

FHP is the FAIR-bioHeaders header for a **protein FASTA file**: a predicted proteome,
a set taken from a protein database, or a curated set that combines both. It brings
the FHR mechanism to proteins — a `;~` YAML header block, one SHA-512/256 checksum
over the exact file bytes, a small required set and everything else optional — and
adds the slots that proteins need: where the sequences came from, which translation
table and isoform policy applies, and which genome or annotation they were translated
from.

This page is the field reference, generated from the published schema. For the
narrative guide, see [Using FH*](/guide/).

## What FHP describes

An FHP header answers: which protein set this is, of which organism, which version,
who asserts it, when it was created, whether it was predicted or taken from a
database or both, which sources or parent files it draws on, which software and
protocol produced the models or translations, how many sequences, genes and residues
the producer counts, what one BUSCO run measured, and which exact bytes the record
belongs to.

It does **not** describe:

- the sequences themselves: no per-record annotation, no per-residue data;
- the underlying genome assembly — that is [FHR](/specifications/fhr/), linked by
  checksum through `derivedFrom` when the genome file carries its own header;
- transcript sets ([FHT](/specifications/fht/), still a draft) or annotations
  ([FHGFF3](/specifications/fhgff3/));
- quality: FHP records **asserted provenance**, and is not a quality-control report.

{% include schema/fhp-reference.html %}

## Examples

All four records are **synthetic**: names, checksums and counts are placeholders.
Copy the shape, never the values.

- [minimal-predicted.fhp.json](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhp/minimal-predicted.fhp.json),
  [minimal-database.fhp.json](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhp/minimal-database.fhp.json)
  and [minimal-mixed.fhp.json](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhp/minimal-mixed.fhp.json) —
  the required set, one per `sourceType`.
- [rich-database.fhp.json](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhp/rich-database.fhp.json) —
  sources, sequence counts and a BUSCO report; the protein and gene counts and the
  BUSCO values are UniProt's published figures for that proteome, not recomputed.
- [rich-predicted.fhp.yaml](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhp/rich-predicted.fhp.yaml)
  and [rich-mixed.fhp.yaml](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhp/rich-mixed.fhp.yaml) —
  parent links, translation table, isoform policy and prediction software.
- [examples/fhp/example.fhp.fasta](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/examples/fhp/example.fhp.fasta)
  shows the header inside a real file.
- The [conformance vectors](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/main/conformance)
  carry the byte-backed valid and invalid cases, format `fhp-fasta`.

The microdata binding for FHP is documented in
[FHP-MICRODATA.md](https://github.com/FAIR-bioHeaders/FHP-Specification/blob/main/docs/FHP-MICRODATA.md);
it uses the FHP itemtype, never the FHR one.

## Validation boundaries

1. **Schema validity.** Required keys, types, patterns, enums and the closed nested
   objects, plus `x-` extension keys from 1.1. From 1.2 the `completeness.lineageDataset`
   pattern also accepts dotted dataset versions such as `enterobacterales_odb12.2`.
   The structural check does not know whether `proteome` names anything real.
2. **File checksum verification.** `bioheaders verify` recomputes SHA-512/256 over
   the exact bytes of the protein FASTA, excluding the root `;~checksum:` line.
   Header handling is alphabet-independent: stops (`*`), U, O, B, Z, J, X, lower case
   and gaps are ordinary bytes, hashed and preserved exactly. Any re-write —
   re-wrapping, re-sorting, adding or stripping sequences — is a different file and
   needs a recomputed checksum.
3. **Parent-link verification.** `derivedFrom` items name parents by their own
   checksum; `bioheaders verify-links proteins.fhp.fasta genome.fhr.fasta ...`
   recomputes each candidate's checksum and reports `matched`, `not matched` or
   `not checked`. A match confirms file identity — never that the translation was
   correct. `source[]` and `source[].assemblyAccession` are producer assertions and
   are deliberately **not** verified.
4. **Sequence and biological validation.** Nothing in this contract checks ORFs,
   signal peptides, contaminant sequences, duplicate identifiers or BUSCO itself.
   `completeness` is what one named run reported; BUSCO counts describe ortholog
   groups, not sequences or genes, and are not a quality cutoff.

## Related guidance

- [Using FH*](/guide/) and the [family overview](/specifications/).
- [Table builder](/table-builder/) — builds and structurally validates FHP records
  against its documented v0.4.0 snapshot (`schemaVersion` 1.0); support for the
  current release is tracked in
  [issue #15](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues/15).
- [Resources & citation](/resources/) for repositories and citation records.
- [docs/FHP.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FHP.md),
  the [FORMAT rules](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FORMAT.md)
  and [SCHEMA-VERSIONS.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-VERSIONS.md).
- [FAIR-bioHeaders-Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools)
  implements reading, writing, checksums and parent checks.
- Propose FHP field changes in [FHP-Specification](https://github.com/FAIR-bioHeaders/FHP-Specification);
  released contracts are published through
  [FAIR-bioHeaders-Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification).
