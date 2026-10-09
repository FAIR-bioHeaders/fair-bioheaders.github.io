---
title: "Resources & citation"
permalink: /resources/
excerpt: "FAIR BioHeaders specifications, converters, workflows, and citation guidance."
---

Specifications, converters, workflows, and citation guidance for the FAIR BioHeaders project.

{% include nature-panel.html key="pineapple" %}

## Project repositories

| Resource | Purpose | Status |
| --- | --- | --- |
{% for key in site.data.reference_order %}{% assign reference = site.data.references[key] %}{% if reference.repository %}| [{{ reference.title }}]({{ reference.repository }}) | {{ reference.purpose }} | {{ reference.status }} |
{% endif %}{% endfor %}

### Repository citations

Select **Cite** to view and copy a repository’s BibTeX entry.

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
