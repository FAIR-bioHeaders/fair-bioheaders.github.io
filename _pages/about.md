---
permalink: /
title: "FAIR BioHeaders"
author_profile: false
redirect_from:
  - /about/
  - /about.html
---

<div class="project-intro">
  <div class="project-intro__copy">
    <p class="project-eyebrow">Genomes · Transcripts · Proteins · Annotations</p>
    <p class="project-intro__lead">Keep the context.<br>Carry it with the data.</p>
    <p>FAIR BioHeaders develops a family of metadata headers, collectively called FH*, for reference genomes, transcriptomes, protein sets and annotations. They keep the identity, methods and provenance of biological resources close to the files researchers share and use.</p>
    <div class="project-actions">
      <a class="project-action project-action--primary" href="{{ '/guide/#choose-a-header' | relative_url }}">Choose a header <span aria-hidden="true">↗</span></a>
      <a class="project-action" href="{{ '/publications/' | relative_url }}">Explore the research <span aria-hidden="true">→</span></a>
    </div>
  </div>
  <figure class="biology-image biology-image--honeycomb">
    <picture>
      <source type="image/webp" srcset="{{ '/images/biology/honeycomb-480.webp' | relative_url }} 480w, {{ '/images/biology/honeycomb-960.webp' | relative_url }} 960w" sizes="(min-width: 900px) 420px, (min-width: 600px) 480px, 90vw">
    <img src="{{ '/images/biology/honeycomb-960.jpg' | relative_url }}" srcset="{{ '/images/biology/honeycomb-480.jpg' | relative_url }} 480w, {{ '/images/biology/honeycomb-960.jpg' | relative_url }} 960w" sizes="(min-width: 900px) 420px, (min-width: 600px) 480px, 90vw" width="960" height="640" alt="Golden honeycomb with open hexagonal cells and pale wax-capped cells" fetchpriority="high">
    </picture>
    <figcaption>Honeycomb · <a href="{{ site.data.image_credits.honeycomb.source }}">Waugsberg</a> · <a href="{{ site.data.image_credits.honeycomb.license_url }}">CC BY-SA 3.0</a> · resized, cropped</figcaption>
  </figure>
</div>

<nav class="project-paths" aria-label="Explore FAIR BioHeaders">
  <a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification"><span class="project-eyebrow">01 / Standard</span><strong>A shared language</strong><span>Released genome, protein and annotation metadata contracts.</span></a>
  <a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools"><span class="project-eyebrow">02 / Tools</span><strong>Put it into practice</strong><span>Convert headers and work with supported representations.</span></a>
  <a href="{{ '/resources/' | relative_url }}"><span class="project-eyebrow">03 / Resources</span><strong>Build on the work</strong><span>Repositories, archived releases, and citation guidance.</span></a>
</nav>

## About the project

FAIR BioHeaders grew out of a problem described in the [FHR standard paper](https://doi.org/10.1093/bib/bbae122): reference genomes are shared across platforms, repositories, and analyses, but the metadata and provenance that make them interpretable rarely travel with the files. Without that context, cross-platform analysis stalls and data provenance is lost. We build standards and tools that keep that context close to the data so an analysis can be understood and reproduced long after it was run.

### What we value

- **Provenance travels with the data.** Metadata lives alongside the sequence, not in a separate document that can drift away from it.
- **Practical interoperability.** FH* uses file-carried metadata and companion representations. Tools handle comments differently; our guide explains supported formats and when a stripped copy is needed.
- **FAIR and TRUST.** The family is guided by Findability, Accessibility, Interoperability, and Reuse (FAIR) together with Transparency, Responsibility, User focus, Sustainability, and Technology (TRUST).
- **Extensible and expressive.** A small set of required fields keeps implementation easy while allowing projects to record more when they need it.
- **Low barrier to adoption.** Few dependencies and a small codebase make the headers and their tooling straightforward to use and maintain.

## One family, four header types

Each header describes a different kind of biological resource. Choose the type
that matches your file; a shared core does not make the types interchangeable.

- **FHR — reference genomes.** Describe an assembly, its creators, methods and
  statistics. The released contract is FHR 2.0 in specification v0.4.0.
  [FHR development](https://github.com/FAIR-bioHeaders/FHR-Specification).
- **FHT — transcriptomes.** Develop metadata for transcript sequences and their
  biological and computational origins. The field set is under consultation;
  FHT has no released family contract yet.
  [FHT development](https://github.com/FAIR-bioHeaders/FHT-Specification).
- **FHP — protein sets.** Describe predicted, database and mixed protein FASTA
  sets without inventing source material or quality-control results. FHP 1.0
  is released in specification v0.4.0; JSON-LD and HTML microdata support remain
  separate work. [FHP development](https://github.com/FAIR-bioHeaders/FHP-Specification).
- **FHGFF3 — annotations.** Record how an annotation was made and which genome
  its coordinates refer to. FHGFF3 1.0 is released in specification v0.4.0.
  Its header does not validate GFF3 features or their biology; JSON-LD and HTML
  microdata support remain separate work.
  [FHGFF3 development](https://github.com/FAIR-bioHeaders/FHGFF3).

### Shared context, resource-specific detail

The shared core covers identity, taxon, version, metadata authors, creation date
and a file checksum. Each type adds fields appropriate to its resource. A small
required set keeps adoption practical; optional detail can preserve methods and
source information without forcing every resource into a genome-assembly model.

Where supported and supplied, parent-file links can connect a genome, annotation
and protein set. A matching parent checksum establishes file identity; it does
not prove biological derivation or completeness of the provenance chain. Missing
information stays missing. File-carried metadata complements repository records
and the publications that describe the work.

[Choose a header and a supported workflow](/guide/#choose-a-header), or read the
[shared released specifications](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification).

### How our work fits together with others

[Publications we’ve had a part in](/publications/) approach these ideas from different angles:

- **Naming** — [Guidelines for gene and genome assembly nomenclature](https://doi.org/10.1093/genetics/iyaf006) proposes conventions so assemblies can be identified and linked across datasets and resources.
- **Reporting** — [Toward standardization in arthropod and biodiversity genome projects](https://doi.org/10.1093/genetics/iyag172) surveys genome projects and documents the gaps in sample, assembly, quality, and submission reporting that FHR helps close.
- **Discovery** — [AgBioDatabase Finder](https://doi.org/10.17912/micropub.biology.001896) helps researchers find where data can be deposited and discovered, complementing the metadata carried with the files.
- **Community** — [The future is FAIR](https://doi.org/10.1093/database/baag058) places FHR within the wider AgBioData effort to make genomic data easier to discover, integrate, and reuse.

<div class="biology-feature">
  <figure class="biology-image biology-image--eye">
    <picture>
      <source type="image/webp" srcset="{{ '/images/biology/compound-eye-400.webp' | relative_url }} 400w, {{ '/images/biology/compound-eye-800.webp' | relative_url }} 800w" sizes="(min-width: 900px) 320px, (min-width: 600px) 240px, 90vw">
    <img src="{{ '/images/biology/compound-eye-800.jpg' | relative_url }}" srcset="{{ '/images/biology/compound-eye-400.jpg' | relative_url }} 400w, {{ '/images/biology/compound-eye-800.jpg' | relative_url }} 800w" sizes="(min-width: 900px) 320px, (min-width: 600px) 240px, 90vw" width="800" height="639" alt="Black-and-white electron micrograph of closely packed fruit-fly eye facets and bristles" loading="lazy" decoding="async">
    </picture>
    <figcaption>Fruit-fly eye, SEM · <a href="{{ site.data.image_credits.compound_eye.source }}">Louisa Howard / Dartmouth College</a> · <a href="{{ site.data.image_credits.compound_eye.license_url }}">public domain</a> · retouched, resized</figcaption>
  </figure>
  <div class="biology-feature__copy">
    <p class="project-eyebrow">DNA · Structure</p>
    <h3 id="why-the-hexagon">Why the hexagon?</h3>
    <p>Our hexagon comes from the six-membered rings in all four DNA bases: thymine, cytosine, guanine, and adenine. Thymine and cytosine each have one six-membered ring; adenine and guanine have a six-membered ring fused to a five-membered ring.</p>
    <p>Patterns in honeycomb, insect eggs, turtle shells, and fruit echo this motif across biodiversity. <a href="https://www.ncbi.nlm.nih.gov/books/NBK21134/">Explore the structure of DNA</a>.</p>
  </div>
</div>

## Use the headers

- Read the [shared specifications](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification) for metadata fields and schemas.
- Use [FAIR BioHeaders Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools) to work with supported representations.
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
