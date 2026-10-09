---
title: "FHR table builder"
permalink: /table-builder/
excerpt: "A browser-only prototype that builds a readable genome metadata table and FHR metadata from a form."
---

This is an **FHR-only prototype**. It builds one reference-genome metadata
record at a time from a form, validates it against the authoritative FHR JSON
schema, and produces a readable table plus a metadata file you can download.
Everything runs in your browser; nothing is uploaded and nothing is saved to
this site. This tool is for FHR reference genomes only; transcriptome, protein,
and annotation headers are not included.

**Schema:** requiredness and types follow
[the raw `main` FHR JSON schema](https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json).
This page uses a cached copy of that schema (`assets/schema/fhr.json`); see
[maintenance](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/blob/main/docs/maintenance.md)
for retrieval provenance and refresh behavior. Validation here is structural
only: passing it is not a claim about biological quality, it does not verify a
checksum against any file, and it is not a journal or repository acceptance.

## What it checks

- **Schema validity** — required fields, scalar types, patterns, and unknown
  properties, following the raw-main contract. It does not tighten the schema or
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
  read the <a href="https://github.com/FAIR-bioHeaders/FHR-Specification/tree/main/examples">FHR
  examples</a> and use the <a href="{{ '/guide/' | relative_url }}">Using FHR
  guide</a> to build a header or metadata file by hand.</p>
</noscript>

<div id="table-builder" data-schema="{{ '/assets/schema/fhr.json' | relative_url }}">
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
