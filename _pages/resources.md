---
title: "Resources & citation"
permalink: /resources/
excerpt: "FAIR BioHeaders specifications, converters, workflows, and citation guidance."
---

Released specifications, tools, development repositories and citation guidance for the FAIR BioHeaders (FH*) family. FHR, FHT, FHP and FHGFF3 describe different biological resources; their release and tooling support are listed separately.

{% include nature-panel.html key="pineapple" %}

## Project repositories

The shared specification repository publishes the reviewed family contracts:
The shared repository publishes the reviewed family contracts. The current release
is **v0.6.0**: FHP `schemaVersion` "1.2" and FHGFF3 "1.2" (dotted BUSCO dataset
versions), with FHR "2.1" re-published byte-identical — extension fields (FORMAT rule
R15) came with v0.5.0. FHT transcriptome metadata is still a draft with no shared release,
and FHGM gene model records are a draft proposal with no contract at all — no
`schemaVersion`, no fixed alias, no registry entry and no tooling support; see the
[FHGM draft page](/specifications/fhgm/) and the authoritative
[draft overview](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FHGM.md).
FAIR BioHeaders Tools is the single active conversion and validation package, and each
type's complete field list lives on its schema reference page:
[FHR](/specifications/fhr/), [FHT (draft)](/specifications/fht/),
[FHP](/specifications/fhp/) and [FHGFF3](/specifications/fhgff3/).

| Resource | Purpose | Status |
| --- | --- | --- |
{% for key in site.data.reference_order %}{% assign reference = site.data.references[key] %}{% if reference.repository %}| [{{ reference.resource_name | default: reference.title }}]({{ reference.repository }}) | {{ reference.purpose }} | {{ reference.status }}{% if reference.release %} ({{ reference.release }}){% endif %} |
{% endif %}{% endfor %}

For GFF3 feature checks, use the [GFF3 validator](https://github.com/FAIR-bioHeaders/gff3-validator).
Schema validity, file checksums, and biological validation are different checks;
not every header type supports every serialization yet.

### Type development

Propose field changes and report type-specific specification problems in these
repositories. Final reviewed specifications are published together in the
shared repository above; these development homes do not have separate final-release DOIs.

| Resource | Purpose | Status |
| --- | --- | --- |
{% for resource in site.data.development %}| <span id="{{ resource.key | escape }}">[{{ resource.name }}]({{ resource.repository }})</span> | {{ resource.purpose }} | {{ resource.status }} |
{% endfor %}

The protein header (FHP) development tracker is [issue #1](https://github.com/FAIR-bioHeaders/FHP-Specification/issues/1),
which tracks completion of the release after `schemaVersion` "1.0" landed in shared v0.4.0.

The gene-model proposal (FHGM) is under review in the shared specification
([issue #204](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/204),
draft overview [docs/FHGM.md](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/FHGM.md));
its development repository hosts pilot fixtures and a draft overlay that is review
input only — it makes no FHGM contract, schema version, release or tooling-support claim.

<span id="FHT_File_Converter"></span>The standalone FHT File Converter is retired.
Use FAIR BioHeaders Tools for active tooling; FHT support awaits the reviewed
transcriptome contract. The former converter is not an active download or support destination.

### Repository citations

Select **Cite** to view and copy a resource’s BibTeX entry. The specification and
toolkit DOI records retain their registered titles, *FHR Specification* and
*FHR File Converter*, even though their repositories now serve the family.
Version DOI links identify the specific published releases.

Current project contributions use MPL-2.0 subject to each repository’s retained
historical permissions and third-party notices. See its LICENSE for scope;
older releases retain their original permissions.

<div class="repo-references">
{% for key in site.data.reference_order %}{% assign reference = site.data.references[key] %}{% if reference.repository %}{% include reference.html key=key reference=reference %}
{% endif %}{% endfor %}
</div>

## Zenodo community

Browse the [FAIR-bioHeaders Zenodo community](https://zenodo.org/communities/fh-/) for archived project outputs. For a specific specification or software release, use the version DOI on its Zenodo record.

## Standards & adoption

FHR is referenced in [ISO 25184:2026](https://www.iso.org/standard/89273.html), *Molecular biomarker analysis — Nucleotide sequencing — Verified next generation sequences (VNGS)* (edition 1, published 2026-04; ISO/TC 34/SC 16). The standard specifies requirements for reference next generation nucleotide sequences, including sequences that are accessible on the semantic web — the same provenance and metadata goals FHR was designed to support.

## Citing FHR

For a general description of FHR, cite the published paper. Select **Cite** to view and copy its BibTeX entry.

{% include reference.html key="Wright2024" reference=site.data.references.Wright2024 %}

For direct use of the specification or converter, cite the resource in the [project repositories](#project-repositories) list above.

These are concept DOIs, which group releases. For reproducible use of a specific release, select its version DOI from the Zenodo record. See [FHR Citation](https://github.com/FAIR-bioHeaders/FHR-Citation) for maintained metadata and [downloadable BibTeX](https://github.com/FAIR-bioHeaders/FHR-Citation/blob/main/citation.bib).

To assemble a metadata record and a readable table in the browser, use the [FHR table builder](/table-builder/).
