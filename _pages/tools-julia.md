---
layout: single
title: "Julia tools"
permalink: /tools/julia/
excerpt: "Set up and use the native Julia source library for FAIR BioHeaders."
---

## Setup

Use Julia **1.12 or later**: the required SHA-512/256 API determines the runtime
floor. In a clean Julia session, create a local `bioheaders-example` project
directory and install this source revision:

```julia
import Pkg
Pkg.activate("bioheaders-example"; shared=false)
Pkg.add(url="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Julia",
        rev="d5aa9a5f82d744178dfa1ddeb6ede2bc0925a606")
```

This selects repository source rather than a General registry release.

## Read and inspect results

After installation completes in the same session:

```julia
using FAIRBioHeaders
result = verify_file("genome.fhr.fasta")
result.ok
result.computed
println(result)
```

`verify_file()` coordinates framing, checksum, YAML portability and cited-contract
validation. `read_fhr_file()`, `read_fhr_header()`, `header_checksum()`,
`select_contract()` and `validate_record()` expose individual layers; consult
the source docstrings before calling them independently.

The digest comes from Julia's SHA standard library, compression from CodecZlib,
and draft/2020-12 validation from CorvusJsonSchema with asserted formats.
The package is a reader/verifier, not a header writer. Optional pinned drafts
require an explicit per-call choice and do not inherit new publication support.
The source conformance suite reports its own unavailable serializations; skipped
coverage is not a pass.

## Support and further reading

The exact source-install and API example were exercised in a fresh Julia 1.13.2
project: valid plain and gzip files passed with the expected checksum, while
a modified sequence failed. This recipe check is separate from full native
acceptance and does not turn unavailable formats or layers into passes.

This guide records source commit `d5aa9a5f82d744178dfa1ddeb6ede2bc0925a606` (tested source revision, November 20, 2026).
The build's released header set is FHR 2.1, FHP 1.2 and FHGFF3 1.2 from shared
v0.6.0. FHT and FHGM recognition at this pin is an explicit historical draft
lane, not support for the subsequently published v0.7.0/v0.8.0 contracts.
Use the [pinned README](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Julia/tree/d5aa9a5f82d744178dfa1ddeb6ede2bc0925a606/README.md) and
[capability documentation](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Julia/tree/d5aa9a5f82d744178dfa1ddeb6ede2bc0925a606/docs/) for detailed limits and API guidance.
Current development may have advanced; inspect changes before updating a pin.

These are starting commands and API examples, not a claim that a new registry
artifact was published. Keep file/schema/parent/model verdicts separate and
never interpret a missing layer as verified. See [all tools](/tools/) and
[the browser lesson](/metadata-viewer/) for other workflows.
