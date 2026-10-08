---
title: "Resources & citation"
permalink: /resources/
excerpt: "FAIR BioHeaders specifications, converters, workflows, and citation guidance."
---

## Project repositories

| Resource | Purpose | Status |
| --- | --- | --- |
| [FHR Specification](https://github.com/FAIR-bioHeaders/FHR-Specification) | Reference genome metadata specification and schemas | Published |
| [FHR File Converter](https://github.com/FAIR-bioHeaders/FHR-File-Converter) | Processing library and conversion tools | Published |
| [FHR Nextflow](https://github.com/FAIR-bioHeaders/FHR-Nextflow) | Workflow integration | Demo |
| [FHT Specification](https://github.com/FAIR-bioHeaders/FHT-Specification) | Companion FHT specification | Draft |
| [FHT File Converter](https://github.com/FAIR-bioHeaders/FHT-File-Converter) | Companion FHT conversion tools | Draft |
| [FHR Citation](https://github.com/FAIR-bioHeaders/FHR-Citation) | Maintained citation metadata and BibTeX | Published |

## Zenodo community

Browse the [FAIR-bioHeaders Zenodo community](https://zenodo.org/communities/fh-/) for archived project outputs. For a specific specification or software release, use the version DOI on its Zenodo record.

## Standards & adoption

FHR is referenced in [ISO 25184:2026](https://www.iso.org/standard/89273.html), *Molecular biomarker analysis — Nucleotide sequencing — Verified next generation sequences (VNGS)* (edition 1, published 2026-04; ISO/TC 34/SC 16). The standard specifies requirements for reference next generation nucleotide sequences, including sequences that are accessible on the semantic web — the same provenance and metadata goals FHR was designed to support.

## Citing FHR

For a general description of FHR, cite the published paper. Select **Cite** to generate BibTeX; the page also exposes the citation as Schema.org microdata.

{% include reference.html key="Wright2024" reference=site.data.references.Wright2024 %}

For direct use of the specification or converter, cite the resource:

{% include reference.html key="FHR_Specification" reference=site.data.references.FHR_Specification %}

{% include reference.html key="FHR_File_Converter" reference=site.data.references.FHR_File_Converter %}

These are concept DOIs, which group releases. For reproducible use of a specific release, select its version DOI from the Zenodo record. See [FHR Citation](https://github.com/FAIR-bioHeaders/FHR-Citation) for maintained metadata and [downloadable BibTeX](https://github.com/FAIR-bioHeaders/FHR-Citation/blob/main/citation.bib).
