---
permalink: /
title: "FAIR BioHeaders"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

FAIR BioHeaders builds an open standard, the FAIR Header Reference genome (FHR), that keeps reference genome metadata and provenance close to sequence data — helping researchers identify the reference used in an analysis and retain the information needed to reproduce it.

## About the project

FAIR BioHeaders grew out of a problem described in the [FHR standard paper](https://doi.org/10.1093/bib/bbae122): reference genomes are shared across platforms, repositories, and analyses, but the metadata and provenance that make them interpretable rarely travel with the files. Without that context, cross-platform analysis stalls and data provenance is lost. We build standards and tools that keep that context close to the data so an analysis can be understood and reproduced long after it was run.

### What we value

- **Provenance travels with the data.** Metadata lives alongside the sequence, not in a separate document that can drift away from it.
- **Minimal disruption.** FHR fits into existing workflows — metadata in FASTA comments and companion representations — so adopting it does not require rebuilding a pipeline.
- **FAIR and TRUST.** The standard is guided by Findability, Accessibility, Interoperability, and Reuse (FAIR) together with Transparency, Responsibility, User focus, Sustainability, and Technology (TRUST).
- **Extensible and expressive.** A small set of required fields keeps implementation easy while allowing projects to record more when they need it.
- **Low barrier to adoption.** Few dependencies and a small codebase make the standard and its tooling straightforward to use and maintain.

### How our work fits together with others

[Publications we’ve had a part in](/publications/) approach these ideas from different angles:

- **Naming** — [Guidelines for gene and genome assembly nomenclature](https://doi.org/10.1093/genetics/iyaf006) proposes conventions so assemblies can be identified and linked across datasets and resources.
- **Reporting** — [Toward standardization in arthropod and biodiversity genome projects](https://doi.org/10.1093/genetics/iyag172) surveys genome projects and documents the gaps in sample, assembly, quality, and submission reporting that FHR helps close.
- **Discovery** — [AgBioDatabase Finder](https://doi.org/10.17912/micropub.biology.001896) helps researchers find where data can be deposited and discovered, complementing the metadata carried with the files.
- **Community** — [The future is FAIR](https://doi.org/10.1093/database/baag058) places FHR within the wider AgBioData effort to make genomic data easier to discover, integrate, and reuse.

## Use the standard

- Read the [FHR specification](https://github.com/FAIR-bioHeaders/FHR-Specification) for metadata fields and schemas.
- Use the [FHR file converter](https://github.com/FAIR-bioHeaders/FHR-File-Converter) to work with supported representations.
- Explore the [Nextflow workflows](https://github.com/FAIR-bioHeaders/FHR-Nextflow) for pipeline integration.

[Resources and citation guidance](/resources/) collect the maintained repositories and archive links.

## About Us

FAIR BioHeaders is developed and maintained by:

<div class="about-us">
{% for person in site.data.team %}
  <div class="about-us__person h-card vcard">
    <p class="about-us__name"><span class="p-name fn">{{ person.name }}</span></p>
    <p class="about-us__role p-job-title">{{ person.role }}</p>
    <p class="about-us__bio p-note">{{ person.bio }}</p>
    <p class="about-us__orcid"><a class="u-uid u-url url" rel="me" href="{{ person.orcid }}">{{ person.orcid }}</a></p>
  </div>
{% endfor %}
</div>

## Get involved

Visit the [FAIR BioHeaders GitHub organization](https://github.com/FAIR-bioHeaders) to explore the code and documentation. Report website problems in the [website issue tracker](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues); questions about the standard or converters belong in their respective repositories.
