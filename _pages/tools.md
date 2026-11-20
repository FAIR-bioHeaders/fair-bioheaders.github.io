---
layout: single
title: "Tools and language guides"
permalink: /tools/
excerpt: "Choose a CLI, native library or local browser tool for FAIR BioHeaders."
---

Choose the tool for the operation you need. A published contract does not mean
every language library implements it. Check the library's own capability table
before interpreting a result or enabling a draft lane.

| Tool | Start here | Scope |
| --- | --- | --- |
| Python toolkit | [Install and use the reference implementation](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools#readme) | File headers, conversion, writing and validation; published 0.13.1 includes normal FHT support |
| R | [R setup and reading](/tools/r/) | Native source package for reading, checksums and cited-contract validation |
| Node.js | [JavaScript setup and reading](/tools/javascript/) | Native Node reader, verification and stripping |
| Java | [Java setup and reading](/tools/java/) | Native JVM library and verification CLI |
| Julia | [Julia setup and reading](/tools/julia/) | Native source package for reading and verification |
| Browser | [Table builder](/table-builder/) | Prepare typed metadata and download HTML/YAML; structural checks only |
| Browser lesson | [JavaScript metadata examples](/metadata-viewer/) | Read, query, edit and display authored JSON/HTML metadata; independent of the Node package |

For the Python command line, create an isolated environment:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install 'fair-bioheaders==0.13.1'
bioheaders --help
```

Keep original data. Use a new destination when converting or stripping headers,
and recompute file-bound checksums after edits using the toolkit writer.
A valid metadata record is not evidence of biological correctness. Checksum,
parent-link and native model results are separate layers; unavailable evidence
means unchecked, not passed. GFF3 feature validation belongs to
[gff3-validator](https://github.com/FAIR-bioHeaders/gff3-validator), separately
from its metadata header.

The native-language guides linked above describe pinned **source builds**, not registry
installation or a release announcement. Each keeps its own supported contract
set; they do not acquire the Python toolkit's FHT support automatically.
See the [contract reference](/specifications/), [usage guide](/guide/) and
[citation guidance](/resources/) for shared concepts.
