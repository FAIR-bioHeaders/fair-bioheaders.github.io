---
title: "FAIR BioHeaders JavaScript: demo and implementation guide"
permalink: /metadata-viewer/
excerpt: "Try a local metadata viewer, then embed the FAIR BioHeaders display component on your own website."
---

Try the live example below, then [embed the same component on your own website](#embed-on-your-own-website).
This draft JavaScript display accepts a JSON metadata record; it is not yet a
released reader or validator library.

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

## Try the live example

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

## Embed on your own website

### 1. Add the two component files

Copy the <a href="{{ '/assets/js/metadata-viewer.js' | relative_url }}" download>JavaScript</a>
and <a href="{{ '/assets/css/metadata-display.css' | relative_url }}" download>component CSS</a>
into your own project at `/assets/js/metadata-viewer.js` and
`/assets/css/metadata-display.css`, or adjust the two paths in the example.
Serve your page over HTTP, including during local development.

No framework, package manager, account or FAIR BioHeaders service is required.
The script registers `<fair-bioheaders-metadata>`; the optional, scoped stylesheet
uses your site's font and colors. These are draft assets: copy and pin the
reviewed revision in your project rather than relying on a moving hosted script.

### 2. Put the component in your page

The complete snippet below creates the display, waits for registration, supplies
a synthetic JSON record and reports errors as text. It uses the same bounded
adapter as the live example. [Open the standalone embedding example]({{ '/metadata-viewer/embed/' | relative_url }})
to see this exact snippet running without the FAIR BioHeaders website theme.

{% capture embedding_example %}{% include metadata-embed.html %}{% endcapture %}
<pre id="mv-embed-code" tabindex="0" role="region" aria-label="Complete embedding example HTML"><code>{{ embedding_example | escape }}</code></pre>

The sample's checksum and authors are placeholders. Displaying it does not
validate its schema or verify any sequence or parent file. If your site uses a
Content Security Policy, place the inline module in an allowed local JavaScript
file or use your site's nonce policy; do not relax the policy for record values.

### 3. Supply your own metadata

After registration, assign JSON text to the element's **`json` property** inside
a `try`/`catch`. If your application already has a metadata object, use
`JSON.stringify(record)` as above. An empty string clears the display.
Rejected replacements clear the previous record and throw an error; show
`error.message` with `textContent` in your own status element.

| Interface | Behavior |
| --- | --- |
| `await customElements.whenDefined('fair-bioheaders-metadata')` | Wait until the display API is registered. |
| `display.json = jsonText` | Parse bounded JSON, recognize identity and render values. It does not validate or verify them. |
| `display.json = ''` | Remove the displayed record. |
| `try` / `catch` | Handle malformed JSON, unsafe numbers, or input/output limits without keeping a stale display. |

The JSON input limit is 256 KiB, with at most 3,000 values and 12 nesting levels.
Expanded field paths and values have a separate 512 Ki-character budget, so long
shared field names cannot multiply into an unbounded table. Numbers that overflow,
underflow to zero, or exceed safe integer precision are rejected. Standard JSON
parsing uses the last occurrence of a duplicate property name; duplicate-name
and schema conformance checks are not implemented by this display adapter.

### What your integration owns

Choose how users provide JSON and how you display status/errors. A local file
picker must check file size before reading; a remote-data source must be an
explicit part of your application with appropriate privacy and network behavior.
The component itself does not fetch links, schemas, parents or record URLs, and
it inserts metadata as text. Avoid inserting metadata into HTML or inline script
source: assign it through the property from JavaScript instead.

Only a reviewed reader/validator can provide schema checks or sequence/header
parsing. Actual checksum and parent verification require the corresponding
files and supported coverage rules. Those capabilities and a JBrowse integration
remain [follow-up work in issue #23](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues/23).
FHP/FHGFF3/FHT HTML microdata bindings are separate from displaying JSON.

<script src="{{ '/assets/js/metadata-viewer.js' | relative_url }}"></script>
