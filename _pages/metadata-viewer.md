---
title: "Metadata viewer"
permalink: /metadata-viewer/
excerpt: "Inspect FAIR BioHeaders JSON metadata locally, with clear parsing and verification boundaries."
---

Inspect a **JSON metadata record** for a genome (FHR), protein set (FHP), or
annotation (FHGFF3). Choose an example or a local file up to **256 KiB**. Your
local file stays in your browser; it is not uploaded or saved to this site.
Clear the display or reload to discard it.

This first version displays metadata only. **Schema validation, sequence-file
checksums and parent verification are not performed.** A recognized schema URL
is not proof of a valid header or a verified file. Values, identifiers, URLs and
reported statistics are shown as supplied, without resolving them.

FASTA, GFA, GFF3, YAML and HTML files are not supported inputs. Export JSON
metadata with [FAIR BioHeaders Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools)
first. FHT awaits its reviewed contract. The [table builder]({{ '/table-builder/' | relative_url }})
is the separate tool for entering metadata and generating exports.

## Inspect metadata

<noscript><p><strong>JavaScript is required for the viewer.</strong> You can read
<a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/tree/v0.4.0/examples">released metadata examples</a>
and use FAIR BioHeaders Tools locally instead.</p></noscript>

<div id="metadata-viewer" class="mv-viewer">
  <div class="mv-field">
    <label for="mv-file">Local JSON metadata file</label>
    <input id="mv-file" type="file" accept=".json,application/json" aria-describedby="mv-file-help" data-viewer-control disabled>
    <p id="mv-file-help">One JSON metadata object, at most 256 KiB. Selecting a file replaces the displayed record.</p>
  </div>
  <div class="mv-field">
    <label for="mv-example">Bundled example</label>
    <select id="mv-example" data-viewer-control disabled>
      <option value="{{ '/assets/examples/viewer/minimal-fhp.json' | relative_url }}">Minimal protein-set metadata (FHP)</option>
      <option value="{{ '/assets/examples/viewer/rich-fhp.json' | relative_url }}">Rich protein-set metadata (FHP)</option>
      <option value="{{ '/assets/examples/viewer/minimal-fhgff3.json' | relative_url }}">Minimal annotation metadata (FHGFF3)</option>
      <option value="{{ '/assets/examples/viewer/rich-fhgff3.json' | relative_url }}">Rich annotation metadata (FHGFF3)</option>
      <option value="{{ '/assets/examples/viewer/minimal-fhr.json' | relative_url }}">Synthetic genome metadata (FHR)</option>
      <option value="{{ '/assets/examples/viewer/no-header.json' | relative_url }}">JSON without a header identity</option>
      <option value="{{ '/assets/examples/viewer/unsupported.json' | relative_url }}">Unsupported schema version</option>
      <option value="{{ '/assets/examples/viewer/invalid.txt' | relative_url }}">Malformed JSON</option>
    </select>
  </div>
  <div class="mv-actions">
    <button id="mv-example-load" type="button" class="btn" data-viewer-control disabled>Load example</button>
    <button id="mv-clear" type="button" class="btn" data-viewer-control disabled>Clear metadata</button>
  </div>
  <p id="mv-status" role="status" aria-live="polite">The viewer is loading. If it cannot start, use the toolkit locally.</p>
  <h2>Metadata display</h2>
  <fair-bioheaders-metadata></fair-bioheaders-metadata>
</div>

## Examples and verification

The FHP and FHGFF3 examples come from the shared specification's
[v0.4.0 release](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/releases/tag/v0.4.0).
The genome record and error cases are synthetic. Placeholder identifiers,
checksums, sources and software in these examples are not verified biological
data. Nested values retain their field paths and array order in the display.

For schema, sequence checksum or parent-link checks, use the toolkit's documented
validation and verification commands. This viewer does not contact external
services or automatically fetch schemas, parents or links in your metadata.

<script src="{{ '/assets/js/metadata-viewer.js' | relative_url }}"></script>
