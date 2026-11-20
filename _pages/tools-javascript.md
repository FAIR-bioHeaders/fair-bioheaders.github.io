---
layout: single
title: "JavaScript (Node.js) tools"
permalink: /tools/javascript/
excerpt: "Set up and use the native JavaScript (Node.js) source library for FAIR BioHeaders."
---

## Setup

Use Node.js 20 or later (development uses Node 24). This ESM library uses
Node crypto, zlib and Ajv; it is separate from the browser metadata lesson.
Install this exact source revision in your own Node project:

```sh
npm install 'git+https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-JavaScript.git#bac1781aac5162ccb18003a8bc268fe576f6eba7'
```

## Read and inspect results

Save as `read.mjs`, then run `node read.mjs` with your own local file:

```js
import { inspectFile } from 'fair-bioheaders';
const result = inspectFile('genome.fhr.fasta');
console.log(result.valid, result.schema, result.checksum);
console.log(result.errors, result.warnings);
```

`inspectFileAsync()` and `inspectStream()` provide asynchronous reading;
`stripFileTo()` writes stripped content to a destination. Read the source usage
instructions for output behavior and resource limits before processing large files.
Invalid file content is reported in `errors`; filesystem and other operational
errors also need handling by your application. Require `result.valid === true`
for acceptance: an invalid reading can have placeholder or incomplete layer
results, and its errors need not enumerate every problem. `validateRecord()` checks a record
against an explicit selection and does not verify its containing file.

Stripping removes the header without validating its checksum or schema and can
replace an existing output. Inspect the input first and choose a new destination.

There is no header writer, browser build, JSON-LD or microdata reader at this pin.
Parent checks require caller-supplied evidence in the explicit draft lane.
A Node library result is not a result from the website tools.

## Support and further reading

This guide records source commit `bac1781aac5162ccb18003a8bc268fe576f6eba7` (source snapshot recorded November 20, 2026).
The build's released header set is FHR 2.1, FHP 1.2 and FHGFF3 1.2 from shared
v0.6.0. FHT and FHGM recognition at this pin is an explicit historical draft
lane, not support for the subsequently published v0.7.0/v0.8.0 contracts.
Use the [pinned README](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-JavaScript/tree/bac1781aac5162ccb18003a8bc268fe576f6eba7/README.md) and
[capability documentation](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-JavaScript/tree/bac1781aac5162ccb18003a8bc268fe576f6eba7/docs/) for detailed limits and API guidance.
Current development may have advanced; inspect changes before updating a pin.

These are starting commands and API examples, not a claim that a new registry
artifact was published. Keep file/schema/parent/model verdicts separate and
never interpret a missing layer as verified. See [all tools](/tools/) and
[the browser lesson](/metadata-viewer/) for other workflows.
