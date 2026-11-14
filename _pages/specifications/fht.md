---
title: "FHT schema reference (Draft)"
permalink: /specifications/fht/
excerpt: "Draft field reference for the proposed FHT transcriptome header: schemaVersion 1.0 under development in FHT-Specification. Not released, no fixed alias, no toolkit support."
---

<div class="spec-notice spec-notice--draft" role="note">
  <p><strong>FHT is a draft.</strong> The transcriptome header contract below is the
  <em>development</em> model in
  <a href="https://github.com/FAIR-bioHeaders/FHT-Specification">FHT-Specification</a>:
  it has no shared specification release, no <code>schemaVersion</code> listed in the
  version registry, no fixed <code>w3id</code> alias, no DOI and no released tool
  support. Nothing on this page should be read as adopted guidance or as a citable
  version. The reference is published because the model is now concrete enough to
  review, and it is marked as a draft everywhere it appears. The opt-in
  <code>BIOHEADERS_EXPERIMENTAL_FHT</code> draft lane added in <code>fair-bioheaders</code>
  0.11.0 previews publication against a pinned draft copy; it is not FHT support, and it
  creates no release, alias or registry entry.</p>
</div>

FHT is the proposed FAIR-bioHeaders header for a **reference transcriptome FASTA
file**. Like the released types it is a `;~` YAML header block with one SHA-512/256
checksum over the file's exact bytes; unlike them it is not yet a contract that any
published file should cite.

## What the draft describes

The draft records how a transcript set was constructed — `de novo`, `genome-guided`
or `annotation-derived` — which organism and version it is, who asserts the metadata
and who assembled or extracted the set, which sample, library strategy and
strandedness were actually supplied, which run accessions support it, which reviewed
FAIR-bioHeaders parents it derives from, and what the producer measured about the
file and, separately, what one BUSCO run counted.

It does **not** describe, and the draft deliberately refuses:

- a construction history that is not known: there is no `mixed` or `unknown`
  `assemblyType`, and an uncertain case leaves the record incomplete rather than guessed;
- preparation contexts as biological classes: `total RNA` and `cDNA` are not
  `moleculeType` values, so a heterogeneous set omits the field;
- per-record expression, isoform structure or gene models;
- quality: BUSCO counts are one run's report about ortholog groups, not a verdict.

{% include schema/fht-reference.html %}

## Examples

The examples below come from the **development** repository and validate against its
draft schema. They are **synthetic**: names, statistics and sequence bytes are
invented; the taxon and ontology identifiers are real. They are not the byte-backed
conformance vectors, which are still open work in
[FHT-Specification#8](https://github.com/FAIR-bioHeaders/FHT-Specification/issues/8).

- [examples/de-novo.fht.json](https://github.com/FAIR-bioHeaders/FHT-Specification/blob/main/examples/de-novo.fht.json),
  with the same header as [YAML](https://github.com/FAIR-bioHeaders/FHT-Specification/blob/main/examples/de-novo.fht.yaml)
  and inside a headed [FASTA](https://github.com/FAIR-bioHeaders/FHT-Specification/blob/main/examples/de-novo.fht.fasta).
- [examples/genome-guided.fht.fasta](https://github.com/FAIR-bioHeaders/FHT-Specification/blob/main/examples/genome-guided.fht.fasta) —
  genome guidance, with the reasoning for why that alone is not a parent link.
- [examples/annotation-derived.fht.fasta](https://github.com/FAIR-bioHeaders/FHT-Specification/blob/main/examples/annotation-derived.fht.fasta) —
  sequences extracted from existing annotation.

The development README states the header shape directly; its checksum is computed by
the repository's own tests, never written by hand.

## Validation boundaries — for the draft

1. **Schema validity.** The draft JSON Schema checks required keys, types, patterns,
   enums, ranges, closed nested objects and the two allowed `derivedFrom` pairs:
   `FHT` + `filteredFrom` or `FHR` + `transcribedFrom`. It cannot establish that an
   asserted relationship is factually true—for example, that transcript bases were
   actually extracted from the named FHR genome.
2. **Checksum.** The shared family rules (R1–R4) define what an FHT checksum would
   cover, and the development repository recomputes its examples' checksums in tests.
   By default no released command writes or verifies one: `fair-bioheaders` 0.11.0 does
   both only when the operator opts in to its experimental draft lane
   (`BIOHEADERS_EXPERIMENTAL_FHT=1`), which reads the unreleased contract and reports
   `ExperimentalDraftWarning` (checked 2026-11-14).
3. **Parent links.** `derivedFrom` requires the parent's FHR-family checksum, so the
   intent is verifiable, and the lane described above does check it: with
   `BIOHEADERS_EXPERIMENTAL_FHT=1`, 0.11.0 reported `derivedFrom[0] FHR transcribedFrom:
   matched` against a supplied FHR parent file (checked 2026-11-14). With the default
   settings the same command reads the FHT file as FHR (rule V5) and refuses it, so no
   supported command performs that check on FHT today.
4. **Biology.** Transcript completeness, expression, isoform correctness and
   orthology are outside the header entirely.

## Status, dependencies and how the draft can change

- Model and generated contract: [FHT-Specification](https://github.com/FAIR-bioHeaders/FHT-Specification)
  (`fht_linkml.yml` is the source, `fht.json` is generated from it).
- Field decisions and the migration record:
  [docs/FHT-MIGRATION.md](https://github.com/FAIR-bioHeaders/FHT-Specification/blob/main/docs/FHT-MIGRATION.md),
  which maps the legacy `fht-v0.1` draft onto this contract and explains what is dropped.
  The retired `FHT-File-Converter` is not current support and its old examples are
  historical review inputs, not FHT 1.0 fixtures.
- Open release gates:
  [#8 examples and conformance vectors](https://github.com/FAIR-bioHeaders/FHT-Specification/issues/8),
  [#9 toolkit support](https://github.com/FAIR-bioHeaders/FHT-Specification/issues/9)
  and [#10 release, documentation and a public pilot](https://github.com/FAIR-bioHeaders/FHT-Specification/issues/10).
  Publication of the reviewed contract runs through the shared repository
  ([#107](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/107)).
- Independent metadata-coverage review against the INSDC minimum specifications, whose
  FHT rows are marked draft:
  [FAIR-bioHeaders-Specification#157](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/157).
- What is **not** implied by this page: a release, an alias, a DOI, toolkit support,
  builder support, INSDC submission readiness, or that the field set is final.

## Related guidance

- [Using FH*](/guide/) — the type table marks FHT as draft, exactly as this page does.
- [Resources & citation](/resources/) — repository roles and why a development
  repository is not a citation record.
- Shared format and versioning rules that the draft follows:
  [FORMAT.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FORMAT.md)
  and [SCHEMA-VERSIONS.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-VERSIONS.md).
- Discussion of the transcriptome contract belongs in
  [FHT-Specification](https://github.com/FAIR-bioHeaders/FHT-Specification/issues),
  not on this website.
