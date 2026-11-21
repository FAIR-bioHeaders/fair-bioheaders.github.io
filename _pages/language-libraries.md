---
title: "Language libraries"
permalink: /language-libraries/
excerpt: "Choose a FAIR BioHeaders library for Python, R, JavaScript, Java or Julia, then follow its setup and API guide."
---

Use FAIR BioHeaders from the language you already work in. Start with a guide
below, check that it supports your file type, then inspect the result before
using the data. A successful read is different from a verified file checksum.

## Choose your language

<div class="field-table language-library-table" role="region" aria-label="Language library choices" tabindex="0" markdown="1">

| Language | Start here | Installation described by the guide | Main use |
| --- | --- | --- | --- |
| Python | [Toolkit setup and commands](/tools/) | Published `fair-bioheaders` 0.13.1 from PyPI | Write, combine, validate, verify, strip and convert supported headers |
| R | [R setup and API](/tools/r/) | Pinned source package; R dependencies, a C compiler and zlib headers | Read headers, inspect metadata and check schemas or checksums |
| JavaScript | [Node.js setup and API](/tools/javascript/) | Pinned Git source installed with npm; Node.js 20 or later | Read and verify files, or strip headers with explicit resource/output controls |
| Java | [Java setup and API](/tools/java/) | Pinned source build with JDK 17 or later and Maven wrapper | Read/verify through the JVM library or command line |
| Julia | [Julia setup and API](/tools/julia/) | Pinned source package; Julia 1.12 or later | Read metadata and verify file headers |

</div>

The four native-language guides describe tested source revisions, **not new
CRAN, npm-registry, Maven Central or Julia General releases**. Their repositories
may have newer work. Keep the guide's exact revision until you have reviewed and
tested an update. Build success alone is not conformance evidence.

For Python API details, see the
[toolkit's Python guide](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools/blob/v0.13.1/README.md).
For a complete command-line example, follow the
[current FHR-only workflow](/guide/#current-fhr-only-workflow).
For writing metadata in a form, use the [browser table builder](/table-builder/).

## Check support before choosing a library

The existing R, Node.js, Java and Julia guides pin readers for **FHR 2.1, FHP 1.2
and FHGFF3 1.2**, based on shared v0.6.0. Their optional historical FHT/FHGM lanes
are separate from support for the later published contracts. Publishing a
specification does not update a library automatically.

The Python toolkit 0.13.1 supports published FHT 1.0 without a development flag.
Its native FHGM model checker remains an explicit opt-in with separate results.
Use [the contract reference](/specifications/) for field meanings and the
chosen language guide's capability links for exact operation and format limits.
The native readers do not all implement writers, JSON-LD or HTML microdata.

## Read the result, not just the metadata

Keep these questions separate when using an API:

1. **Was the record read?** The parser extracted metadata from the supplied file.
2. **Does the metadata follow its cited contract?** The library checked a supported schema.
3. **Do the file bytes match the checksum?** The library performed its file-integrity check.
4. **Were parent or model relationships checked?** These need their own supported operations and supplied evidence.

An unavailable check means unchecked, not passed. Require the library's overall
success result for the operation you need, and inspect errors and warnings.
GFF3 feature structure and biological validity need separate tools.

## Browser JavaScript is a separate workflow

The [browser JavaScript lesson](/metadata-viewer/) shows how to read, query, edit
and display the lesson's authored JSON and HTML metadata. It is not the Node.js
package and does not verify a sequence file. The browser builder prepares
metadata; it does not replace a library's file checks.

Continue with [Using FH*](/guide/) to choose a header and follow a file workflow,
or [Tools](/tools/) for command-line and browser options.
