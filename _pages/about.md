---
permalink: /
title: "FAIR BioHeaders"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

FAIR BioHeaders keeps reference genome metadata and provenance close to sequence data. The FAIR Header Reference genome (FHR) standard helps researchers identify the reference used in an analysis and retain the information needed to reproduce it.

## About FAIR BioHeaders

FHR uses structured metadata guided by the principles of Findability, Accessibility, Interoperability, and Reuse (FAIR), together with Transparency, Responsibility, User focus, Sustainability, and Technology (TRUST). It supports metadata in FASTA comments and companion representations so that researchers can adopt it within existing workflows.

The [published FHR paper](https://doi.org/10.1093/bib/bbae122) describes the standard and its design. See our [publications](/publications/) for related work on genome nomenclature, reporting standards, and FAIR data sharing.

## Use the standard

- Read the [FHR specification](https://github.com/FAIR-bioHeaders/FHR-Specification) for metadata fields and schemas.
- Use the [FHR file converter](https://github.com/FAIR-bioHeaders/FHR-File-Converter) to work with supported representations.
- Explore the [Nextflow workflows](https://github.com/FAIR-bioHeaders/FHR-Nextflow) for pipeline integration.

[Resources and citation guidance](/resources/) collect the maintained repositories and archive links.

## About Us

FAIR BioHeaders is developed and maintained by:

<ul class="about-us">
{% for person in site.data.team %}
  <li class="h-card vcard">
    <span class="p-name fn">{{ person.name }}</span>
    <a class="u-uid u-url url" href="{{ person.orcid }}">{{ person.orcid }}</a>
  </li>
{% endfor %}
</ul>

## Get involved

Visit the [FAIR BioHeaders GitHub organization](https://github.com/FAIR-bioHeaders) to explore the code and documentation. Report website problems in the [website issue tracker](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues); questions about the standard or converters belong in their respective repositories.
