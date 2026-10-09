/* ==========================================================================
   FHR-only table builder
   Builds one typed FHR metadata record from a form, validates it against the
   selected supported repository schema snapshot, and produces a readable table, a
   standalone HTML document (with FHR microdata), and a YAML metadata file.

   The pure functions are exported for Node tests; the DOM wiring runs only in
   the browser when the builder container is present.
   ========================================================================== */

(function () {
  'use strict';

  // Authoritative schema. The bundled copy under assets/schema/fhr.json is a
  // cache of this URL; see docs/maintenance.md for provenance and refresh.
  var SCHEMA_URL = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json';

  var RELEASE_URL = 'https://w3id.org/fair-bioheaders/fhr/v0.3.1';
  var RELEASE_RAW_URL = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/v0.3.1/fhr.json';
  var RELEASE_COMMIT_URL = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/378b534dda9c1d759f25b4b32287172402492233/fhr.json';

  function selectSchema(target, development, release) {
    if (target === SCHEMA_URL) return development;
    if ([RELEASE_URL, RELEASE_RAW_URL, RELEASE_COMMIT_URL].indexOf(target) !== -1) return release;
    return null;
  }

  // Canonical output order, matching the schema's property order.
  var FIELD_ORDER = [
    'schema', 'schemaVersion', 'genome', 'genomeSynonym', 'taxon', 'version',
    'metadataAuthor', 'assemblyAuthor', 'dateCreated', 'voucherSpecimen',
    'accessionID', 'instrument', 'scholarlyArticle', 'documentation',
    'identifier', 'relatedLink', 'funding', 'reuseConditions', 'masking',
    'vitalStats', 'checksum', 'assemblySoftware', 'assemblyProtocol', 'seqcol_id'
  ];

  var MASKING_OPTIONS = ['not-masked', 'hard-masked', 'soft-masked', 'repeat-masked', 'unknown'];

  // Form definition. Paths map to the metadata object; groups drive fieldset and
  // table grouping. `fields` are the fixed subfields of object values.
  var GROUPS = [
    {
      id: 'resource', legend: 'Resource',
      fields: [
        { path: 'schema', label: 'FHR schema URL', kind: 'text', required: true, default: RELEASE_URL,
          help: 'Use the supported v0.3.1 release alias, or explicitly select raw-main for the documented development snapshot.' },
        { path: 'schemaVersion', label: 'Schema version', kind: 'number', required: true, default: '1.0',
          help: 'Value of the schemaVersion field (currently 1.0).' }
      ]
    },
    {
      id: 'identity', legend: 'Genome identity',
      fields: [
        { path: 'genome', label: 'Genome name', kind: 'text', required: true },
        { path: 'genomeSynonym', label: 'Genome synonyms', kind: 'stringList' },
        { path: 'version', label: 'Genome version', kind: 'text', required: true,
          help: 'Version of this assembly, e.g. 1.2.0 (not the schema or package version).' }
      ]
    },
    {
      id: 'taxon', legend: 'Taxon',
      fields: [
        { path: 'taxon', label: 'Taxon', kind: 'object', required: true, fields: [
          { name: 'name', label: 'Taxon name', kind: 'text' },
          { name: 'uri', label: 'Taxon URI', kind: 'text', format: 'uri',
            help: 'e.g. https://identifiers.org/taxonomy:9606' }
        ] }
      ]
    },
    {
      id: 'authors', legend: 'Authors',
      fields: [
        { path: 'metadataAuthor', label: 'Metadata authors', kind: 'objectList', required: true,
          help: 'People or organizations who created this metadata record. Order is preserved.', fields: [
            { name: 'name', label: 'Name', kind: 'text', required: true },
            { name: 'uri', label: 'ORCID URI', kind: 'text', format: 'uri' }
          ] },
        { path: 'assemblyAuthor', label: 'Assembly authors', kind: 'objectList', required: true,
          help: 'People or organizations who assembled the genome. Distinct from metadata authors.', fields: [
            { name: 'name', label: 'Name', kind: 'text', required: true },
            { name: 'uri', label: 'ORCID URI', kind: 'text', format: 'uri' }
          ] }
      ]
    },
    {
      id: 'dates', legend: 'Dates',
      fields: [
        { path: 'dateCreated', label: 'Date created', kind: 'date', required: true,
          help: 'Date the assembly was created, not the export or publication date (YYYY-MM-DD).' }
      ]
    },
    {
      id: 'provenance', legend: 'Provenance',
      fields: [
        { path: 'voucherSpecimen', label: 'Voucher specimen', kind: 'text' },
        { path: 'accessionID', label: 'Accession', kind: 'object', fields: [
          { name: 'name', label: 'Accession name', kind: 'text' },
          { name: 'url', label: 'Accession URL', kind: 'text', format: 'uri' }
        ] },
        { path: 'instrument', label: 'Instruments', kind: 'stringList' },
        { path: 'scholarlyArticle', label: 'Scholarly article DOI', kind: 'text',
          help: 'DOI beginning with 10., e.g. 10.1093/bib/bbae122' },
        { path: 'documentation', label: 'Documentation', kind: 'text' },
        { path: 'identifier', label: 'Identifiers', kind: 'stringList', help: 'e.g. beetlebase:TC010103' },
        { path: 'relatedLink', label: 'Related links', kind: 'stringList', format: 'uri' },
        { path: 'funding', label: 'Funding', kind: 'text' },
        { path: 'reuseConditions', label: 'Reuse conditions', kind: 'text' }
      ]
    },
    {
      id: 'assembly', legend: 'Assembly',
      fields: [
        { path: 'masking', label: 'Masking', kind: 'select', required: true, options: MASKING_OPTIONS },
        { path: 'assemblySoftware', label: 'Assembly software', kind: 'objectList', fields: [
          { name: 'name', label: 'Name', kind: 'text', required: true },
          { name: 'version', label: 'Version', kind: 'text' },
          { name: 'uri', label: 'URI', kind: 'text', format: 'uri' },
          { name: 'commandLineOption', label: 'Command-line options', kind: 'stringList' }
        ] },
        { path: 'assemblyProtocol', label: 'Assembly protocol URL', kind: 'text', format: 'uri' }
      ]
    },
    {
      id: 'stats', legend: 'Assembly statistics',
      fields: [
        { path: 'vitalStats', label: 'Assembly statistics', kind: 'object', fields: [
          { name: 'N50', label: 'N50 (bp)', kind: 'integer' },
          { name: 'N90', label: 'N90 (bp)', kind: 'integer' },
          { name: 'L50', label: 'L50 (contigs)', kind: 'integer' },
          { name: 'L90', label: 'L90 (contigs)', kind: 'integer' },
          { name: 'totalBasePairs', label: 'Total base pairs (bp)', kind: 'integer' },
          { name: 'numberContigs', label: 'Number of contigs', kind: 'integer' },
          { name: 'numberScaffolds', label: 'Number of scaffolds', kind: 'integer' },
          { name: 'gcContent', label: 'GC content (%)', kind: 'number' },
          { name: 'readTechnology', label: 'Read technology', kind: 'text' }
        ] }
      ]
    },
    {
      id: 'integrity', legend: 'File integrity',
      fields: [
        { path: 'checksum', label: 'Checksum (sha2-512/256)', kind: 'text', required: true,
          help: '44-character value. Checked structurally only; this tool cannot verify it against a file.' },
        { path: 'seqcol_id', label: 'SeqCol ID', kind: 'text',
          help: '32-character refget sequence collection digest, supplied separately from the checksum.' }
      ]
    }
  ];

  // ------------------------------------------------------------------ escaping

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // --------------------------------------------------------------- validation

  function jsonType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return typeof value;
  }

  function typeMatches(value, type) {
    var actual = jsonType(value);
    if (type === 'number') return actual === 'number' || actual === 'integer';
    if (type === 'integer') return actual === 'integer';
    return actual === type;
  }

  function resolveRef(schema, root) {
    if (!schema || !schema.$ref) return schema;
    if (schema.$ref.indexOf('#/') !== 0) return {};
    return schema.$ref.slice(2).split('/').reduce(function (node, part) {
      return node && node[part] !== undefined ? node[part] : {};
    }, root);
  }

  function isUri(value) {
    try {
      new URL(value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function isDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.getUTCFullYear() === parts[0] &&
      date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2];
  }

  function validateSchema(value, schema, root, path, errors) {
    schema = resolveRef(schema, root);
    if (schema.type) {
      var types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some(function (type) { return typeMatches(value, type); })) {
        errors.push({ path: path, message: 'expected ' + types.join(' or ') + ', got ' + jsonType(value) });
        return;
      }
    }
    if (schema.anyOf) {
      var anyPassed = schema.anyOf.some(function (sub) {
        var sink = [];
        validateSchema(value, sub, root, path, sink);
        return sink.length === 0;
      });
      if (!anyPassed) {
        errors.push({ path: path, message: 'value does not match any allowed form' });
        return;
      }
    }
    if (schema.enum && schema.enum.indexOf(value) === -1) {
      errors.push({ path: path, message: 'must be one of: ' + schema.enum.join(', ') });
    }
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({ path: path, message: 'must be at least ' + schema.minLength + ' characters' });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({ path: path, message: 'must be at most ' + schema.maxLength + ' characters' });
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push({ path: path, message: 'does not match the required pattern' });
      }
      if (schema.format === 'uri' && !isUri(value)) {
        errors.push({ path: path, message: 'must be a URI' });
      }
      if (schema.format === 'date' && !isDate(value)) {
        errors.push({ path: path, message: 'must be a date (YYYY-MM-DD)' });
      }
    }
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({ path: path, message: 'must be >= ' + schema.minimum });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({ path: path, message: 'must be <= ' + schema.maximum });
      }
    }
    if (Array.isArray(value) && schema.items) {
      value.forEach(function (item, index) {
        validateSchema(item, schema.items, root, path.concat([index]), errors);
      });
    }
    if (jsonType(value) === 'object' && schema.properties) {
      (schema.required || []).forEach(function (key) {
        if (value[key] === undefined) {
          errors.push({ path: path.concat([key]), message: 'is required' });
        }
      });
      Object.keys(value).forEach(function (key) {
        if (schema.properties[key]) {
          validateSchema(value[key], schema.properties[key], root, path.concat([key]), errors);
        } else if (schema.additionalProperties === false) {
          errors.push({ path: path.concat([key]), message: 'is not an allowed property' });
        }
      });
    }
  }

  function validateRecord(record, schema) {
    var errors = [];
    validateSchema(record, schema, schema, [], errors);
    return errors;
  }

  // ------------------------------------------------------------- serialization

  function yamlScalar(value, declaredType) {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') {
      // A schema "number" keeps a decimal point (schemaVersion 1.0), while
      // "integer" stays integral (N50 16).
      return declaredType === 'number' && Number.isInteger(value) ? value.toFixed(1) : String(value);
    }
    var text = String(value);
    return JSON.stringify(text).replace(/[\u0085\u2028\u2029]/g, function (character) {
      return '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0');
    });
  }

  function emitMap(object, indent, order, schema) {
    var pad = new Array(indent + 1).join(' ');
    var props = (schema && schema.properties) || {};
    var lines = [];
    var keys = order ? order.filter(function (key) { return object[key] !== undefined; }) : Object.keys(object);
    keys.forEach(function (key) {
      var value = object[key];
      var node = props[key] || {};
      if (Array.isArray(value)) {
        if (value.length === 0) { lines.push(pad + key + ': []'); return; }
        lines.push(pad + key + ':');
        emitSeq(value, indent, lines, node.items);
      } else if (value && typeof value === 'object') {
        if (Object.keys(value).length === 0) { lines.push(pad + key + ': {}'); return; }
        lines.push(pad + key + ':');
        emitMap(value, indent + 2, null, node).forEach(function (line) { lines.push(line); });
      } else {
        lines.push(pad + key + ': ' + yamlScalar(value, node.type));
      }
    });
    return lines;
  }

  function emitSeq(array, indent, lines, itemSchema) {
    var pad = new Array(indent + 1).join(' ');
    itemSchema = itemSchema || {};
    array.forEach(function (item) {
      if (Array.isArray(item)) {
        lines.push(pad + '-');
        emitSeq(item, indent + 2, lines, itemSchema.items);
      } else if (item && typeof item === 'object') {
        var inner = emitMap(item, indent + 2, null, itemSchema);
        inner[0] = pad + '- ' + inner[0].slice(indent + 2);
        inner.forEach(function (line) { lines.push(line); });
      } else {
        lines.push(pad + '- ' + yamlScalar(item, itemSchema.type));
      }
    });
  }

  function toYaml(record, schema) {
    return emitMap(record, 0, FIELD_ORDER, schema).join('\n') + '\n';
  }

  // The declared data-fhr-type follows the schema where known, so a numeric
  // schemaVersion keeps type "number" even though JavaScript reports 1.0 as an
  // integer. Unknown paths fall back to the runtime value type.
  function declaredKind(value, schemaNode) {
    var resolved = schemaNode || {};
    if (resolved.anyOf) {
      var match = resolved.anyOf.filter(function (sub) {
        return sub.type && (sub.type === 'array' || sub.type === 'string') ===
          (sub.type === jsonType(value));
      })[0] || resolved.anyOf[0];
      resolved = match || {};
    }
    if (resolved.type === 'number' || resolved.type === 'integer') return resolved.type;
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return 'string';
  }

  function htmlValue(key, value, schemaNode) {
    var prop = escapeHtml(key);
    var resolved = schemaNode || {};
    if (Array.isArray(value)) {
      var itemSchema = resolved.items || {};
      return '<span itemprop="' + prop + '" data-fhr-type="array">' +
        value.map(function (item) { return htmlValue('item', item, itemSchema); }).join('') + '</span>';
    }
    if (value && typeof value === 'object') {
      var props = resolved.properties || {};
      var content = Object.keys(value).map(function (k) {
        return htmlValue(k, value[k], props[k]);
      }).join('');
      return '<span itemprop="' + prop + '" itemscope data-fhr-type="object">' + content + '</span>';
    }
    var kind = declaredKind(value, resolved);
    var text = typeof value === 'string' ? value : JSON.stringify(value);
    return '<span itemprop="' + prop + '" data-fhr-type="' + kind + '">' + escapeHtml(text) + '</span>';
  }

  function microdataDiv(record, schema) {
    var props = (schema && schema.properties) || {};
    var order = FIELD_ORDER.filter(function (key) { return record[key] !== undefined; });
    return '<div itemscope itemtype="' + SCHEMA_URL + '">' +
      order.map(function (key) { return htmlValue(key, record[key], props[key]); }).join('') + '</div>';
  }

  function displayValue(value) {
    if (Array.isArray(value)) {
      return value.map(displayValue).join('; ');
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).map(function (key) {
        return value[key] === undefined || value[key] === '' ? '' : displayValue(value[key]);
      }).filter(Boolean).join(' — ');
    }
    return String(value);
  }

  function tableRows(record) {
    var rows = [];
    GROUPS.forEach(function (group) {
      var groupRows = [];
      group.fields.forEach(function (field) {
        var value = record[field.path];
        if (value === undefined) return;
        if (field.kind === 'object') {
          if (value && Object.keys(value).length) {
            field.fields.forEach(function (subfield) {
              if (value[subfield.name] !== undefined && value[subfield.name] !== '') {
                groupRows.push({ label: subfield.label, value: displayValue(value[subfield.name]) });
              }
            });
          }
        } else if (field.kind === 'objectList') {
          if (Array.isArray(value) && value.length) {
            value.forEach(function (item, index) {
              field.fields.forEach(function (subfield) {
                if (item[subfield.name] !== undefined && item[subfield.name] !== '') {
                  groupRows.push({
                    label: field.label + ' ' + (index + 1) + ' — ' + subfield.label,
                    value: displayValue(item[subfield.name])
                  });
                }
              });
            });
          }
        } else if (Array.isArray(value)) {
          if (value.length) groupRows.push({ label: field.label, value: value.join('; ') });
        } else {
          groupRows.push({ label: field.label, value: String(value) });
        }
      });
      if (groupRows.length) rows.push({ group: group.legend, rows: groupRows });
    });
    return rows;
  }

  function tableHtml(record) {
    var caption = 'FHR metadata' + (record.genome ? ': ' + record.genome : '');
    var body = tableRows(record).map(function (group) {
      var head = '<tr><th scope="colgroup" colspan="2">' + escapeHtml(group.group) + '</th></tr>';
      var rows = group.rows.map(function (row) {
        return '<tr><th scope="row">' + escapeHtml(row.label) + '</th><td>' +
          escapeHtml(row.value) + '</td></tr>';
      }).join('');
      return head + rows;
    }).join('');
    return '<table>\n<caption>' + escapeHtml(caption) + '</caption>\n' +
      '<thead><tr><th scope="col">Field</th><th scope="col">Value</th></tr></thead>\n' +
      '<tbody>' + body + '</tbody>\n</table>';
  }

  function standaloneHtml(record, schema) {
    var title = 'FHR metadata' + (record.genome ? ': ' + record.genome : '');
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
      '<title>' + escapeHtml(title) + '</title></head><body>\n' +
      '<h1>' + escapeHtml(title) + '</h1>\n' +
      tableHtml(record) + '\n' +
      '<h2>Machine-readable FHR microdata</h2>\n' +
      microdataDiv(record, schema) + '\n' +
      '</body></html>\n';
  }

  var api = {
    SCHEMA_URL: SCHEMA_URL,
    RELEASE_URL: RELEASE_URL,
    selectSchema: selectSchema,
    FIELD_ORDER: FIELD_ORDER,
    GROUPS: GROUPS,
    escapeHtml: escapeHtml,
    validateRecord: validateRecord,
    toYaml: toYaml,
    microdataDiv: microdataDiv,
    standaloneHtml: standaloneHtml,
    tableRows: tableRows,
    tableHtml: tableHtml
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document === 'undefined' || typeof module !== 'undefined') {
    return;
  }

  // ------------------------------------------------------------- browser wiring

  var state = {};
  var outputs = null;      // {html, yaml, record}
  var stale = false;
  var objectUrls = [];
  var schema = null;
  var releaseSchema = null;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'text') node.textContent = attrs[key];
        else if (key === 'html') node.innerHTML = attrs[key];
        else if (attrs[key] !== null && attrs[key] !== undefined) node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function slug(path) {
    return path.replace(/[^A-Za-z0-9]+/g, '-');
  }

  function fieldId(path) {
    return 'tb-' + slug(path);
  }

  function label(forId, field) {
    var node = el('label', { for: forId });
    node.appendChild(document.createTextNode(field.label));
    if (field.required) {
      var req = el('span', { class: 'tb-required', 'aria-hidden': 'true', text: ' *' });
      node.appendChild(req);
      node.appendChild(el('span', { class: 'visually-hidden', text: ' (required)' }));
    }
    return node;
  }

  function helpText(id, field) {
    if (!field.help) return null;
    return el('p', { class: 'tb-help', id: id + '-help', text: field.help });
  }

  function control(field, id, setter, type) {
    var input;
    if (field.kind === 'select') {
      input = el('select', { id: id, class: 'tb-input' });
      field.options.forEach(function (option) {
        input.appendChild(el('option', { value: option, text: option }));
      });
    } else {
      input = el('input', { id: id, class: 'tb-input', type: type });
    }
    input.addEventListener('input', function () {
      setter(input.value);
      markStale();
    });
    return input;
  }

  function inputTypeFor(kind) {
    if (kind === 'number' || kind === 'integer') return 'number';
    if (kind === 'date') return 'date';
    return 'text';
  }

  function scalarField(field, get, set) {
    var id = fieldId(field.path);
    var wrap = el('div', { class: 'tb-field' });
    wrap.appendChild(label(id, field));
    var input = control(field, id, set, inputTypeFor(field.kind));
    if (field.kind === 'integer') input.setAttribute('step', '1');
    if (field.kind === 'date') input.setAttribute('placeholder', 'YYYY-MM-DD');
    input.value = get();
    if (field.help) input.setAttribute('aria-describedby', id + '-help');
    wrap.appendChild(input);
    var help = helpText(id, field);
    if (help) wrap.appendChild(help);
    wrap.appendChild(el('p', { class: 'tb-error', id: id + '-error', hidden: 'hidden' }));
    registerControl(field.path, input, id + '-error');
    return wrap;
  }

  function stringListField(field, array) {
    var base = field.id || slug(field.path);
    var wrap = el('fieldset', { class: 'tb-list', id: fieldId(field.path), tabindex: '-1' });
    wrap.appendChild(el('legend', { text: field.label }));
    if (field.help) wrap.appendChild(el('p', { class: 'tb-help', text: field.help }));
    var rows = el('div', { class: 'tb-list__rows' });
    array.forEach(function (_, index) {
      rows.appendChild(stringListRow(field, array, index, rows, base));
    });
    wrap.appendChild(rows);
    wrap.appendChild(el('button', { type: 'button', class: 'tb-add', id: 'tb-add-' + base,
      text: 'Add ' + field.label.toLowerCase() }))
      .addEventListener('click', function () {
        array.push('');
        rows.appendChild(stringListRow(field, array, array.length - 1, rows, base));
        markStale();
      });
    return wrap;
  }

  function stringListRow(field, array, index, rows, base) {
    var id = (base || fieldId(field.path)) + '-' + index;
    var row = el('div', { class: 'tb-list__row' });
    row.appendChild(el('label', { for: id, class: 'visually-hidden', text: field.label + ' ' + (index + 1) }));
    var input = el('input', { id: id, class: 'tb-input', type: 'text' });
    input.value = array[index];
    input.addEventListener('input', function () { array[index] = input.value; markStale(); });
    row.appendChild(input);
    registerControl(field.path + '.' + index, input, null);
    row.appendChild(el('button', { type: 'button', class: 'tb-remove', text: 'Remove',
      'aria-label': 'Remove ' + field.label + ' ' + (index + 1) })).addEventListener('click', function () {
      array.splice(index, 1);
      rerenderList(rows, function () {
        array.forEach(function (_, i) { rows.appendChild(stringListRow(field, array, i, rows, base)); });
      });
      markStale();
    });
    return row;
  }

  function objectField(field, object) {
    var wrap = el('fieldset', { class: 'tb-object', id: fieldId(field.path), tabindex: '-1' });
    wrap.appendChild(el('legend', { text: field.label }));
    field.fields.forEach(function (sub) {
      var path = field.path + '.' + sub.name;
      wrap.appendChild(objectSubfield(sub, path, function () {
        return object[sub.name] === undefined ? '' : object[sub.name];
      }, function (value) {
        if (value === '') delete object[sub.name];
        else object[sub.name] = sub.kind === 'number' || sub.kind === 'integer' ? Number(value) : value;
      }));
    });
    return wrap;
  }

  function objectSubfield(sub, path, get, set) {
    return scalarField({ path: path, label: sub.label, kind: sub.kind || 'text',
      required: sub.required, format: sub.format, help: sub.help }, get, set);
  }

  function objectListField(field, array) {
    var wrap = el('fieldset', { class: 'tb-list', id: fieldId(field.path), tabindex: '-1' });
    wrap.appendChild(el('legend', { text: field.label }));
    if (field.help) wrap.appendChild(el('p', { class: 'tb-help', text: field.help }));
    var rows = el('div', { class: 'tb-list__rows' });
    array.forEach(function (_, index) { rows.appendChild(objectListRow(field, array, index, rows)); });
    wrap.appendChild(rows);
    wrap.appendChild(el('button', { type: 'button', class: 'tb-add', id: 'tb-add-' + slug(field.path),
      text: 'Add ' + field.label.toLowerCase() }))
      .addEventListener('click', function () {
        array.push({});
        rows.appendChild(objectListRow(field, array, array.length - 1, rows));
        markStale();
      });
    return wrap;
  }

  function objectListRow(field, array, index, rows) {
    var row = el('fieldset', { class: 'tb-list__row', id: 'tb-row-' + slug(field.path) + '-' + index });
    row.appendChild(el('legend', { text: field.label + ' ' + (index + 1) }));
    field.fields.forEach(function (sub) {
      if (sub.kind === 'stringList') {
        if (!Array.isArray(array[index][sub.name])) array[index][sub.name] = [];
        row.appendChild(stringListField({ path: field.path + '.' + index + '.' + sub.name,
          id: field.path + '-' + index + '-' + sub.name,
          label: sub.label, kind: 'stringList', help: sub.help }, array[index][sub.name]));
      } else {
        row.appendChild(objectSubfield(sub, field.path + '.' + index + '.' + sub.name, function () {
          return array[index][sub.name] === undefined ? '' : array[index][sub.name];
        }, function (value) {
          if (value === '') delete array[index][sub.name]; else array[index][sub.name] = value;
        }));
      }
    });
    row.appendChild(el('button', { type: 'button', class: 'tb-remove', text: 'Remove ' + field.label.toLowerCase() }))
      .addEventListener('click', function () {
        array.splice(index, 1);
        rerenderList(rows, function () {
          array.forEach(function (_, i) { rows.appendChild(objectListRow(field, array, i, rows)); });
        });
        markStale();
      });
    return row;
  }

  function rerenderList(rows, builder) {
    Object.keys(controlRegistry).forEach(function (path) {
      if (rows.contains(controlRegistry[path].input)) delete controlRegistry[path];
    });
    rows.textContent = '';
    builder();
  }

  var controlRegistry = {};
  function registerControl(path, input, errorId) {
    controlRegistry[path] = { input: input, error: errorId };
  }

  function renderForm(container) {
    controlRegistry = {};
    var form = el('form', { class: 'tb-form', novalidate: 'novalidate' });
    GROUPS.forEach(function (group) {
      var fieldset = el('fieldset', { class: 'tb-group' });
      fieldset.appendChild(el('legend', { text: group.legend }));
      group.fields.forEach(function (field) {
        if (field.kind === 'stringList') {
          if (!Array.isArray(state[field.path])) state[field.path] = [];
          fieldset.appendChild(stringListField(field, state[field.path]));
        } else if (field.kind === 'object') {
          if (!state[field.path]) state[field.path] = {};
          fieldset.appendChild(objectField(field, state[field.path]));
        } else if (field.kind === 'objectList') {
          if (!Array.isArray(state[field.path])) state[field.path] = [];
          fieldset.appendChild(objectListField(field, state[field.path]));
        } else {
          if (field.default !== undefined && state[field.path] === undefined) {
            state[field.path] = field.kind === 'number' ? Number(field.default) : field.default;
          }
          fieldset.appendChild(scalarField(field,
            function () { return state[field.path] === undefined ? '' : state[field.path]; },
            function (value) {
              if (field.kind === 'number' || field.kind === 'integer') {
                state[field.path] = value === '' ? '' : Number(value);
              } else {
                state[field.path] = value;
              }
            }));
        }
      });
      form.appendChild(fieldset);
    });
    container.textContent = '';
    container.appendChild(form);
  }

  function markStale() {
    if (!outputs) return;
    if (!stale) {
      stale = true;
      setStatus('Inputs changed. Select Generate to refresh the table and downloads.', 'stale');
      toggleDownloads(false);
    }
  }

  function setStatus(message, kind) {
    var status = document.getElementById('tb-status');
    if (status) { status.textContent = message; status.setAttribute('data-kind', kind || ''); }
  }

  function toggleDownloads(enabled) {
    ['tb-download-html', 'tb-download-yaml'].forEach(function (id) {
      var button = document.getElementById(id);
      if (button) button.disabled = !enabled;
    });
  }

  function prune(value) {
    if (Array.isArray(value)) {
      var items = value.map(prune).filter(function (item) { return item !== undefined; });
      return items.length ? items : undefined;
    }
    if (value && typeof value === 'object') {
      var object = {};
      Object.keys(value).forEach(function (key) {
        var cleaned = prune(value[key]);
        if (cleaned !== undefined) object[key] = cleaned;
      });
      return Object.keys(object).length ? object : undefined;
    }
    if (value === '' || value === undefined || value === null) return undefined;
    return value;
  }

  function buildRecord() {
    var record = prune(state);
    return record && typeof record === 'object' ? record : {};
  }

  function renderOutputs() {
    var record = buildRecord();
    var selected = selectSchema(record.schema, schema, releaseSchema);
    var errors = selected ? validateRecord(record, selected) : [{ path: ['schema'],
      message: 'Unsupported schema target. This builder supports the v0.3.1 alias and its release/commit URLs, or the documented raw-main development snapshot.' }];
    renderErrorSummary(errors);
    renderTable(record);
    outputs = { record: record, html: standaloneHtml(record, selected), yaml: toYaml(record, selected) };
    document.getElementById('tb-html-source').textContent = outputs.html;
    document.getElementById('tb-yaml-source').textContent = outputs.yaml;
    stale = false;
    var ready = errors.length === 0;
    toggleDownloads(ready);
    if (ready) {
      setStatus('Structural validation passed against ' + (record.schema === SCHEMA_URL ? 'the cached raw-main development snapshot' : 'FHR v0.3.1') + '. The checksum is not verified against any file.', 'ok');
    } else {
      setStatus('Incomplete or invalid: ' + errors.length + ' issue' + (errors.length === 1 ? '' : 's') +
        '. A draft preview is shown; downloads are disabled until it validates.', 'error');
    }
  }

  function renderErrorSummary(errors) {
    var summary = document.getElementById('tb-errors');
    summary.textContent = '';
    clearFieldErrors();
    if (!errors.length) { summary.hidden = true; return; }
    summary.hidden = false;
    var list = el('ul');
    errors.forEach(function (error) {
      var pointer = error.path.join('.');
      var item = el('li');
      var target = errorTarget(error.path);
      var link = el('a', { href: '#' + target.id,
        text: (pointer ? pointer + ': ' : '') + error.message });
      link.addEventListener('click', function () { target.focus(); });
      item.appendChild(link);
      list.appendChild(item);
      markFieldError(error.path);
    });
    summary.appendChild(el('h3', { text: 'Validation issues' }));
    summary.appendChild(list);
  }

  function errorTarget(path) {
    var parts = path.slice();
    while (parts.length) {
      var key = parts.join('.');
      if (controlRegistry[key]) return controlRegistry[key].input;
      var group = document.getElementById(fieldId(key));
      if (group) return group;
      parts.pop();
    }
    return document.getElementById('tb-generate');
  }

  function clearFieldErrors() {
    Object.keys(controlRegistry).forEach(function (path) {
      var entry = controlRegistry[path];
      if (entry.error) {
        var node = document.getElementById(entry.error);
        if (node) { node.textContent = ''; node.hidden = true; }
      }
      entry.input.removeAttribute('aria-invalid');
    });
  }

  function markFieldError(path) {
    var key = path.join('.');
    var entry = controlRegistry[key];
    if (!entry) return;
    entry.input.setAttribute('aria-invalid', 'true');
    if (entry.error) {
      var node = document.getElementById(entry.error);
      if (node) { node.textContent = 'This field has a validation issue.'; node.hidden = false; }
    }
  }

  function renderTable(record) {
    var holder = document.getElementById('tb-table');
    holder.textContent = '';
    var rows = tableRows(record);
    if (!rows.length) {
      holder.appendChild(el('p', { text: 'Enter metadata and select Generate to preview the table.' }));
      return;
    }
    var table = el('table');
    var caption = el('caption', { text: 'FHR metadata' + (record.genome ? ': ' + record.genome : '') });
    table.appendChild(caption);
    var thead = el('thead');
    var headRow = el('tr');
    headRow.appendChild(el('th', { scope: 'col', text: 'Field' }));
    headRow.appendChild(el('th', { scope: 'col', text: 'Value' }));
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (group) {
      var groupRow = el('tr');
      groupRow.appendChild(el('th', { scope: 'colgroup', colspan: '2', text: group.group }));
      tbody.appendChild(groupRow);
      group.rows.forEach(function (row) {
        var tr = el('tr');
        tr.appendChild(el('th', { scope: 'row', text: row.label }));
        tr.appendChild(el('td', { text: row.value }));
        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);
    holder.appendChild(table);
  }

  function download(kind) {
    if (!outputs || stale) return;
    var isHtml = kind === 'html';
    var text = isHtml ? outputs.html : outputs.yaml;
    var filename = 'fhr-metadata.' + (isHtml ? 'html' : 'yaml');
    var type = isHtml ? 'text/html' : 'text/yaml';
    try {
      var blob = new Blob([text], { type: type + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      objectUrls.push(url);
      var anchor = el('a', { href: url, download: filename });
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setStatus('Download started: ' + filename + '. Check your browser downloads; this tool cannot confirm that a file was saved.',
        'ok');
    } catch (error) {
      setStatus('Download could not start in this browser. Select the source text and copy it instead.', 'error');
    }
  }

  function cleanup() {
    objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    objectUrls = [];
  }

  function init() {
    var container = document.getElementById('table-builder');
    if (!container) return;
    function load(url) {
      return fetch(url).then(function (response) {
        if (!response.ok) throw new Error('schema request failed');
        return response.json();
      });
    }
    Promise.all([
      load(container.getAttribute('data-schema') || '/assets/schema/fhr.json'),
      load(container.getAttribute('data-release-schema') || '/assets/schema/fhr-v0.3.1.json')
    ]).then(function (loaded) {
        schema = loaded[0];
        releaseSchema = loaded[1];
        renderForm(document.getElementById('tb-form'));
        document.getElementById('tb-generate').addEventListener('click', renderOutputs);
        document.getElementById('tb-download-html').addEventListener('click', function () { download('html'); });
        document.getElementById('tb-download-yaml').addEventListener('click', function () { download('yaml'); });
        cleanup();
      })
      .catch(function () {
        setStatus('The FHR schema could not be loaded, so validation is unavailable. Reload the page and try again.', 'error');
      });
    window.addEventListener('pagehide', cleanup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
