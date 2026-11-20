---
layout: single
title: "Julia tools"
permalink: /tools/julia/
excerpt: "Set up and use the native Julia source library for FAIR BioHeaders."
---

## Setup

Use Julia **1.12 or later**: the required SHA-512/256 API determines the runtime
floor. In a clean project environment, install this source revision:

```julia
import Pkg
Pkg.activate("bioheaders-example"; shared=false)
Pkg.add(url="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Julia",
        rev="8b306fac947c615b1c170e6ac76d8cb60665057b")
using FAIRBioHeaders
result = verify_file("genome.fhr.fasta")
result.ok
result.computed
println(result)
```

This selects repository source rather than a General registry release.

## Read and inspect results

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

This guide records source commit `8b306fac947c615b1c170e6ac76d8cb60665057b` (reviewed November 20, 2026).
The build's released header set is FHR 2.1, FHP 1.2 and FHGFF3 1.2 from shared
v0.6.0. FHT and FHGM recognition at this pin is an explicit historical draft
lane, not support for the subsequently published v0.7.0/v0.8.0 contracts.
Use the [pinned README](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Julia/tree/8b306fac947c615b1c170e6ac76d8cb60665057b/README.md) and
[capability documentation](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Julia/tree/8b306fac947c615b1c170e6ac76d8cb60665057b/docs/) for detailed limits and API guidance.
Current development may have advanced; inspect changes before updating a pin.

These are starting commands and API examples, not a claim that a new registry
artifact was published. Keep file/schema/parent/model verdicts separate and
never interpret a missing layer as verified. See [all tools](/tools/) and
[the browser lesson](/metadata-viewer/) for other workflows.
