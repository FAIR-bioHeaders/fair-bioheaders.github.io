---
title: "FHGM native gene model records"
permalink: /specifications/fhgm/
excerpt: "Published FHGM native model contract 0.1 in shared v0.8.0: source identity, separate validation layers and runtime boundaries."
---

<div class="spec-notice" role="note" data-fhgm-release="v0.8.0" data-fhgm-contract-version="0.1">
  <p><strong>FHGM native model contract 0.1 is published in shared v0.8.0.</strong>
  This is a model-record contract, separate from the FHGFF3 file header.
  This overview presents <strong>no generated header field inventory</strong>
  and adds no FHGM header type or schema selector.</p>
</div>

The [actual v0.8.0 release](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/releases/tag/v0.8.0)
was published on 2026-11-20 with version DOI
[10.5281/zenodo.24385999](https://doi.org/10.5281/zenodo.24385999).
The native contract bytes are available at the immutable
[raw-tag schema](https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/v0.8.0/model-contracts/fhgm/0.1/fhgm-model.schema.json).

<p class="release-source">Release commit:
<a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/72cb46b98160ecc7a7f20ef579a6879d5030c40b">72cb46b98160ecc7a7f20ef579a6879d5030c40b</a>.
The logical native resource identity is
<code>https://w3id.org/fair-bioheaders/model-contracts/fhgm/0.1</code>.
Alias registration is pending; this identifier is not presented as a live
resolving link. Use the raw-tag resource for the published bytes.</p>

## Model records inside an annotation file

FHGM (FAIR Header Gene Model) describes individual **gene-model contributions**
inside an FHGFF3 annotation. FHGFF3 and FHGM are not alternatives to each other:

- **FHGFF3 describes the annotation file.** Its released header identifies the
  whole file, taxon, resource version and genome link. The file checksum covers
  exact bytes, including model metadata and embedded FASTA.
- **FHGM describes a contributed model.** Native records are carried under
  <code>x-fhgm-models</code> in that header. The initial scope targets a root
  gene / SO:0000704 feature, including gene-level noncoding models. GFF3 ID and
  Parent relationships carry feature structure.

Select the native model contract **outside the record**. It adds no in-record
schema field, no FHGM header schemaVersion, no header registry row in
schemas/versions.json and no fifth choice in the browser header form.
The enclosing file continues to cite its supported FHGFF3 contract.
The [table builder](/table-builder/) does not edit native FHGM records.

## Published package and runtime status

The [publication record](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.8.0/model-contracts/fhgm/0.1/publication.json)
identifies the native schema, accepted source and complete 92-case suite.
Compared with the accepted owning schema, publication adds a resource-level
identifier and refreshes only the root title/description annotations.
Validation keywords, semantic predicates, historical fixture bytes and vector
IDs retain their reviewed meaning.

The owning [FHGM-Specification](https://github.com/FAIR-bioHeaders/FHGM-Specification)
source at
[d9d131a](https://github.com/FAIR-bioHeaders/FHGM-Specification/tree/d9d131a02b042023f4784d842a874232fc891069/development)
and its [published mirror](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/v0.8.0/drafts/fhgm/upstream/development)
preserve development history. Frozen source prose that says “candidate” or
“unpublished” is historical; actual publication is evidenced by the release
and publication record above. See the
[shared publication guide](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.8.0/docs/FHGM-PUBLICATION.md)
and the [historical overview](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.8.0/docs/FHGM.md).

Contract publication does not automatically update installed tools.
The published fair-bioheaders 0.12.0 wheel has no FHGM runtime.
Final 0.13.0 release and installed-artifact acceptance remain pending;
a locally built package carrying that version is not a release.
[Tools #155](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/issues/155)
tracks consumer delivery. No FHGM JSON-LD form is claimed.

## Distinct validation outcomes

A conforming report keeps these outcomes separate:

- **Base header:** the cited FHGFF3 contract checks file-level metadata.
- **File integrity and links:** checksums and exact parent-file identity do not
  establish biological derivation.
- **Model:** the selected native contract and semantic predicates check records
  against trustworthy feature inventory and bounded predecessor history.
  Missing capability or input is not-run with a reason, never a complete pass.
  The published suite deliberately includes expected not-run outcomes.
- **Features and biology:**
  [gff3-validator](https://github.com/FAIR-bioHeaders/gff3-validator) reports
  feature/graph/biology findings separately. Schema or model validation is not
  proof of biological correctness.
- **Curator acceptance:** a predecessor identity or valid model record does not
  supply acceptance, endorsement or publication approval.

Transcript-only models, split/merge history and assembly migration remain
deferred. The downstream
[pilot rollout (#206)](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/206)
belongs to Project 12 and is not a Project 9 foundation requirement.
The inherited biodatamodels/gff-schema snapshot is separate from this authored
model; preserved history and notices do not grant reuse permission.
[Shared #204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204)
records adoption/publication, while
[family tracker #55](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/55)
records downstream dependencies. A new model editor is not a prerequisite for
FHT website activation.
