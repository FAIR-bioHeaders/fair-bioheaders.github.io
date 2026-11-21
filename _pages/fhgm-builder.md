---
title: "FHGM model record builder"
permalink: /fhgm-builder/
excerpt: "Prepare a native FHGM gene-model record and download a readable table, JSON or YAML without uploading your data."
---

Describe one gene-model contribution, then download its metadata and a readable
table. **FHGM describes a model inside an annotation; FHGFF3 describes the whole
annotation file.** Use the [header table builder](/table-builder/) for file-level metadata.

This form uses the published **FHGM native model contract 0.1** from shared
[v0.8.0](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/v0.8.0/model-contracts/fhgm/0.1).
It checks record structure only. It cannot check that the target gene exists,
that the genome reference matches an annotation, or that a predecessor, checksum
or biological assertion is correct. See [the FHGM reference](/specifications/fhgm/)
for these separate checks.

Your entries stay in this open browser page. Nothing is uploaded, saved to the
site or fetched from a URL you enter. Reloading discards the form.

## Build a model record

Enter your own identifiers and reference values; the builder does not invent
them. Add optional information only when you have it. Version labels are text,
not numbers to sort. The form supports all fields in this pinned contract.
It allows up to 100 entries in each repeatable field and 1 MiB per record.

<p data-fhgm-fallback><strong>JavaScript is required for the form.</strong> Read the
<a href="/specifications/fhgm/">FHGM reference</a> for the published schema.</p>

<link rel="stylesheet" href="{{ '/assets/css/fhgm-builder.css' | relative_url }}">
<div id="fhgm-builder" data-schema="{{ '/assets/schema/fhgm-0.1.json' | relative_url }}">
  <form novalidate>
    <div data-model-fields tabindex="-1"></div>
    <button type="submit" class="btn" disabled>Check structure and build table</button>
  </form>
  <p role="status" aria-live="polite">Loading the pinned model contract…</p>
  <div data-model-errors class="tb-errors" hidden></div>
  <div class="tb-actions">
    <button type="button" data-download="html" disabled>Download HTML table</button>
    <button type="button" data-download="json" disabled>Download record (JSON)</button>
    <button type="button" data-download="yaml" disabled>Download record (YAML)</button>
    <button type="button" data-download="snippet" disabled>Download header snippet</button>
  </div>
  <h2>Readable table</h2>
  <div data-model-table class="tb-table" role="region" aria-label="Model record table" tabindex="0"></div>
  <h2>Record source (JSON)</h2>
  <pre data-source="json" class="tb-source" tabindex="0"></pre>
  <h2>Record source (YAML)</h2>
  <pre data-source="yaml" class="tb-source" tabindex="0"></pre>
  <h2>Header insertion snippet (YAML)</h2>
  <pre data-source="snippet" class="tb-source" tabindex="0"></pre>
</div>

## Use the result

The JSON and YAML downloads contain one native model record, with no in-record
schema or header version field. The contract is selected outside the record.
The HTML is a readable table, **without a machine-readable FHGM HTML binding**.

The snippet wraps your record in an `x-fhgm-models` list. Merge it into your
FHGFF3 metadata, preserving any existing models; do not replace the enclosing
header or paste it into GFF3 feature rows. Changing model metadata changes the
file bytes: regenerate the enclosing header and its checksum using a supported
writer, then run the separate model and file checks. No file is modified by this page.

<script src="{{ '/assets/js/table-builder.js' | relative_url }}"></script>
<script src="{{ '/assets/js/fhgm-builder.js' | relative_url }}"></script>
