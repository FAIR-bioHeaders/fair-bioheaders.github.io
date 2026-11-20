---
title: "FHGM gene model records (Draft)"
permalink: /specifications/fhgm/
excerpt: "FHGM native gene-model metadata carried by an FHGFF3 annotation: reviewed development package, separate validation layers and publication status."
---

<div class="spec-notice spec-notice--draft" role="note">
  <p><strong>FHGM is a reviewed development model, not a released contract.</strong>
  The native model 0.1 package is staged for shared v0.8.0 publication. This is
  separate from the released FHGFF3 file header. No published FHGM alias or
  released toolkit support is claimed here. The authoritative shared overview is
  <a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FHGM.md">docs/FHGM.md</a>.
  This page carries <strong>no field inventory</strong>; use the reviewed source
  package until a release-pinned reference is deliberately added.</p>
</div>

FHGM (FAIR Header Gene Model) describes individual **gene-model contributions**
inside an FHGFF3 annotation. FHGFF3 and FHGM are not alternatives to each other:

- **FHGFF3 describes the annotation file.** Its released `schemaVersion` `1.2`
  header identifies the whole file, taxon, version and genome link. Its checksum
  covers the exact file bytes, including model metadata and embedded FASTA.
- **FHGM describes a contributed model.** Native model records are carried under
  `x-fhgm-models` in that header. The initial reviewed scope targets a root
  `gene` / `SO:0000704` feature, including gene-level noncoding models. GFF3
  `ID` and `Parent` relationships carry feature structure.

FHGM has its own selected model contract, outside the header
`schemas/versions.json` registry. It adds **no FHGM header `schemaVersion`**, no
in-record `schema` field and no header registry row. The agreed publication
location is `model-contracts/fhgm/0.1/fhgm-model.schema.json`; the intended
shared publication vehicle is v0.8.0, after FHT v0.7.0. A planned location is
not a published contract or a working alias.

## Reviewed package and runtime status

The owning [FHGM-Specification](https://github.com/FAIR-bioHeaders/FHGM-Specification)
package at
[`d9d131a`](https://github.com/FAIR-bioHeaders/FHGM-Specification/tree/d9d131a02b042023f4784d842a874232fc891069/development)
contains the reviewed schema, semantic validator, examples and 92-case suite.
Shared [PR #278](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/pull/278)
mirrors that unpublished package. Technical delivery and joint package
acceptance remain distinct from a tagged release, fixed identifier and
installed consumer acceptance.

Toolkit [PR #198](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/pull/198)
is merged and implements experimental FHGM handling in source. It is not
present in the published `fair-bioheaders` 0.12.0 wheel. Its earlier 62-case
receipt does not establish acceptance of the reviewed 92-case package. Final
consumer refresh and installed receipts are tracked in
[Tools #155](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/issues/155).
The [browser table builder](/table-builder/) does not edit FHGM model records.

## Distinct validation outcomes

A conforming report keeps these outcomes separate:

- **Base header:** the cited FHGFF3 contract checks the file-level metadata.
- **File integrity and links:** recomputed checksums and exact parent-file
  identity do not establish biological derivation.
- **Model:** the selected native contract and semantic predicates check the
  model record against the supplied trustworthy feature inventory and bounded
  predecessor history. Missing capability or input is reported as not-run,
  with a reason; it cannot become a complete model pass.
- **Features and biology:**
  [gff3-validator](https://github.com/FAIR-bioHeaders/gff3-validator) reports
  feature/graph/biology findings separately. Schema/model validation is not
  proof that a biological assertion is correct.
- **Curator acceptance:** an identified predecessor or valid model record does
  not supply acceptance, endorsement or publication approval.

Transcript-only models, split/merge history and assembly migration are deferred
from the initial model foundation. The downstream
[pilot rollout (#206)](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/206)
belongs to Project 12 and does not add a Project 9 publication requirement.
The inherited biodatamodels/gff-schema snapshot is separate from this freshly
written model; its retained history and notices do not grant reuse permission.

## Publication handoff

[Shared #204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204)
tracks final shared publication. After actual release, update this page with
the real immutable contract/alias and named installed consumer receipts, and
refresh references deliberately. Until then, owning/source checks remain
development evidence. The [family tracker #55](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/55)
records the separate downstream dependencies.
