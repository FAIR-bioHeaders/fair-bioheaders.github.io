---
title: "Using FHR"
permalink: /guide/
excerpt: "A worked example, scope, and compatibility guidance for adopting the FAIR BioHeaders standard."
---

This guide shows one verified end-to-end example of adding FHR metadata to a
FASTA file, explains how FHR and FHT differ, and answers common questions. All
commands below were run against the released `fhr` package (0.3.3) and the
[synthetic example](https://github.com/FAIR-bioHeaders/FHR-File-Converter/tree/main/examples)
shipped with the converter; the sample is redistributable and its identifiers
are placeholders.

{% include nature-panel.html key="turtle-shell" %}

Prefer a form? The [FHR table builder](/table-builder/) builds the metadata,
validates it against the schema, and downloads the table and metadata file.

## A worked example

Start with ordinary FASTA that carries no FHR metadata:

```
>chr1 synthetic example
ACGTACGTACGTACGT
```

Supply the metadata as a small YAML file (fields are described in the
[FHR specification](https://github.com/FAIR-bioHeaders/FHR-Specification)):

```yaml
schema: https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json
schemaVersion: 1.0
taxon:
  name: Homo sapiens
  uri: https://identifiers.org/taxonomy:9606
genome: Synthetic human reference example
version: 0.0.1
masking: not-masked
metadataAuthor:
- name: Adam Wright
  uri: https://orcid.org/0000-0002-5719-4024
assemblyAuthor:
- name: David Molik
  uri: https://orcid.org/0000-0003-3192-6538
dateCreated: '2022-03-21'
```

Install the released package and combine the metadata with the sequence:

```bash
python -m pip install fhr==0.3.3
fhr-fasta-combine metadata.yaml genome.fasta -o genome.fhr.fasta
fhr-fasta-validate genome.fhr.fasta
```

`fhr-fasta-combine` writes the metadata as `;~`-prefixed header lines above the
unchanged sequence, and `fhr-fasta-validate` confirms the metadata and the
file checksum:

```
;~schema: https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json
;~schemaVersion: 1.0
;~taxon:
;~  name: Homo sapiens
;~  uri: https://identifiers.org/taxonomy:9606
;~genome: Synthetic human reference example
;~version: 0.0.1
;~masking: not-masked
;~metadataAuthor:
;~- name: Adam Wright
;~  uri: https://orcid.org/0000-0002-5719-4024
;~assemblyAuthor:
;~- name: David Molik
;~  uri: https://orcid.org/0000-0003-3192-6538
;~dateCreated: '2022-03-21'
;~checksum: PayVnq8Fdnzvaq2jOdUq+l0oJZ+iHk/DtiaYuUWRHqQ=
>chr1 synthetic example
ACGTACGTACGTACGT
```

To convert to another supported representation, use `fhr-convert`; it reads
`.json`, `.yaml`, `.fasta`, `.gfa`, and `.html` from file extensions and
validates before writing:

```bash
fhr-convert genome.fhr.fasta genome.fhr.json
fhr-validate genome.fhr.json
```

## Scope: FHR, FHT, and where metadata lives

- **FHR** (FAIR Header Reference genome) describes reference **genomes**. **FHT**
  is a companion draft for reference **transcriptomes**; the two are separate
  specifications in the same family, and FHT is still draft.
- **File-carried metadata** travels with the sequence in `;~` (FASTA) or `#~`
  (GFA) header comments, so the metadata cannot drift away from the data it
  describes. **Repository metadata** is held by the archive that stores the
  sequence; the two are complementary, not alternatives.
- FHR adds header comment lines only. Because those lines are comments, existing
  FASTA/GFA tooling continues to read the sequence unchanged — FHR does not
  require, and does not claim, special support from every tool.

## Version compatibility

- The current FHR schema is `schemaVersion: 1`. Required fields and the version
  number have been stable across the 0.3 releases; new optional fields may be
  added over time.
- The released `fhr` Python package is version **0.3.3**. Pin a version in
  automation and validate with `fhr-validate` or `fhr-fasta-validate` after
  writing files.
- **Concept DOIs** (for example the [FHR Specification](https://doi.org/10.5281/zenodo.6762549))
  group all releases of a resource. For a reproducible citation, use the
  **version DOI** for the specific release you used; see
  [Resources & citation](/resources/).

## FAQ

**How do I check an existing file?**
Run `fhr-validate` on JSON/YAML metadata, or `fhr-fasta-validate` /
`fhr-gfa-validate` on sequence files to check both the metadata and the
exact-byte checksum. Failures exit with status 1.

**What happens if validation fails?**
The converter validates before writing, so an invalid entry is not written to
the output path. Inspect the error, correct the metadata, and re-run.

**Do I report schema problems or converter problems in the same place?**
No. Schema and specification questions belong with
[FHR-Specification](https://github.com/FAIR-bioHeaders/FHR-Specification);
conversion and validation bugs belong with
[FHR-File-Converter](https://github.com/FAIR-bioHeaders/FHR-File-Converter).

**Do I have to use the converter?**
No. The format is plain text; you can write or parse the `;~` header directly.
The converter exists to make that easier and to validate against the schema.

**Which citation should I use?**
Cite the [published paper](https://doi.org/10.1093/bib/bbae122) for a general
description of FHR, and the version DOI of the specification or converter for
direct use of a specific release. See [Resources & citation](/resources/).
