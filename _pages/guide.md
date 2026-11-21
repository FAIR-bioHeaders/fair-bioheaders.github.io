---
title: "Using FH*"
permalink: /guide/
excerpt: "Choose a FAIR BioHeaders header, find a language library and follow a current FHR file workflow."
---

FAIR BioHeaders keeps metadata with the biological files it describes. FH* is
the family name; each header type describes a different kind of data.
Choose a type below, then use the [Language libraries page](/language-libraries/)
to find setup instructions and APIs for Python, R, JavaScript, Java or Julia.

## Choose a header

<div class="field-table guide-family-table" role="region" tabindex="0" aria-label="Header family workflow status" markdown="1">

| Type | Use for | Start here |
| --- | --- | --- |
| [FHR](/specifications/fhr/) | Reference genome assemblies in FASTA or GFA | Contract 2.1; the current FHR-only workflow below uses shared v0.8.0 |
| [FHT](/specifications/fht/) | Transcriptomes in FASTA | Published contract 1.0 in shared v0.7.0; Python toolkit 0.13.1 and the browser builder support it |
| [FHP](/specifications/fhp/) | Protein sets in FASTA | Contract 1.2 in shared v0.6.0; check the chosen library's formats and operations |
| [FHGFF3](/specifications/fhgff3/) | Annotation metadata in GFF3 | Contract 1.2 in shared v0.6.0; checking features and biology is a separate operation |
{: .status-table}

</div>

The [field references](/specifications/) explain required fields, types and
units. The [language library comparison](/language-libraries/#check-support-before-choosing-a-library)
explains why a published contract may not yet be supported by every reader.
Never assume that support for one type or representation includes the others.

**FHGM describes a gene-model contribution inside an annotation, rather than
another file-header type.** Native model contract 0.1 was published in shared
v0.8.0. The enclosing file still uses FHGFF3. Read the
[FHGM overview](/specifications/fhgm/) for its separate model checks and the
[language library support notes](/language-libraries/#check-support-before-choosing-a-library)
before choosing a runtime. Python toolkit 0.13.1's model checker is an explicit
opt-in; it does not replace header, feature or biological validation.

## Choose a way to work

- **In a program:** open [Language libraries](/language-libraries/) and choose
  your language. Each guide gives setup, a short read/verify example and limits.
- **In a browser:** use the [table builder](/table-builder/) to prepare metadata
  and download a readable table. The [JavaScript lesson](/metadata-viewer/)
  demonstrates reading and editing its authored metadata examples.
- **At the command line:** use the Python toolkit for writing, combining,
  conversion and file checks. The worked example below starts from a new FASTA.

{% include nature-panel.html key="turtle-shell" %}

## Current FHR-only workflow

This example uses published **fair-bioheaders 0.13.1** and FHR contract **2.1**,
citing the fixed shared v0.8.0 schema. It replaces the older fhr 0.3.3 recipe.
The names, sequence and date below are synthetic examples; enter your own
accurate metadata for real data. For the same checks inside an application, see
[Language libraries](/language-libraries/).

### Install in a new directory

Use Python 3.9 or later. Run these commands in a directory where `fh-example`
does not already exist:

```sh
mkdir fh-example
cd fh-example
python3 -m venv .venv
. .venv/bin/activate
python -m pip install 'fair-bioheaders==0.13.1'
```

For other languages and their runtime requirements, use the
[language setup guides](/language-libraries/#choose-your-language).

### Create the sequence and metadata

Save this short synthetic sequence as `genome.fasta`:

```fasta
>example synthetic sequence
ACGTACGTACGTACGT
```

Write metadata from supplied values and compute the sequence statistics:

```sh
bioheaders metadata --genome "Synthetic workflow example" \
  --taxon-name "Homo sapiens" --taxon-id 9606 --version 1 \
  --metadata-author "Example metadata author" \
  --assembly-author "Example assembly author" \
  --date-created 2026-11-21 --masking not-masked \
  --stats-from genome.fasta -o metadata.yaml
```

`metadata.yaml` contains typed metadata, including the fixed schema citation and
`schemaVersion: '2.1'`. It has no file checksum yet. Do not invent missing values
or enter someone else's name as an author of your real data.

### Combine and verify

```sh
bioheaders combine metadata.yaml genome.fasta -o genome.fhr.fasta
bioheaders verify genome.fhr.fasta
```

`combine` adds the `;~` metadata block and computes the file checksum. `verify`
checks the cited metadata contract and exact file bytes. Require a successful
exit status; an error is not a partially successful verification.

### Convert metadata or make a compatible working copy

```sh
bioheaders convert genome.fhr.fasta metadata.json
bioheaders validate metadata.json
bioheaders strip genome.fhr.fasta genome.stripped.fasta
```

The stripped FASTA has the original sequence bytes. Keep `genome.fhr.fasta` as
the metadata-bearing original and use new output paths. Stripping is a copying
operation, not proof that the input was valid. Some FASTA indexers require a
stripped copy; follow the
[tool compatibility guide](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/TOOL_COMPATIBILITY.md).
Native library read/verify functions and their output handling are linked from
[Language libraries](/language-libraries/#read-the-result-not-just-the-metadata).

## What the checks establish

- **Schema validation:** the metadata follows its cited supported contract.
- **File verification:** the specified file bytes match the checksum.
- **Parent or model checks:** separate operations compare supplied relationships
  with available evidence; unavailable evidence stays unchecked.
- **Feature and biological checks:** separate tools assess the GFF3 content,
  ontology or biological assertions.

A parsed record, a displayed table or a successful package build does not prove
all of these. The [library result guide](/language-libraries/#read-the-result-not-just-the-metadata)
helps you interpret API results. GFF3 checks belong to
[gff3-validator](https://github.com/FAIR-bioHeaders/gff3-validator), separately
from its metadata header.

## Versions and existing files

`schemaVersion` is the metadata contract version. A shared release tag identifies
a specification package; the resource's `version` identifies your genome or other
data. These are different values.

The example uses a fixed supported citation. Readers must not silently replace
an unknown cited version with a newer schema. Existing released citations keep
their frozen contracts; a new publication is not a reason to rewrite a valid
old header. Editing file-bound metadata requires checksum recomputation.

Each [language guide](/language-libraries/#check-support-before-choosing-a-library)
records its own supported subset. Browser coverage is listed on the
[table builder](/table-builder/). For migration details, read the
[schema-version policy](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/main/docs/SCHEMA-VERSIONS.md).

## FAQ

**How do I check an existing file?**
Run `bioheaders verify your-file.fhr.fasta` for the supported file type. In an
application, choose a reader from [Language libraries](/language-libraries/)
and require its appropriate overall success result. Inspect warnings too.

**Can I write a header with every library?**
No. The Python toolkit has writing commands; the native-language guides describe
reader/verifier subsets. Check the [library comparison](/language-libraries/)
before building a workflow around a missing operation.

**What if validation fails?**
Read the error, correct the source metadata and regenerate the output with a new
checksum. Preserve your original file. Do not treat an unchecked layer as passed.

**Where should I report a problem?**
Use the chosen library's repository for implementation bugs, and
[FAIR BioHeaders Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues)
for shared contract questions. The [language guides](/language-libraries/)
link their source repositories and capability documentation.

**Which citation should I use?**
Cite the [FHR paper](https://doi.org/10.1093/bib/bbae122) for its general description,
and the version DOI of the specification or software you used for reproducibility.
See [Resources and citation](/resources/).
