---
title: "Using FH*"
permalink: /guide/
excerpt: "Choose a FAIR BioHeaders header for genomes, transcriptomes, protein sets or annotations, with scope and compatibility guidance."
---

FAIR BioHeaders (FH*) is a family of headers for different biological resources.
Start with the type that matches your data, then use a workflow supported by
that type's released contract and tooling.

## Choose a header

| Type | Resource | Contract and workflow status |
| --- | --- | --- |
| FHR | Reference genome assembly | FHR 2.0 in shared specification v0.4.0; current toolkit workflows and an FHR-only browser builder. |
| FHT | Transcriptome | Draft under curator consultation; no released family contract or current builder support. |
| FHP | Protein/proteome FASTA | FHP 1.0 in shared specification v0.4.0; toolkit JSON/YAML and file processing. JSON-LD/HTML microdata are follow-up work. |
| FHGFF3 | GFF3 annotation metadata | FHGFF3 1.0 in shared specification v0.4.0; toolkit JSON/YAML and file processing. JSON-LD/HTML microdata are follow-up work; feature/biology validation is separate. |

Read the [released examples](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/v0.4.0/examples)
and [current toolkit documentation](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools)
for the chosen type and supported representation. The [resources page](/resources/)
links each development repository and distinguishes development from shared final
publication. A format supported for FHR is not automatically supported for every type.

The worked example below is a **historical FHR-only workflow**, verified against
`fhr` 0.3.3 and its
[synthetic example](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/tree/v0.3.3/examples).
It is retained as recorded; use the released examples above for current work.
Its sample identifiers are placeholders.

{% include nature-panel.html key="turtle-shell" %}

Prefer a form? The [FHR table builder](/table-builder/) builds the metadata,
validates it against the schema, and downloads the table and metadata file.

## A historical worked example (fhr 0.3.3)

Start with ordinary FASTA that carries no FHR metadata:

```
>chr1 synthetic example
ACGTACGTACGTACGT
```

Supply the metadata as a small YAML file (fields for this example are described
in the [v0.3.1 contract](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/v0.3.1/fhr.json)):

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

## Scope: the header family and where metadata lives

- **FHR** (FAIR Header Reference genome) describes reference **genomes**. **FHT**
  is a companion draft for reference **transcriptomes**; the two are separate
  specifications in the same family, and FHT is still draft.
- **FHP** describes protein FASTA and **FHGFF3** describes annotation metadata.
  Their schemaVersion `"1.0"` contracts are included alongside FHR in the
  [shared specification v0.4.0](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/releases/tag/v0.4.0).
  FHP/FHGFF3 JSON-LD and HTML microdata are still follow-up work.
- **File-carried metadata** travels with the sequence in `;~` (FASTA) or `#~`
  (GFA) header comments, so the metadata cannot drift away from the data it
  describes. **Repository metadata** is held by the archive that stores the
  sequence; the two are complementary, not alternatives.
- Header handling varies by tool. Many FASTA indexers require a stripped copy;
  follow the [tool compatibility guidance](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/TOOL_COMPATIBILITY.md)
  and keep the metadata-bearing original. Comments alone do not guarantee
  compatibility with every parser.

## Version compatibility

- The released FHR contract is now `schemaVersion: "2.0"` (a string), in shared
  specification v0.4.0. `schemaVersion`, repository release tags and the
  assembly's `version` describe different things.
- The family package **fair-bioheaders 0.8.0**, installed with
  `python -m pip install fair-bioheaders==0.8.0`. Its `bioheaders` CLI performs
  conversion, validation and checksums; the legacy `fhr-*` commands remain
  supported. See the [toolkit usage](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools).
- The worked example above is preserved as the recorded **fhr 0.3.3** workflow.
  Its numeric schemaVersion and raw-main header are historical, not a current
  v0.4 recipe. The raw-main URL now selects the current contract. For new work,
  use the reviewed [release examples](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/v0.4.0/examples)
  and a fixed versioned schema URL; unknown schema versions are unsupported,
  never silently replaced. The [schema-version policy](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-VERSIONS.md)
  explains migration and compatibility checks.
- The browser table builder still targets v0.3.1 by default. It has not yet
  acquired the full family or v0.4 form; a released specification is not a claim
  that this browser supports it.
- **Concept DOIs** (for example the [FHR Specification](https://doi.org/10.5281/zenodo.6762549))
  group all releases of a resource. For a reproducible citation, use the
  **version DOI** for the specific release you used; see
  [Resources & citation](/resources/).

## What the checks establish

Schema validation checks metadata structure against its cited supported contract.
File checksum verification checks the specified file bytes. Parent verification
checks supplied links against supplied parent files. These are separate results;
parsing a header or viewing its metadata does not perform all three. GFF3 feature,
ontology and optional biology checks belong to the
[GFF3 validator](https://github.com/FAIR-bioHeaders/gff3-validator), independently
of whether the file carries an FHGFF3 header.

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
[FHR development](https://github.com/FAIR-bioHeaders/FHR-Specification/issues);
shared publication questions belong with
[FAIR BioHeaders Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues);
conversion and validation bugs belong with
[FAIR BioHeaders Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/issues).

**Do I have to use the converter?**
No. The format is plain text; you can write or parse the `;~` header directly.
The converter exists to make that easier and to validate against the schema.

**Which citation should I use?**
Cite the [published paper](https://doi.org/10.1093/bib/bbae122) for a general
description of FHR, and the version DOI of the specification or converter for
direct use of a specific release. See [Resources & citation](/resources/).
