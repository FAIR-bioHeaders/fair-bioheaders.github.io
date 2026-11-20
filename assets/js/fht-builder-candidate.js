/* Unpublished FHT publication-profile preparation; not loaded by the public form.
 * MPL-2.0. No release is registered and every operation needs explicit opt-in. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./table-builder.js'));
  } else {
    root.FHTBuilderCandidate = factory(root.FairBioHeadersBuilder);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (builder) {
  'use strict';
  var RAW = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/';
  var ITEMTYPE = 'https://w3id.org/fair-bioheaders/fht/v0.7.0';
  var PROFILE = {
    type: 'FHT', release: 'v0.7.0', declares: '1.0', status: 'candidate-unpublished',
    schemaSha256: '082b0790b7878940c4496c97d7485e32c65de8ba75ecc080e53f04fb44251a43',
    aliases: [RAW + 'main/fht.json', RAW + 'v0.7.0/fht.json',
      'https://w3id.org/fair-bioheaders/fht/v0.7.0',
      'https://w3id.org/fair-bioheaders/fht/v0.7.0/']
  };
  var STYLE = 'body{font-family:system-ui;max-width:75em;margin:2em auto;padding:0 1em}table{border-collapse:collapse;max-width:100%}th,td{border:1px solid;padding:.4em;text-align:left;vertical-align:top;overflow-wrap:anywhere}span[data-fhr-type=string],td{white-space:pre-wrap}';
  var SECTIONS = [
    ['Resource', ['schema', 'schemaVersion', 'transcriptome', 'transcriptomeSynonym', 'version', 'assemblyType', 'moleculeType', 'taxon', 'metadataAuthor', 'dateCreated']],
    ['Provenance and methods', ['assemblyAuthor', 'assemblySoftware', 'derivedFrom', 'instrument', 'libraryStrategy', 'strandedness', 'sequencingRuns', 'sample']],
    ['Reported statistics', ['vitalStats', 'completeness']],
    ['Identifiers, rights and integrity', ['accessionID', 'identifier', 'relatedLink', 'scholarlyArticle', 'documentation', 'funding', 'reuseConditions', 'voucherSpecimen', 'checksum']]
  ];

  function requireCandidate(options) {
    if (!options || options.candidate !== true) throw new Error('FHT candidate is unpublished; explicit candidate opt-in is required');
  }

  function select(target, options) {
    requireCandidate(options);
    return PROFILE.aliases.indexOf(target) !== -1 ? PROFILE : null;
  }

  function formSections(schema, options) {
    requireCandidate(options);
    return SECTIONS.map(function (section) {
      return { title: section[0], fields: section[1].map(function (key) {
        return { key: key, required: schema.required.indexOf(key) !== -1, schema: schema.properties[key] };
      }) };
    });
  }

  function completenessIssues(record) {
    var counts = record.completeness;
    var names = ['completeSingle', 'completeDuplicated', 'fragmented', 'missing', 'total'];
    if (!counts || !names.every(function (key) { return Number.isSafeInteger(counts[key]); })) return [];
    var sum = names.slice(0, 4).reduce(function (total, key) { return total + BigInt(counts[key]); }, BigInt(0));
    return sum === BigInt(counts.total) ? [] : [{ path: ['completeness'], kind: 'semantic',
      message: 'C1: completeness component counts must sum to total (sum ' + sum + ', total ' + counts.total + ')' }];
  }

  function capabilityIssues(value, path) {
    path = path || [];
    if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) {
      return [{ path: path, kind: 'unsupported-value', message: 'Browser candidate cannot preserve this numeric value exactly; use an exact-number runtime' }];
    }
    if (!value || typeof value !== 'object') return [];
    return Object.keys(value).reduce(function (issues, key) {
      return issues.concat(capabilityIssues(value[key], path.concat(Array.isArray(value) ? Number(key) : key)));
    }, []);
  }

  function validate(record, schema, options) {
    requireCandidate(options);
    if (!select(record.schema, options)) return [{ path: ['schema'], kind: 'unsupported-version', message: 'Unsupported FHT candidate selector; no fallback' }];
    return capabilityIssues(record).concat(builder.validateRecord(record, schema), completenessIssues(record));
  }

  function table(record) {
    var rows = [];
    function visit(value, path) {
      if (value && typeof value === 'object' && Object.keys(value).length) {
        Object.keys(value).forEach(function (key) { visit(value[key], path ? path + '.' + key : key); });
      } else {
        rows.push('<tr><th scope="row">' + builder.escapeHtml(path) + '</th><td>' + builder.escapeHtml(
          value && typeof value === 'object' ? JSON.stringify(value) : String(value)) + '</td></tr>');
      }
    }
    visit(record, '');
    return '<table><caption>FHT metadata</caption><thead><tr><th scope="col">Field</th><th scope="col">Value</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  }

  function exportsFor(record, schema, options) {
    var errors = validate(record, schema, options);
    if (errors.length) { var error = new Error('FHT candidate export refused: ' + errors.map(function (issue) { return issue.message; }).join('; ')); error.issues = errors; throw error; }
    var extensions = builder.extensionKeys(record, schema);
    var item = '<div itemscope itemtype="' + ITEMTYPE + '">' + Object.keys(record)
      .filter(function (key) { return extensions.indexOf(key) === -1; })
      .map(function (key) { return builder.typedHtmlValue(key, record[key], schema.properties[key], schema); }).join('') + '</div>';
    var title = builder.escapeHtml('FHT metadata: ' + record.transcriptome);
    var tableHtml = table(record);
    var html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>' + title + '</title><style>' + STYLE + '</style></head><body>\n<h1>' + title + '</h1>\n' +
      '<p>Unpublished FHT candidate; no released/default website support. JSON-LD is unsupported. Metadata validity does not verify file bytes or biological derivation.</p>\n' + tableHtml + '\n' + item;
    if (extensions.length) html += '\n<p>Extension fields omitted from HTML microdata (M5); YAML retains ' + extensions.map(builder.escapeHtml).join(', ') + '.</p>';
    html += '\n</body></html>\n';
    return { status: PROFILE.status, type: 'FHT', yaml: builder.recordYaml(record, schema), html: html, microdata: item, table: tableHtml, omittedExtensions: extensions };
  }

  function jsonld() { throw new Error('FHT JSON-LD is unsupported'); }
  return { PROFILE: PROFILE, ITEMTYPE: ITEMTYPE, STATIC_STYLE: STYLE, select: select, formSections: formSections,
    validate: validate, completenessIssues: completenessIssues, capabilityIssues: capabilityIssues,
    exportsFor: exportsFor, jsonld: jsonld };
}));
