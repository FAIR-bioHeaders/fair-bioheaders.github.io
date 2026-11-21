/* Native FHGM 0.1 record editor. Local-only; no carrier or feature validation. */
(function () {
  'use strict';
  var tb = typeof module !== 'undefined' ? require('./table-builder.js') : window.FairBioHeadersBuilder;
  var PIN = { version: '0.1', release: 'v0.8.0',
    id: 'https://w3id.org/fair-bioheaders/model-contracts/fhgm/0.1',
    sha256: '56c0a5a91e9e56c50c0919a375505c01f52bce5f1792841c40b87b1cd18e9336' };
  var MAX_BYTES = 1048576;
  // The published owning schema uses Python/JSON-Schema whitespace. Keep its
  // bytes frozen; adapt the known pattern subset for JavaScript RegExp only.
  var whitespace = '\\t-\\r \\x1c-\\x1f\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';
  function validationSchema(node) {
    if (Array.isArray(node)) return node.map(validationSchema);
    if (!node || typeof node !== 'object') return node;
    var out = {};
    Object.keys(node).forEach(function (key) {
      var value = node[key];
      if (key === 'pattern') {
        value = value.replace(/\[\\s\\S\]/g, '__ANY_CHARACTER__')
          .replace(/\\s/g, '[' + whitespace + ']').replace(/\\S/g, '[^' + whitespace + ']')
          .replace(/__ANY_CHARACTER__/g, '[\\s\\S]');
        out[key] = value;
      } else out[key] = validationSchema(value);
    });
    return out;
  }
  function validate(record, schema) {
    if (new TextEncoder().encode(JSON.stringify(record)).length > MAX_BYTES) {
      return [{ path: [], message: 'exceeds this editor’s 1 MiB record limit' }];
    }
    return tb.validateRecord(record, validationSchema(schema)).map(function (issue) {
      if (issue.message.indexOf('matches a forbidden combination') === 0) {
        return { path: issue.path, message: 'must not have trailing whitespace, controls or invisible formatting characters' };
      }
      return issue;
    });
  }
  function rows(value, path) {
    path = path || [];
    if (value && typeof value === 'object') return Object.keys(value).flatMap(function (key) {
      return rows(value[key], path.concat(key));
    });
    return [{ path: path.join('.'), value: String(value) }];
  }
  function table(record) {
    return '<table><caption>FHGM native model record</caption><thead><tr><th scope="col">Field</th><th scope="col">Value</th></tr></thead><tbody>' +
      rows(record).map(function (row) { return '<tr><th scope="row">' + tb.escapeHtml(row.path) + '</th><td>' + tb.escapeHtml(row.value) + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  function outputs(record, schema) {
    var issues = validate(record, schema);
    if (issues.length) throw new Error('Record structure is invalid');
    var notice = 'FHGM native model 0.1, shared v0.8.0. Record structure checked only. Carrier, feature, predecessor, checksum and biology checks have not run.';
    return { json: JSON.stringify(record, null, 2) + '\n', yaml: tb.recordYaml(record, schema),
      snippet: tb.recordYaml({ 'x-fhgm-models': [record] }),
      html: '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FHGM model ' + tb.escapeHtml(record.modelId) + '</title></head><body><h1>FHGM model record</h1><p>' + notice + '</p>' + table(record) + '</body></html>\n' };
  }
  var api = { PIN: PIN, validate: validate, outputs: outputs, rows: rows, table: table };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  window.FairBioHeadersModelBuilder = api;
  var root = document.getElementById('fhgm-builder');
  if (!root) return;
  var form = root.querySelector('form');
  var fields = root.querySelector('[data-model-fields]');
  var status = root.querySelector('[role="status"]');
  var errors = root.querySelector('[data-model-errors]');
  var controls = new Map();
  var generated = null;
  var nextId = 0;
  var schema;
  var urls = [];
  var downloads = Array.from(root.querySelectorAll('[data-download]'));
  var hints = { modelId: 'Your stable identifier for this model within the annotation.',
    modelVersion: 'Your version label. Keep it as text; no ordering is inferred.',
    featureId: 'The decoded ID of the root gene feature this model describes.',
    reference: 'Supply the same genome reference as the enclosing annotation: an accession with SeqCol ID, an FHR checksum, or both.',
    annotates: 'The genome file’s existing FHR checksum. This editor does not calculate or verify it.',
    seqcol_id: 'The supplied 32-character SeqCol digest; it is not the file checksum.',
    predecessor: 'Optional revision claim. Supply all three fields; the prior snapshot is not resolved here.',
    contributors: 'People or organizations who contributed to this model, with their roles.',
    evidence: 'Your evidence statements. Their biological meaning is not checked here.',
    methods: 'Software, protocols and limitations you report for this model.',
    publication: 'Article and deposited model identifiers remain separate.',
    reuseConditions: 'Conditions supplied for this model; no license is inferred.' };
  function label(key) { return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, function (s) { return s.toUpperCase(); }); }
  function el(tag, text, parent) { var item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (parent) parent.appendChild(item); return item; }
  function resolve(node) { return node.$ref ? schema.$defs[node.$ref.split('/').pop()] : node; }
  function clearErrors() {
    errors.replaceChildren(); errors.hidden = true;
    controls.forEach(function (control) { control.removeAttribute('aria-invalid'); var ids = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) { return id && id.indexOf('fm-error-') !== 0; }); if (ids.length) control.setAttribute('aria-describedby', ids.join(' ')); else control.removeAttribute('aria-describedby'); });
  }
  function stale() {
    generated = null; downloads.forEach(function (button) { button.disabled = true; });
    root.querySelector('[data-model-table]').replaceChildren();
    root.querySelectorAll('[data-source]').forEach(function (source) { source.textContent = ''; });
    clearErrors(); status.textContent = 'Entries changed. Check the record again to refresh the table and downloads.';
  }
  function field(node, key, parent, path, required) {
    node = resolve(node); var id = 'fm-' + (++nextId); var box;
    if (node.type === 'object') {
      box = el('fieldset', undefined, parent); box.id = id; box.tabIndex = -1; box.dataset.modelPath = path.join('.');
      el('legend', label(key) + (required ? ' (required)' : ' (optional)'), box);
      var include;
      if (!required) { var toggleLabel = el('label', undefined, box); include = el('input', undefined, toggleLabel); include.type = 'checkbox'; el('span', ' Include ' + label(key).toLowerCase(), toggleLabel); }
      if (hints[key]) el('p', hints[key], box);
      var inner = el('div', undefined, box);
      var getters = Object.keys(node.properties || {}).map(function (name) {
        return [name, field(node.properties[name], name, inner, path.concat(name), (node.required || []).includes(name))];
      });
      if (include) { inner.hidden = true; include.addEventListener('change', function () { inner.hidden = !include.checked; }); }
      controls.set(path.join('.'), box);
      return function () { if (include && !include.checked) return undefined; var value = {}; getters.forEach(function (pair) { var v = pair[1](); if (v !== undefined) value[pair[0]] = v; }); return value; };
    }
    if (node.type === 'array') {
      box = el('fieldset', undefined, parent); box.id = id; box.tabIndex = -1; box.dataset.modelPath = path.join('.'); el('legend', label(key) + ' (optional)', box);
      if (hints[key]) el('p', hints[key], box);
      var entries = []; var list = el('div', undefined, box); var add = el('button', 'Add ' + label(key).toLowerCase() + ' entry', box); add.type = 'button';
      add.addEventListener('click', function () {
        if (entries.length >= 100) return;
        var item = el('div', undefined, list); item.className = 'fm-entry';
        var getter = field(node.items, key + ' entry', item, path.concat(entries.length), true);
        var row = { get: getter, element: item, prefix: path.concat(entries.length).join('.') }; entries.push(row);
        var remove = el('button', 'Remove entry', item); remove.type = 'button';
        remove.addEventListener('click', function () { entries.splice(entries.indexOf(row), 1); item.remove(); entries.forEach(function (entry, index) { var prefix = path.concat(index).join('.'); entry.element.querySelectorAll('[data-model-path]').forEach(function (control) { var old = control.dataset.modelPath; if (old === entry.prefix || old.indexOf(entry.prefix + '.') === 0) { control.dataset.modelPath = prefix + old.slice(entry.prefix.length); if (control.name) control.name = control.dataset.modelPath; } }); entry.prefix = prefix; }); controls.clear(); fields.querySelectorAll('[data-model-path]').forEach(function (control) { controls.set(control.dataset.modelPath, control); }); add.disabled = false; stale(); add.focus(); });
        add.disabled = entries.length >= 100; stale(); var first = item.querySelector('input,select,textarea'); if (first) first.focus();
      });
      controls.set(path.join('.'), box);
      return function () { return entries.length ? entries.map(function (row) { return row.get(); }) : undefined; };
    }
    box = el('div', undefined, parent); box.className = 'tb-field';
    var title = el('label', label(key) + (required ? ' (required)' : ' (optional)'), box); title.htmlFor = id;
    var input = el(node.enum ? 'select' : 'input', undefined, box); input.id = id; input.name = path.join('.'); input.dataset.modelPath = path.join('.'); input.className = 'tb-input';
    if (node.enum) { var blank = el('option', 'Choose…', input); blank.value = ''; node.enum.forEach(function (value) { var option = el('option', value, input); option.value = value; }); }
    else { input.type = 'text'; }
    if (required) input.required = true;
    if (hints[key]) { var help = el('p', hints[key], box); help.id = id + '-help'; input.setAttribute('aria-describedby', help.id); }
    controls.set(path.join('.'), input);
    return function () { return !required && input.value === '' ? undefined : input.value; };
  }
  form.addEventListener('input', stale); form.addEventListener('change', stale);
  form.addEventListener('submit', function (event) {
    event.preventDefault(); if (!schema) return; clearErrors();
    var record = collect(); var issues = validate(record, schema); stale();
    if (issues.length) {
      errors.hidden = false; var heading = el('h3', 'Check these fields', errors); heading.tabIndex = -1;
      var list = el('ul', undefined, errors);
      issues.forEach(function (issue, index) { var item = el('li', undefined, list); item.id = 'fm-error-' + index; var button = el('button', (issue.path.join('.') || 'Record') + ': ' + issue.message, item); button.type = 'button'; button.addEventListener('click', function () { var path = issue.path.slice(); var control; while (!control && path.length) { control = controls.get(path.join('.')); if (!control) path.pop(); } (control || fields).focus(); }); var control = controls.get(issue.path.join('.')); if (control) { control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', ((control.getAttribute('aria-describedby') || '') + ' ' + item.id).trim()); } });
      status.textContent = 'Record structure needs attention. Downloads are disabled.'; heading.focus(); return;
    }
    generated = outputs(record, schema);
    root.querySelector('[data-model-table]').innerHTML = table(record); // every cell escaped by table()
    root.querySelectorAll('[data-source]').forEach(function (source) { source.textContent = generated[source.dataset.source]; });
    downloads.forEach(function (button) { button.disabled = false; });
    status.textContent = 'Record structure passed against FHGM native 0.1. Carrier, features, predecessors, file integrity and biology have not been checked.';
  });
  downloads.forEach(function (button) { button.addEventListener('click', function () {
    if (!generated) return;
    var kind = button.dataset.download; var mime = { json: 'application/json', yaml: 'text/yaml', snippet: 'text/yaml', html: 'text/html' }[kind];
    urls.forEach(function (old) { URL.revokeObjectURL(old); }); urls = [];
    var url = URL.createObjectURL(new Blob([generated[kind]], { type: mime + ';charset=utf-8' })); urls.push(url);
    var a = el('a'); a.href = url; a.download = kind === 'snippet' ? 'fhgm-header-snippet.yaml' : 'fhgm-record.' + kind; a.click();
  }); });
  window.addEventListener('pagehide', function () { urls.forEach(function (url) { URL.revokeObjectURL(url); }); });
  var collect;
  fetch(root.dataset.schema).then(function (response) { if (!response.ok) throw new Error('schema load'); return response.arrayBuffer(); }).then(async function (bytes) {
    var digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    if (digest !== PIN.sha256) throw new Error('schema integrity');
    schema = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (schema.$id !== PIN.id) throw new Error('schema identity');
    var getters = Object.keys(schema.properties).map(function (key) { return [key, field(schema.properties[key], key, fields, [key], schema.required.includes(key))]; });
    collect = function () { var record = {}; getters.forEach(function (pair) { var value = pair[1](); if (value !== undefined) record[pair[0]] = value; }); return record; };
    form.querySelector('[type="submit"]').disabled = false;
    document.querySelector('[data-fhgm-fallback]').hidden = true;
    status.textContent = 'Ready. Enter your model details; entries stay only in this open page.';
  }).catch(function () { status.textContent = 'The pinned model contract could not be verified. Editing and downloads remain disabled; reload to try again.'; fields.replaceChildren(); });
}());
