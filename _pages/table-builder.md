---
title: "FHR table builder"
permalink: /table-builder/
excerpt: "A browser-only prototype that builds a readable genome metadata table and FHR metadata from a form."
---

This is an **FHR-only prototype**. It builds one reference-genome metadata
record at a time from a form, validates it against a supported FHR schema
snapshot, and produces a readable table plus a metadata file you can download.
Everything runs in your browser; nothing is uploaded and nothing is saved to
this site. This tool is for FHR reference genomes only; transcriptome, protein,
and annotation headers are not included.

**Schema:** requiredness and types follow the selected supported snapshot.
Current released contracts are published in
[FAIR BioHeaders Specification](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification).
The default is [FHR v0.4.0](https://w3id.org/fair-bioheaders/fhr/v0.4.0),
using schema version **2.0** and a fixed local release snapshot. The form includes
personal/organizational author types and separate contig/scaffold statistics.
FHR v0.3.1 remains available through the schema URL field's suggestions. Fields
marked “defined in schema 2.0” have normative definitions in that contract.
Switching releases preserves your entries and applies the selected contract,
including its policy on extra fields.
The read-only schema version follows the selected release; the genome version
is yours to enter. Raw-main explicitly checks only the historical October 9
cache, not today's development schema. Unsupported targets block downloads.
See
[maintenance](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/blob/main/docs/maintenance.md)
for retrieval provenance and refresh behavior. Validation here is structural
only: passing it is not a claim about biological quality, it does not verify a
checksum against any file, and it is not a journal or repository acceptance.

## What it checks

- **Schema validity** — required fields, scalar types, patterns, and unknown
  properties, following the selected supported schema contract. It does not tighten the schema or
  add new required fields.
- **Completeness** — missing required fields are listed with links back to the
  field, and downloads stay disabled until the record validates.
- **Not checked** — a file checksum is only structurally checked. It cannot be
  called verified without the sequence bytes and the approved coverage
  algorithm. SeqCol IDs are kept separate and are not computed here.

After you edit anything, the preview is marked stale and the download buttons
are disabled until you generate again.

## Build a record

<noscript>
  <p><strong>JavaScript is required to use the form.</strong> You can still
  read the <a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/v0.3.1/examples">FHR
  examples</a> and use the <a href="{{ '/guide/' | relative_url }}">Using FHR
  guide</a> to build a header or metadata file by hand.</p>
</noscript>

<div id="table-builder" data-schema="{{ '/assets/schema/fhr.json' | relative_url }}" data-current-schema="{{ '/assets/schema/fhr-v0.4.0.json' | relative_url }}" data-release-schema="{{ '/assets/schema/fhr-v0.3.1.json' | relative_url }}">
  <div id="tb-form"></div>

  <div class="tb-actions">
    <button type="button" id="tb-generate" class="btn">Validate / Generate</button>
    <button type="button" id="tb-download-html" class="btn" disabled>Download HTML table</button>
    <button type="button" id="tb-download-yaml" class="btn" disabled>Download FHR metadata (YAML)</button>
  </div>

  <p id="tb-status" class="tb-status" role="status" aria-live="polite"></p>

  <div id="tb-errors" class="tb-errors" hidden></div>

  <h2>Table preview</h2>
  <div id="tb-table" class="tb-table"></div>

  <h2>Standalone HTML source</h2>
  <p>This is the complete HTML document, including the readable table and FHR
  microdata. Its download uses exactly this text.</p>
  <pre id="tb-html-source" class="tb-source" tabindex="0"></pre>

  <h2>FHR metadata source (YAML)</h2>
  <p>This is the metadata file. Its download uses exactly this text.</p>
  <pre id="tb-yaml-source" class="tb-source" tabindex="0"></pre>
</div>

<script src="{{ '/assets/js/table-builder.js' | relative_url }}"></script>
