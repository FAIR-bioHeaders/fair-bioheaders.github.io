---
title: "FHGM gene model records (Draft)"
permalink: /specifications/fhgm/
excerpt: "Draft overview of FHGM (FAIR Header Gene Model): model-level records for gene-model contributions, piloted as x- extension records inside FHGFF3 annotations. No contract, no schemaVersion, no fixed alias, no toolkit, validator or builder support."
---

<div class="spec-notice spec-notice--draft" role="note">
  <p><strong>FHGM is a draft proposal, not a contract.</strong> There is no
  released JSON Schema or LinkML model for FHGM, no <code>schemaVersion</code>
  value, no fixed <code>w3id</code> alias and no entry in the version registry
  <a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/schemas/versions.json"><code>schemas/versions.json</code></a>,
  which lists released contracts only. No toolkit, validator or builder support
  is claimed: <code>bioheaders</code>, the
  <a href="https://github.com/FAIR-bioHeaders/gff3-validator">gff3-validator</a>
  and the <a href="/table-builder/">table builder</a> do not process FHGM
  records. This page also carries <strong>no field inventory</strong> — there
  is no contract to inventory; the candidate fields are review input, not
  adopted names (see below). The authoritative draft overview is
  <a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FHGM.md">docs/FHGM.md</a>
  in the shared specification repository; this page summarizes it and nothing
  here is a release statement.</p>
</div>

FHGM (FAIR Header Gene Model) is the working name for file-bound metadata that
describes a **gene-model contribution** — a new or revised model — with enough
information to identify its reference assembly, contributors, evidence, methods
and publication context, so that the model stays interpretable when its file is
downloaded apart from the article or repository that announced it. The
motivating use case is the
[microPublication Biology Gene Models collection](https://www.micropublication.org/journals/biology/collections/genemodels/),
and the proposal and its requirements are recorded in
[#204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204).
Its candidate scope items — model identity and scope, reference coordinates,
new-versus-revision semantics, evidence and methods, credit and publication,
packaging and integrity — are *concepts under review, not adopted field names*.

## The FHGFF3 file header versus FHGM model records

FHGFF3 and FHGM describe different things and are not alternatives to each
other:

- **FHGFF3 describes the annotation file.** The FHGFF3 header is the file-level
  `#~` block defined by the released contract (currently `schemaVersion` `"1.2"`,
  `fhgff3.json`; see the [FHGFF3 schema reference](/specifications/fhgff3/)) —
  covering the whole GFF3 file: its identity, taxon, genome link and
  exact-byte checksum.
- **FHGM would describe individual gene-model records.** A model record
  characterizes one contributed model *inside* an annotation. A file can carry
  several such records, and each experimental record points to a GFF3 feature
  `ID`; native GFF3 `ID`/`Parent` relationships supply transcript and exon
  structure. Record-level fields and rules do not exist yet as a contract.

Whether FHGM ends up as a subtype, a separately versioned overlay selected at
validation time, or a sibling contract is one of the open decisions in
[#204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204).

## How the current pilot is built

The pilot lives in the FHGM development repository,
[FHGM-Specification](https://github.com/FAIR-bioHeaders/FHGM-Specification),
and uses the FHGFF3 1.1 extension-field rule
([FORMAT.md R15](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FORMAT.md))
to carry the experimental records: the embedded model records sit under an
`x-`-prefixed key (`x-fhgm-models` in the reviewed drafts) so the file remains
a schema-valid FHGFF3 1.1 header. The file keeps its FHGFF3 `schema` URL and
`schemaVersion`; the records add no coverage to any released contract.

Verified pilot artifacts (see the linked PRs for method detail):

- [FHGM-Specification PR #3](https://github.com/FAIR-bioHeaders/FHGM-Specification/pull/3)
  built the *S6k* fixture: the GFF3 is reproduced from the attributed
  CaltechDATA archive, its transcripts and peptides are verified against the
  named reference assembly, and the headed file is tested against the released
  FHGFF3 schema with an independent checksum recomputation.
- [FHGM-Specification PR #4](https://github.com/FAIR-bioHeaders/FHGM-Specification/pull/4)
  tested two embedded model records and a revision pointer: a synthetic
  successor annotation carries two records, and the predecessor pointer
  combines the prior annotation checksum with a model ID and version.

## What the pilot checks — and what it does not

The pilot deliberately separates three kinds of outcome:

- **File integrity.** The FHGFF3 schema check validates the header structure
  and genome link; the checksum covers the full file's exact bytes, including
  every embedded model record. A stale or edited file fails integrity
  regardless of what its records say.
- **Model-level revision resolution.** The pilot showed that the released base
  schema accepts the extension records *even when a revision pointer names an
  unchanged neighbor model or a stale predecessor file* — those files still
  pass schema and integrity checks. Resolving a pointer (prior annotation
  checksum plus model ID plus version, same assembly) therefore requires a
  separate model-level check, which the draft validator in the development
  repository performs on top of the base schema.
- **Curator acceptance.** A resolved pointer only identifies a predecessor
  record: whether a revision is *accepted* is a curator decision with its own
  evidence, which no header check establishes.

This matches the boundary drawn in
[#204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204):
evidence assertions, feature validity (gff3-validator), reference matching,
file integrity and biological or curatorial acceptance are distinct checks.
A valid header never establishes a correct model.

## Why there is no field inventory here

The other pages in this section carry field tables that are **generated** from
byte-pinned schema bytes and drift-checked in CI, so the documentation cannot
fall behind — or run ahead of — a contract. FHGM has no such pinned bytes to
generate from. The draft overlay under
[`development/model/`](https://github.com/FAIR-bioHeaders/FHGM-Specification/tree/main/development/model)
in the development repository is review input for
[#204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204),
not a proposed published contract, and rendering its shapes as a site field
table would turn this page into a second schema authority. So this page links
the authority instead of mirroring a proposal, and the page-level checks keep it
that way: draft notice present, `docs/FHGM.md` linked, no generated field
tables and no invented release alias.

## Status and open questions

- Contract ownership, required fields, serialization and model-level
  validation: [#204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204).
- Pilot datasets: [#206](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/206).
- Family delivery: [#55](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/55).
- Development repository:
  [FHGM-Specification](https://github.com/FAIR-bioHeaders/FHGM-Specification),
  created 2026-11-05 as a fork of `FHGFF3`. Its `development/` tree holds the
  active FHGM work (requirements plan, FHGFF3 comparison worksheet, draft
  contract review record, pilot fixtures and draft overlay validator); the rest
  is the inherited biodatamodels/gff-schema feature-model baseline, retained
  with its original identity. CI in that repository verifies documentation and
  the inherited FHGFF3 baseline; it does not validate FHGM, and the repository
  makes no FHGM contract, schema version, release or toolkit support claim.
  Do not read its files as published contracts.

Explicitly deferred, and stated nowhere on this page as existing: normative
FHGM field names, requiredness, types or cardinalities; any released schema
version, `schemaVersion` value or fixed alias URL; any entry in
`schemas/versions.json`; and any claim that the `fair-bioheaders` toolkit, the
gff3-validator, the metadata builders or this site's table builder support
FHGM. Family support, serialization choices and version dispatch are decided
only after #204 resolves, through the normal review and release cycle.

## Related guidance

- [docs/FHGM.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FHGM.md) —
  the authoritative draft overview in the shared specification repository.
- [FHGFF3 schema reference](/specifications/fhgff3/) — the released contract
  that pilot files actually carry, including the R15 `x-` extension rule the
  pilot uses.
- [Header type specifications](/specifications/) and
  [Using FH*](/guide/) — choosing a released header type.
- [Resources & citation](/resources/) — which repository owns what, and why a
  development repository is not a citation record.
- Discussion of FHGM belongs in
  [#204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204)
  or [FHGM-Specification](https://github.com/FAIR-bioHeaders/FHGM-Specification/issues),
  not on this website.
