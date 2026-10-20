---
title: "JavaScript with FHR headers: JSON and microdata"
permalink: /metadata-viewer/
excerpt: "Read, query and change FHR JSON metadata, extract an HTML microdata example, and display it on your own website."
---

Use JavaScript to read an FHR header's **JSON metadata**, select fields, change a
copy, and extract the same record from **HTML microdata**. The examples below run
in your browser. Copy the code into your own webpage and adapt the display.

The sample is synthetic FHR v0.4.0 metadata (`schemaVersion: "2.0"`), with a
placeholder checksum. Parsing metadata does not validate its schema or verify a
sequence file. These examples do not change a header embedded in a sequence file.

## 1. Read and query JSON

`JSON.parse` turns JSON text into a JavaScript object. Access nested fields with
property access, and use `map` to read ordered author arrays. Keep the quoted
schema version as a string and numeric statistics as numbers, including zero.
The playground applies the display adapter's size and numeric limits first.

```javascript
const record = JSON.parse(jsonText);
const genome = record.genome;
const taxon = record.taxon?.name;
const authors = (record.metadataAuthor || []).map(author => author.name);
const N50 = record.vitalStats?.N50; // 0 is a value; do not replace it with ||.
```

<div class="mv-field">
<label for="fhr-json-input">FHR JSON to experiment with (256 KiB maximum)</label>
<textarea class="tb-input" id="fhr-json-input" rows="12" spellcheck="false" aria-describedby="fhr-playground-help" data-fhr-example-control disabled></textarea>
<p id="fhr-playground-help">Edit the JSON, then run it. Reload or read the microdata example to restore the synthetic record. Nothing is uploaded or saved.</p>
</div>
<button id="fhr-run-json" type="button" class="btn" data-fhr-example-control disabled>Run JSON example</button>
<button id="fhr-edit-json" type="button" class="btn" data-fhr-example-control disabled>Change genome in a copy</button>
<p id="fhr-playground-status" role="status" aria-live="polite">Enable JavaScript to run the examples.</p>
<pre id="fhr-query-output" role="region" tabindex="0" aria-label="JavaScript query results"></pre>
<fair-bioheaders-metadata id="fhr-playground-display"></fair-bioheaders-metadata>

## 2. Change a copy and serialize it

Copy the parsed record, change a field, and turn it back into JSON. The button
above runs this operation and puts the result in the editor. The microdata
example stays unchanged so you can compare or restore it.

```javascript
const copy = structuredClone(record);
copy.genome = 'My JavaScript example';
const jsonText = JSON.stringify(copy, null, 2);
// Display as text, never as HTML supplied by the record.
document.querySelector('#output').textContent = jsonText;
```

`#output` is a `<pre id="output"></pre>` on your own page. This serializes an
in-memory metadata copy only. It does not recompute a sequence checksum or update
any sequence-file header. Validate edited metadata against its cited contract
before using it in a file workflow.

## 3. Read an HTML microdata example

HTML microdata carries properties in `itemprop` attributes inside an `itemscope`.
The root `itemtype` below is the established FHR binding identity; the `schema`
property selects the record's fixed release. A nested object's own properties
must stay in its scope. Arrays use ordered `item` children. The existing FHR
writer's `data-fhr-type` markers preserve strings, numbers and container types.

{% capture fhr_microdata %}{% include fhr-microdata-example.html %}{% endcapture %}
<pre id="fhr-microdata-code" role="region" tabindex="0" aria-label="FHR HTML microdata example"><code>{{ fhr_microdata | escape }}</code></pre>
<template id="fhr-microdata-template">{{ fhr_microdata }}</template>

<button id="fhr-read-microdata" type="button" class="btn" data-fhr-example-control disabled>Read microdata into JSON</button>

This button extracts the authored example above into the JSON editor and runs
the same query/display. Its record matches the initial JSON, including the
ordered author objects and numeric zero. Nothing from the HTML is inserted into
the live page. The template holds the example without rendering it.

```html
<script src="/assets/js/fhr-javascript-example.js"></script>
```

Copy the [teaching helper]({{ '/assets/js/fhr-javascript-example.js' | relative_url }})
into your project, place the sample markup in your document, then read it:

```javascript
const root = document.querySelector('#fhr-example');
const record = FhrExamples.readMicrodata(root);
console.log(record.taxon.name);
console.log(record.metadataAuthor.map(author => author.name));
console.log(JSON.stringify(record, null, 2));
```

The helper's source shows the DOM traversal: `node.children` preserves container
scope; `getAttribute('itemprop')` names each property; `textContent` reads leaf
spans; and the explicit type marker determines conversion. It rejects repeated
object properties instead of losing values. It reads **this explicit typed
span/container layout only**. General HTML microdata (including `itemref`, URL or
`meta` value rules, omitted type markers and unrelated scopes) requires the
reviewed toolkit reader; this small example is not a replacement parser.
Do not load arbitrary HTML into your webpage to inspect it.

## Inspect another JSON record

The existing display below also accepts bounded JSON examples for FHP/FHGFF3.
The JavaScript lesson above focuses on FHR; those additional examples do not
establish HTML microdata support for other header types. FASTA, GFA, GFF3, YAML
and HTML uploads are not accepted. Export JSON metadata with
[FAIR BioHeaders Tools](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools)
for this display. The [table builder]({{ '/table-builder/' | relative_url }}) is
for entering metadata and generating exports.


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
      <option value="{{ '/assets/examples/viewer/minimal-fhr.json' | relative_url }}">Synthetic genome metadata (FHR)</option>
      <option value="{{ '/assets/examples/viewer/minimal-fhp.json' | relative_url }}">Minimal protein-set metadata (FHP)</option>
      <option value="{{ '/assets/examples/viewer/rich-fhp.json' | relative_url }}">Rich protein-set metadata (FHP)</option>
      <option value="{{ '/assets/examples/viewer/minimal-fhgff3.json' | relative_url }}">Minimal annotation metadata (FHGFF3)</option>
      <option value="{{ '/assets/examples/viewer/rich-fhgff3.json' | relative_url }}">Rich annotation metadata (FHGFF3)</option>
      <option value="{{ '/assets/examples/viewer/no-header.json' | relative_url }}">JSON without a header identity</option>
      <option value="{{ '/assets/examples/viewer/unsupported.json' | relative_url }}">Unsupported schema version</option>
      <option value="{{ '/assets/examples/viewer/invalid.txt' | relative_url }}">Malformed JSON</option>
    </select>
  </div>
  <div class="mv-actions">
    <button id="mv-example-load" type="button" class="btn" data-viewer-control disabled>Load example</button>
    <button id="mv-clear" type="button" class="btn" data-viewer-control disabled>Clear metadata</button>
  </div>
  <p id="mv-status" role="status" aria-live="polite">The JSON display is loading. If it cannot start, use the toolkit locally.</p>
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
files and supported coverage rules. The JavaScript examples and their supported boundaries are tracked in [issue #23](https://github.com/FAIR-bioHeaders/fair-bioheaders.github.io/issues/23).
FHP/FHGFF3/FHT HTML microdata bindings are separate from displaying JSON.

<script src="{{ '/assets/js/metadata-viewer.js' | relative_url }}"></script>
<script src="{{ '/assets/js/fhr-javascript-example.js' | relative_url }}"></script>
<script src="{{ '/assets/js/fhr-javascript-playground.js' | relative_url }}"></script>
