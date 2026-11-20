---
layout: single
title: "R tools"
permalink: /tools/r/
excerpt: "Set up and use the native R source library for FAIR BioHeaders."
---

An R installation with package dependencies from `DESCRIPTION`, a C compiler and
zlib development headers is required. The native code builds SHA-512/256 and
strict gzip handling; `digest` is not a substitute for SHA-512/256.

```sh
git clone https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-R.git
cd FAIR-bioHeaders-Tools-R
git checkout a91e135aa11c56ca37f99d222430343babe4da30
R CMD build .
R CMD INSTALL FAIRbioHeadersTools_0.1.0.tar.gz
```

Install the dependencies before building (for example in R):

```r
install.packages(c("digest", "jsonlite", "jsonvalidate", "yaml"))
```

`jsonvalidate` also needs its V8 dependency available on your platform;
consult its installation instructions if compilation reports missing libraries.
Install the `DESCRIPTION` dependencies before building; package installation
reports missing dependencies rather than providing a standalone binary.

```r
library(FAIRbioHeadersTools)
x <- bh_read("genome.fhr.fasta")
x$valid
x$checksum
x$selection
bh_verify("genome.fhr.fasta")   # checksum-only layer
bh_validate("genome.fhr.fasta") # cited-contract layer
?bh_read
```

`bh_extract_header()` exposes metadata; `bh_sha512_256_file()` computes the digest.
`bh_capability()` and package help explain the per-operation result. The source
suite is separate from the installed package. JSON-LD and microdata readers are
not implemented at this pin; draft FHGM cross-record checks also have explicit
not-run coverage. Do not turn these gaps into successful validation.

## Support and further reading

This guide records source commit `a91e135aa11c56ca37f99d222430343babe4da30` (reviewed November 20, 2026).
The build's released header set is FHR 2.1, FHP 1.2 and FHGFF3 1.2 from shared
v0.6.0. FHT and FHGM recognition at this pin is an explicit historical draft
lane, not support for the subsequently published v0.7.0/v0.8.0 contracts.
Use the [pinned README](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-R/tree/a91e135aa11c56ca37f99d222430343babe4da30/README.md) and
[capability documentation](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-R/tree/a91e135aa11c56ca37f99d222430343babe4da30/docs/) for detailed limits and API guidance.
Current development may have advanced; inspect changes before updating a pin.

These are starting commands and API examples, not a claim that a new registry
artifact was published. Keep file/schema/parent/model verdicts separate and
never interpret a missing layer as verified. See [all tools](/tools/) and
[the browser lesson](/metadata-viewer/) for other workflows.
