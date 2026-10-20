/* FAIR BioHeaders metadata viewer; MPL-2.0.
 * JSON adapter only: no sequence/container parser or conformance validator.
 * Exports pure inspection functions for Node tests; browser code is page-specific.
 */
(function () {
  'use strict';
  var MAX_BYTES = 262144;
  var MAX_NODES = 3000;
  var MAX_DEPTH = 12;
  var MAX_OUTPUT_CHARS = 524288;

  function inspect(text) {
    if (typeof text !== 'string') throw new Error('Supply JSON text; use JSON.stringify(record) for a metadata object.');
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('Choose a JSON metadata file no larger than 256 KiB. Sequence files are not supported here.');
    if (!text.trim()) return { record: null, type: null, known: false };
    var record;
    try { record = JSON.parse(text); }
    catch (_) { throw new Error('This is not valid JSON metadata. Export a JSON metadata record with FAIR-bioHeaders-Tools; FASTA, GFA, GFF3, YAML and HTML input are not supported here.'); }
    // JSON.parse has already rounded underflow to zero. Inspect original number
    // tokens after syntax validation, skipping complete quoted strings/keys.
    var tokens = /"(?:[^"\\]|\\[\s\S])*"|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/g;
    var token;
    while ((token = tokens.exec(text)) !== null) {
      if (token[0][0] !== '"' && Number(token[0]) === 0 && /[1-9]/.test(token[0].split(/[eE]/)[0])) {
        throw new Error('A numeric value cannot be represented safely in this browser. Use the toolkit to inspect the original metadata.');
      }
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Choose one JSON metadata object, not a list or scalar.');
    checkDisplayBudget(record);
    if (!Object.prototype.hasOwnProperty.call(record, 'schema')) return { record: null, type: null, known: false };
    var identity = typeof record.schema === 'string' ? record.schema : '';
    var match = identity.match(/^https:\/\/w3id\.org\/fair-bioheaders\/(fhr|fhp|fhgff3)\/(v[0-9]+\.[0-9]+\.[0-9]+)\/?$/) ||
      identity.match(/^https:\/\/raw\.githubusercontent\.com\/FAIR-bioHeaders\/(?:FHR|FAIR-bioHeaders)-Specification\/(v[0-9]+\.[0-9]+\.[0-9]+)\/(fhr|fhp|fhgff3)\.json$/);
    var type = 'Unrecognized';
    var release;
    if (match) {
      var raw = identity.indexOf('raw.githubusercontent.com') !== -1;
      type = (raw ? match[2] : match[1]).toUpperCase();
      release = raw ? match[1] : match[2];
    }
    var known = release === 'v0.4.0' && record.schemaVersion === (type === 'FHR' ? '2.0' : '1.0') ||
      type === 'FHR' && release === 'v0.3.1' && record.schemaVersion === 1;
    return { record: record, type: type, release: release, known: Boolean(known) };
  }

  function checkDisplayBudget(record) {
    // Count expanded paths using lengths only, before constructing any of them.
    // An ancestor key can be short in the input but repeated for every leaf.
    var stack = [{ value: record, depth: 0, pathLength: 0 }];
    var count = 0;
    var output = 0;
    while (stack.length) {
      var item = stack.pop();
      if (++count > MAX_NODES || item.depth > MAX_DEPTH) throw new Error('This record is too complex to display (maximum 3,000 values and 12 nesting levels).');
      if (typeof item.value === 'number' && (!Number.isFinite(item.value) || Number.isInteger(item.value) && !Number.isSafeInteger(item.value))) throw new Error('A numeric value cannot be represented safely in this browser. Use the toolkit to inspect the original metadata.');
      var keys = item.value && typeof item.value === 'object' ? Object.keys(item.value) : [];
      if (keys.length) {
        keys.forEach(function (key) {
          var escapedLength = key.length;
          for (var i = 0; i < key.length; i++) if (key[i] === '/' || key[i] === '~') escapedLength++;
          stack.push({ value: item.value[key], depth: item.depth + 1, pathLength: item.pathLength + 1 + escapedLength });
        });
      } else {
        var valueLength = typeof item.value === 'string' ? item.value.length : JSON.stringify(item.value).length;
        output += Math.max(1, item.pathLength) + valueLength;
        if (output > MAX_OUTPUT_CHARS) throw new Error('Expanded metadata is too large to display (maximum 512 Ki characters of field paths and values). Use shorter field names or inspect the record with the toolkit.');
      }
    }
  }

  function rows(record) {
    checkDisplayBudget(record);
    var result = [];
    function visit(value, path) {
      if (value && typeof value === 'object' && Object.keys(value).length) {
        Object.keys(value).forEach(function (key) { visit(value[key], path.concat([key])); });
      } else {
        // JSON Pointer escapes distinguish a literal key containing '/' or '~'.
        var pointer = '/' + path.map(function (key) { return key.replace(/~/g, '~0').replace(/\//g, '~1'); }).join('/');
        result.push({ path: pointer, value: typeof value === 'string' ? value : JSON.stringify(value) });
      }
    }
    visit(record, []);
    return result;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { inspect: inspect, rows: rows, MAX_BYTES: MAX_BYTES, MAX_OUTPUT_CHARS: MAX_OUTPUT_CHARS };
    return;
  }
  if (typeof document === 'undefined') return;

  function element(tag, text, attrs) {
    var node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  class MetadataDisplay extends HTMLElement {
    // Public embedding API: run the same bounded adapter as the page demo.
    // Clear first so a rejected replacement never leaves stale metadata visible.
    set json(text) {
      this.replaceChildren();
      this.metadata = inspect(text);
    }

    set metadata(value) {
      this.replaceChildren();
      if (!value || !value.record) return;
      var record = value.record;
      var boundedRows = rows(record);
      this.appendChild(element('h3', value.type + ' metadata' + (typeof (record.genome || record.proteome || record.annotation) === 'string' ? ': ' + (record.genome || record.proteome || record.annotation) : '')));
      var status = element('ul', undefined, { class: 'mv-checks' });
      ['JSON metadata parsed', 'Schema validation: not checked', 'File checksum: not verified', 'Parent files: not verified'].forEach(function (text) { status.appendChild(element('li', text)); });
      this.appendChild(status);
      this.appendChild(element('p', value.known ? 'Recognized schema/version identity. Recognition is not schema validation.' : 'Unsupported or unrecognized schema/version identity. Values are shown for inspection only; no fallback schema is used.'));
      var region = element('div', undefined, { class: 'mv-table', tabindex: '0', role: 'region', 'aria-label': 'Metadata values; scroll horizontally if needed' });
      var table = element('table');
      table.appendChild(element('caption', 'Metadata fields (JSON Pointer paths)'));
      var head = element('thead');
      var tr = element('tr');
      tr.appendChild(element('th', 'Field', { scope: 'col' }));
      tr.appendChild(element('th', 'Value', { scope: 'col' }));
      head.appendChild(tr); table.appendChild(head);
      var body = element('tbody');
      boundedRows.forEach(function (row) {
        var tr = element('tr');
        tr.appendChild(element('th', row.path, { scope: 'row' }));
        tr.appendChild(element('td', row.value)); body.appendChild(tr);
      });
      table.appendChild(body); region.appendChild(table); this.appendChild(region);
      var details = element('details');
      details.appendChild(element('summary', 'Parsed JSON record'));
      details.appendChild(element('pre', JSON.stringify(record, null, 2), { tabindex: '0', 'aria-label': 'Parsed JSON record' }));
      this.appendChild(details);
    }
  }
  customElements.define('fair-bioheaders-metadata', MetadataDisplay);

  function init() {
    var page = document.getElementById('metadata-viewer');
    if (!page) return;
    var display = page.querySelector('fair-bioheaders-metadata');
    var status = document.getElementById('mv-status');
    var file = document.getElementById('mv-file');
    var sequence = 0;
    var abort;
    function clear() { display.metadata = null; }
    function show(text, label) {
      try {
        var value = inspect(text);
        display.metadata = value;
        status.textContent = value.record ? label + ': JSON metadata parsed. Schema and file verification have not been performed.' : label + ': no FAIR BioHeaders schema identity found. No metadata record is displayed; the original file is unchanged.';
      } catch (error) { clear(); status.textContent = error.message; }
    }
    function cancelPending() { sequence++; if (abort) abort.abort(); }
    file.addEventListener('change', async function () {
      cancelPending(); clear();
      var token = sequence;
      var selected = file.files[0];
      if (!selected) { status.textContent = 'Choose a local JSON metadata file or an example.'; return; }
      if (selected.size > MAX_BYTES) { status.textContent = 'Choose a JSON metadata file no larger than 256 KiB. Sequence files are not supported here.'; return; }
      status.textContent = 'Reading local metadata…';
      try {
        var text = await selected.text();
        if (token === sequence) show(text, selected.name);
      } catch (_) { if (token === sequence) status.textContent = 'The local file could not be read. Choose it again or use an example.'; }
    });
    document.getElementById('mv-example-load').addEventListener('click', async function () {
      cancelPending(); clear(); file.value = '';
      var token = sequence;
      var select = document.getElementById('mv-example');
      var option = select.options[select.selectedIndex];
      abort = new AbortController();
      status.textContent = 'Loading bundled example…';
      try {
        // URLs are authored in this page, never supplied by the parsed record.
        var response = await fetch(option.value, { signal: abort.signal });
        if (!response.ok) throw new Error('Example unavailable');
        var text = await response.text();
        if (token === sequence) show(text, option.textContent);
      } catch (_) { if (token === sequence) status.textContent = 'The example could not be loaded. Try again or choose a local JSON metadata file.'; }
    });
    document.getElementById('mv-clear').addEventListener('click', function () {
      cancelPending(); clear(); file.value = ''; status.textContent = 'Metadata cleared. Choose a local file or an example.';
    });
    document.querySelectorAll('[data-viewer-control]').forEach(function (node) { node.disabled = false; });
    status.textContent = 'Choose a local JSON metadata file or a bundled example.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
