---
title: "FHT schema reference"
permalink: /specifications/fht/
excerpt: "Released FHT 1.0 transcriptome contract in shared v0.7.0: complete generated field reference, examples, provenance and validation boundaries."
---

FHT describes a **reference transcriptome FASTA file**. The shared specification
published contract version **"1.0"** in
[v0.7.0](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/releases/tag/v0.7.0)
on 2026-11-20, with version DOI
[10.5281/zenodo.24385024](https://doi.org/10.5281/zenodo.24385024).
The contract version, repository release and transcriptome resource version are
separate values.

This page uses the exact released schema at commit
[623c79fe58edeb238a20fb6de518c62dd69b92bc](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/623c79fe58edeb238a20fb6de518c62dd69b92bc).
Contract publication does not automatically update an installed toolkit.
Acceptance of the actual final fair-bioheaders 0.13.0 artifact is still pending;
a development wheel carrying that version is not a release. The browser form is
prepared against these published bytes, with activation gated on that installed
runtime evidence, current review/CI and actual Pages verification.
{: .release-source}

## What FHT describes

The record identifies the transcriptome and its construction history:
de novo, genome-guided or annotation-derived. It keeps metadata authors,
assembly or extraction attribution, supplied sample/library context, parent-file
assertions, file statistics and one BUSCO run's counts distinct.

Optional moleculeType admits mRNA, rRNA, tRNA, transcribed RNA or mixed.
That last value describes heterogeneous molecules, not a mixed construction
history. Total RNA and cDNA describe preparation, not molecule classes.
Unknown context is omitted rather than inferred.

The header does not describe per-record expression, isoform or gene-model
structure, or certify biological quality. Sample remains an array; repeated
partial entries preserve supplied pooled-source context.

{% include schema/fht-reference.html %}

## Published examples and conformance

Seven synthetic publication examples have paired JSON, headed FASTA and typed
HTML forms at the released tag. Names, statistics and sequence bytes are
invented; taxon and ontology identifiers are real.

- **de-novo** — [JSON](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/de-novo.fht.json), [FASTA](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/de-novo.fht.fasta), [HTML](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/de-novo.fht.html).
- **genome-guided** — [JSON](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/genome-guided.fht.json), [FASTA](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/genome-guided.fht.fasta), [HTML](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/genome-guided.fht.html).
- **annotation-derived** — [JSON](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/annotation-derived.fht.json), [FASTA](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/annotation-derived.fht.fasta), [HTML](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/annotation-derived.fht.html).
- **minimal-de-novo** — [JSON](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-de-novo.fht.json), [FASTA](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-de-novo.fht.fasta), [HTML](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-de-novo.fht.html).
- **minimal-genome-guided** — [JSON](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-genome-guided.fht.json), [FASTA](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-genome-guided.fht.fasta), [HTML](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-genome-guided.fht.html).
- **minimal-annotation-derived** — [JSON](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-annotation-derived.fht.json), [FASTA](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-annotation-derived.fht.fasta), [HTML](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/minimal-annotation-derived.fht.html).
- **mixed-molecules** — [JSON](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/mixed-molecules.fht.json), [FASTA](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/mixed-molecules.fht.fasta), [HTML](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/examples/fht/mixed-molecules.fht.html).

The [93-counterpart manifest](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/conformance/fht-v0.7.0/manifest.json)
covers released positive and negative carriers. Byte-backed conformance includes
checksum, parent and compressed-file behavior beyond this field reference.
Typed HTML follows the [F1 binding](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/docs/FHT-MICRODATA.md);
its itemtype is the published schema identity, separate from a record's selector.
FHT JSON-LD remains unsupported.

## Validation boundaries

1. **Schema validity.** The published JSON Schema checks requiredness, types, nonblank
   values, enums, ranges, non-empty/unique arrays and closed objects. Required
   metadata authors must contain a name. The root schema selector admits the
   shared raw-main, v0.7.0 raw-tag and fixed w3id forms; owning-draft selectors
   are a separate historical lane, and unknown releases never fall back.
2. **Runtime policy.** C1 requires the four BUSCO component counts to sum
   exactly to total when all five are supplied. This arithmetic is outside
   standard JSON Schema. Counts are not inferred, and browser numeric capability
   limits are not new biological constraints.
3. **File and parent identity.** Shared checksum rules R1–R4 cover exact bytes,
   excluding the root checksum line. DerivedFrom permits FHT + filteredFrom or
   FHR + transcribedFrom; canonical checksums, file verification and a matching
   parent are separate checks. Genome guidance alone never establishes that
   transcript bases came from that genome.
4. **Biology.** Neither valid metadata nor matching parent-file identity proves
   biological derivation, expression, completeness or repository acceptance.

## Owning history and publication authority

The [owning development repository](https://github.com/FAIR-bioHeaders/FHT-Specification)
retains field decisions and migration history. Its
[earlier pinned draft](https://github.com/FAIR-bioHeaders/FHT-Specification/blob/226f923c28b680edb3c546e99a751482d06aef1a/fht.json),
the legacy numeric-version draft and retired converter examples are historical
inputs, not the published contract. This site's old draft schema, example,
notes and rendered reference are retained byte-exact in its snapshot history;
the field inventory above now uses the shared released authority.

Do not silently rewrite existing citations or headers. Header changes require
checksum recomputation and can affect downstream parent links. A stable schema
identifier does not itself prove network resolution; the
[raw-tag schema](https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/v0.7.0/fht.json)
provides the immutable published bytes.

## Related guidance

- [Using FH*](/guide/) — choose a header and distinguish contract from runtime support.
- [Table builder](/table-builder/) — prepared metadata form and inert typed exports.
- [Resources & citation](/resources/) — publication and development roles.
- [Format rules](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/docs/FORMAT.md)
  and [version selection](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.7.0/docs/SCHEMA-VERSIONS.md).
