/* ==========================================================================
   FAIR BioHeaders table builder
   Builds one typed FHR, FHP, FHGFF3 or FHT metadata record from a form, validates it
   against the selected supported schema snapshot, and produces a readable table,
   a standalone HTML document (with type-specific microdata), and a YAML metadata
   file.

   The pure functions are exported for Node tests; the DOM wiring runs only in
   the browser when the builder container is present.
   ========================================================================== */

(function () {
  'use strict';

  // Authoritative schema. The bundled copy under assets/schema/fhr.json is a
  // cache of this URL; see docs/maintenance.md for provenance and refresh.
  var SCHEMA_URL = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json';

  var SHARED_RAW = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/';

  // Supported released contracts. One entry per (type, shared release) pair the
  // builder can produce, each backed by a byte-pinned local snapshot and the
  // citation aliases that select it. `declares` is the schemaVersion that release
  // publishes for that type, taken from the shared registry
  // (FAIR-bioHeaders-Specification schemas/versions.json, pinned at
  // scripts/schema-snapshots/versions-v0.6.0.json); it is not derived from the
  // enum order of whichever schema is loaded. The first entry per type is the
  // default a new draft starts from. No entry here is a fallback for another: a
  // citation that matches no alias is unsupported and blocks export.
  var RELEASES = {
    FHR: [
      { type: 'FHR', release: 'v0.6.0', declares: '2.1', snapshot: 'fhr-v0.6.0.json',
        aliases: [
          'https://w3id.org/fair-bioheaders/fhr/v0.6.0',
          'https://w3id.org/fair-bioheaders/fhr/v0.6.0/',
          SHARED_RAW + 'v0.6.0/fhr.json'
        ] },
      { type: 'FHR', release: 'v0.4.0', declares: '2.0', snapshot: 'fhr-v0.4.0.json',
        aliases: [
          'https://w3id.org/fair-bioheaders/fhr/v0.4.0',
          'https://w3id.org/fair-bioheaders/fhr/v0.4.0/',
          SHARED_RAW + 'v0.4.0/fhr.json'
        ] },
      { type: 'FHR', release: 'v0.3.1', declares: 1, snapshot: 'fhr-v0.3.1.json',
        legacy: true,
        aliases: [
          'https://w3id.org/fair-bioheaders/fhr/v0.3.1',
          SHARED_RAW + 'v0.3.1/fhr.json',
          'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/v0.3.1/fhr.json',
          'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/378b534dda9c1d759f25b4b32287172402492233/fhr.json'
        ] }
    ],
    FHP: [
      { type: 'FHP', release: 'v0.6.0', declares: '1.2', snapshot: 'fhp-v0.6.0.json',
        aliases: [
          'https://w3id.org/fair-bioheaders/fhp/v0.6.0',
          'https://w3id.org/fair-bioheaders/fhp/v0.6.0/',
          SHARED_RAW + 'v0.6.0/fhp.json'
        ] },
      { type: 'FHP', release: 'v0.4.0', declares: '1.0', snapshot: 'fhp-v0.4.0.json',
        aliases: [
          'https://w3id.org/fair-bioheaders/fhp/v0.4.0',
          'https://w3id.org/fair-bioheaders/fhp/v0.4.0/',
          SHARED_RAW + 'v0.4.0/fhp.json'
        ] }
    ],
    FHT: [
      { type: 'FHT', release: 'v0.7.0', declares: '1.0', snapshot: 'fht-v0.7.0.json',
        aliases: ['https://w3id.org/fair-bioheaders/fht/v0.7.0',
          'https://w3id.org/fair-bioheaders/fht/v0.7.0/', SHARED_RAW + 'v0.7.0/fht.json',
          SHARED_RAW + 'main/fht.json'] }
    ],
    FHGFF3: [
      { type: 'FHGFF3', release: 'v0.6.0', declares: '1.2', snapshot: 'fhgff3-v0.6.0.json',
        aliases: [
          'https://w3id.org/fair-bioheaders/fhgff3/v0.6.0',
          'https://w3id.org/fair-bioheaders/fhgff3/v0.6.0/',
          SHARED_RAW + 'v0.6.0/fhgff3.json'
        ] },
      { type: 'FHGFF3', release: 'v0.4.0', declares: '1.0', snapshot: 'fhgff3-v0.4.0.json',
        aliases: [
          'https://w3id.org/fair-bioheaders/fhgff3/v0.4.0',
          'https://w3id.org/fair-bioheaders/fhgff3/v0.4.0/',
          SHARED_RAW + 'v0.4.0/fhgff3.json'
        ] }
    ]
  };

  // The historical raw-main development cache. Selecting it is an explicit
  // development action against the documented October 9 copy, never an automatic
  // substitute for a cited release (docs/maintenance.md).
  var DEVELOPMENT = { type: 'FHR', release: 'raw-main', snapshot: 'fhr.json',
    declares: 1, legacy: true, aliases: [SCHEMA_URL] };

  function allReleases() {
    return [DEVELOPMENT].concat(RELEASES.FHR, RELEASES.FHP, RELEASES.FHGFF3, RELEASES.FHT);
  }

  // The FHP itemtype identity is the raw-main FHP schema URL, fixed by the FHP
  // microdata binding (FHP-Specification docs/FHP-MICRODATA.md F1); the record's
  // own `schema` property selects the contract version. FHP is never labeled
  // with the FHR itemtype. FHGFF3 uses its own H1 identity.
  var FHT_ITEMTYPE_URL = 'https://w3id.org/fair-bioheaders/fht/v0.7.0';
  var FHP_ITEMTYPE_URL = SHARED_RAW + 'main/fhp.json';
  var FHGFF3_ITEMTYPE_URL = SHARED_RAW + 'main/fhgff3.json';

  // The extension-key pattern the released v0.5.0+ contracts declare. Named here for
  // reader-facing help text; validation always reads patternProperties from the bytes.
  var EXTENSION_KEY_PATTERN = '^x-[A-Za-z0-9][A-Za-z0-9_.-]*$';

  // Extension fields (docs/FORMAT.md rule R15) are top-level keys the closed
  // object otherwise rejects. The pattern is read from the selected snapshot's
  // own `patternProperties` so the builder follows the contract bytes instead of
  // duplicating the regular expression.
  function extensionPatterns(schema) {
    var declared = schema && schema.patternProperties;
    return declared ? Object.keys(declared) : [];
  }

  function selectRelease(target) {
    var matches = allReleases().filter(function (entry) {
      return entry.aliases.indexOf(target) !== -1;
    });
    if (matches.length !== 1) return null;
    return matches[0];
  }

  // Maps a cited schema URL onto the loaded snapshot for exactly that release.
  // `snapshots` is keyed by snapshot file name; an unknown or cross-type target
  // returns null so the caller can block export rather than substitute.
  function selectSchema(target, snapshots) {
    var entry = selectRelease(target);
    if (!entry || !snapshots) return null;
    return snapshots[entry.snapshot] || null;
  }

  function recordType(record) {
    var match = String(record.schema || '').match(/(?:\/)(fhp|fhgff3|fht)(?:\/|\.json)/);
    return match ? match[1].toUpperCase() : 'FHR';
  }

  function recordTitle(record) {
    return recordType(record) + ' metadata' + ((record.genome || record.proteome || record.annotation || record.transcriptome) ?
      ': ' + (record.genome || record.proteome || record.annotation || record.transcriptome) : '');
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
        { path: 'schema', label: 'FHR schema URL', kind: 'text', required: true, default: RELEASES.FHR[0].aliases[0],
          help: 'Cite one supported FHR release: v0.6.0 (schema 2.1), v0.4.0 (schema 2.0) or legacy v0.3.1 (schema 1), or a fixed raw-tag alias of the same release. Raw-main checks only the documented October 9 cache; any other target is unsupported and blocks downloads.' },
        { path: 'schemaVersion', label: 'Schema version', kind: 'text', required: true, default: RELEASES.FHR[0].declares,
          help: 'Set from the cited release; distinct from the genome version. Schema 2.x is a string; legacy 1 is numeric.' }
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
            { name: 'name', label: 'Name', kind: 'text' },
            { name: 'nameType', label: 'Author type (defined in schema 2.0)', kind: 'select', options: ['', 'Personal', 'Organizational'] },
            { name: 'uri', label: 'ORCID URI', kind: 'text', format: 'uri' }
          ] },
        { path: 'assemblyAuthor', label: 'Assembly authors', kind: 'objectList', required: true,
          help: 'People or organizations who assembled the genome. Distinct from metadata authors.', fields: [
            { name: 'name', label: 'Name', kind: 'text' },
            { name: 'nameType', label: 'Author type (defined in schema 2.0)', kind: 'select', options: ['', 'Personal', 'Organizational'] },
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
          { name: 'N50', label: 'Contig N50 (bp)', kind: 'integer' },
          { name: 'N90', label: 'Contig N90 (bp)', kind: 'integer' },
          { name: 'L50', label: 'L50 (contigs)', kind: 'integer' },
          { name: 'L90', label: 'L90 (contigs)', kind: 'integer' },
          { name: 'scaffoldN50', label: 'Scaffold N50 (bp; defined in schema 2.0)', kind: 'integer' },
          { name: 'scaffoldN90', label: 'Scaffold N90 (bp; defined in schema 2.0)', kind: 'integer' },
          { name: 'scaffoldL50', label: 'Scaffold L50 (scaffolds; defined in schema 2.0)', kind: 'integer' },
          { name: 'scaffoldL90', label: 'Scaffold L90 (scaffolds; defined in schema 2.0)', kind: 'integer' },
          { name: 'totalBasePairs', label: 'Total base pairs (bp)', kind: 'integer' },
          { name: 'numberContigs', label: 'Number of contigs', kind: 'integer' },
          { name: 'numberScaffolds', label: 'Number of scaffolds', kind: 'integer' },
          { name: 'gcContent', label: 'GC content (%)', kind: 'number', help: '0–100 percent: 42 means 42%; 0.42 means 0.42%. No fraction conversion is performed.' },
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

  // A schema's own property definition, never one inherited from
  // Object.prototype (a record key such as toString or __proto__).
  function ownProperty(object, key) {
    return object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
  }

  function resolveRef(schema, root) {
    if (!schema || !schema.$ref) return schema;
    if (schema.$ref.indexOf('#/') !== 0) throw new Error('Unsupported external schema reference');
    return schema.$ref.slice(2).split('/').reduce(function (node, part) {
      return node && node[part.replace(/~1/g, '/').replace(/~0/g, '~')] !== undefined ? node[part.replace(/~1/g, '/').replace(/~0/g, '~')] : {};
    }, root);
  }

  function isUri(value) {
    value = String(value);
    var match = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(value);
    if (!match) return false;

    function component(text, extra) {
      for (var i = 0; i < text.length; i++) {
        var character = text.charAt(i);
        if (character === '%') {
          if (!/^[0-9A-Fa-f]{2}$/.test(text.slice(i + 1, i + 3))) return false;
          i += 2;
        } else if (!/[A-Za-z0-9._~-]/.test(character) &&
          !/[!$&'()*+,;=]/.test(character) && extra.indexOf(character) === -1) {
          return false;
        }
      }
      return true;
    }

    function ipv4(address) {
      var octets = address.split('.');
      return octets.length === 4 && octets.every(function (octet) {
        return /^(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/.test(octet);
      });
    }

    function ipv6(address) {
      if (address.indexOf('.') !== -1) {
        var lastColon = address.lastIndexOf(':');
        if (lastColon === -1 || !ipv4(address.slice(lastColon + 1))) return false;
        address = address.slice(0, lastColon) + ':0:0';
      }
      var compression = address.indexOf('::');
      var compressed = compression !== -1;
      if (address.indexOf(':::') !== -1 ||
        (compressed && compression !== address.lastIndexOf('::'))) return false;
      var groups = compressed
        ? (address.slice(0, compression) ? address.slice(0, compression).split(':') : [])
          .concat(address.slice(compression + 2) ? address.slice(compression + 2).split(':') : [])
        : address.split(':');
      if (groups.some(function (group) { return !/^[0-9A-Fa-f]{1,4}$/.test(group); })) return false;
      return compressed ? groups.length < 8 : groups.length === 8;
    }

    function ipLiteral(host) {
      if (/^v[0-9A-Fa-f]+\.[A-Za-z0-9._~!$&'()*+,;=:-]+$/i.test(host)) return true;
      return ipv6(host);
    }

    function authorityIsValid(authority) {
      var at = authority.indexOf('@');
      if (at !== -1) {
        if (!component(authority.slice(0, at), ':') || authority.indexOf('@', at + 1) !== -1) return false;
        authority = authority.slice(at + 1);
      }

      var host;
      var port = null;
      if (authority.charAt(0) === '[') {
        var close = authority.indexOf(']');
        if (close === -1 || !ipLiteral(authority.slice(1, close))) return false;
        host = authority.slice(0, close + 1);
        var suffix = authority.slice(close + 1);
        if (suffix && suffix.charAt(0) !== ':') return false;
        if (suffix) port = suffix.slice(1);
      } else {
        if (authority.indexOf('[') !== -1 || authority.indexOf(']') !== -1) return false;
        var colon = authority.indexOf(':');
        if (colon !== -1) {
          if (colon !== authority.lastIndexOf(':')) return false;
          host = authority.slice(0, colon);
          port = authority.slice(colon + 1);
        } else {
          host = authority;
        }
        if (!component(host, '')) return false;
      }
      return port === null || /^[0-9]*$/.test(port);
    }

    var remainder = value.slice(match[0].length);
    var fragment = remainder.indexOf('#');
    if (fragment !== -1) {
      if (fragment !== remainder.lastIndexOf('#') || !component(remainder.slice(fragment + 1), '/?:@')) return false;
      remainder = remainder.slice(0, fragment);
    }
    var query = remainder.indexOf('?');
    if (query !== -1) {
      if (!component(remainder.slice(query + 1), '/?:@')) return false;
      remainder = remainder.slice(0, query);
    }

    var path = remainder;
    if (remainder.indexOf('//') === 0) {
      var pathStart = remainder.indexOf('/', 2);
      var authority = pathStart === -1 ? remainder.slice(2) : remainder.slice(2, pathStart);
      path = pathStart === -1 ? '' : remainder.slice(pathStart);
      if (!authorityIsValid(authority) || (path && path.charAt(0) !== '/') || !component(path, ':/@')) return false;
    } else if (remainder.charAt(0) === '/' && remainder.indexOf('//') !== 0) {
      if (!component(path, ':/@')) return false;
    } else if (remainder) {
      if (remainder.charAt(0) === '/') return false;
      if (!component(path, ':/@')) return false;
    }
    return true;
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
    function matches(node) {
      var sink = [];
      validateSchema(value, node, root, path, sink);
      return sink.length === 0;
    }
    if (schema.allOf) schema.allOf.forEach(function (node) { validateSchema(value, node, root, path, errors); });
    if (schema.not && matches(schema.not)) errors.push({ path: path, message: 'matches a forbidden combination (check parent relationships; at most one annotates link)' });
    if (schema.if) {
      var branch = matches(schema.if) ? schema.then : schema.else;
      if (branch) validateSchema(value, branch, root, path, errors);
    }
    if (Object.prototype.hasOwnProperty.call(schema, 'const') && value !== schema.const) {
      errors.push({ path: path, message: 'must equal ' + JSON.stringify(schema.const) });
    }
    if (Array.isArray(value) && schema.contains) {
      var count = value.filter(function (item) {
        var sink = []; validateSchema(item, schema.contains, root, path, sink); return !sink.length;
      }).length;
      if (count < (schema.minContains === undefined ? 1 : schema.minContains)) {
        errors.push({ path: path, message: 'must contain the required matching parent relationship' });
      }
    }
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
        errors.push({ path: path, message: 'value does not match any allowed form' + (schema === root && root.properties.genomeReference ? ': supply genomeReference (accession and seqcol_id), or an FHR derivedFrom link with relationship annotates' : '') });
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
    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push({ path: path, message: 'must contain at least ' + schema.minItems + ' items' });
      }
      if (schema.uniqueItems) {
        function identity(item) {
          if (Array.isArray(item)) return ['array', item.map(identity)];
          if (item && typeof item === 'object') return ['object', Object.keys(item).sort().map(function (key) { return [key, identity(item[key])]; })];
          return [typeof item, item];
        }
        var seen = new Set();
        value.forEach(function (item) {
          var key = JSON.stringify(identity(item));
          if (seen.has(key)) errors.push({ path: path, message: 'must contain unique items' });
          seen.add(key);
        });
      }
    }
    if (Array.isArray(value) && schema.items) {
      value.forEach(function (item, index) {
        validateSchema(item, schema.items, root, path.concat([index]), errors);
      });
    }
    if (jsonType(value) === 'object') {
      var properties = schema.properties || {};
      var patterns = schema.patternProperties || {};
      (schema.required || []).forEach(function (key) {
        if (value[key] === undefined) {
          errors.push({ path: path.concat([key]), message: 'is required' });
        }
      });
      // `propertyNames` constrains the keys themselves; the released v0.5.0+ schemas
      // use it to forbid a line feed in any key and to forbid `x-` keys in a record
      // that states an older minor.
      if (schema.propertyNames) {
        var forbidden = schema.propertyNames.not && schema.propertyNames.not.pattern;
        var reason = forbidden === '\n' ? 'no key may contain a line feed (rule R15)'
          : forbidden === '^x-' ? 'is not allowed by the schemaVersion this record states: extension fields need the newer minor (rule R15)'
          : 'is not an allowed property name for this contract';
        Object.keys(value).forEach(function (key) {
          var sink = [];
          validateSchema(key, schema.propertyNames, root, path.concat([key]), sink);
          if (sink.length) errors.push({ path: path.concat([key]), message: reason });
        });
      }
      Object.keys(value).forEach(function (key) {
        var matched = false;
        if (ownProperty(properties, key)) {
          matched = true;
          validateSchema(value[key], properties[key], root, path.concat([key]), errors);
        }
        Object.keys(patterns).forEach(function (expression) {
          if (new RegExp(expression).test(key)) {
            matched = true;
            validateSchema(value[key], patterns[expression], root, path.concat([key]), errors);
          }
        });
        if (!matched && schema.additionalProperties === false) {
          errors.push({ path: path.concat([key]), message: 'is not an allowed property' });
        }
      });
    }
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
      return [{ path: path, kind: 'unsupported-value', message: 'Browser cannot preserve this numeric value exactly; use an exact-number runtime' }];
    }
    if (!value || typeof value !== 'object') return [];
    return Object.keys(value).reduce(function (issues, key) {
      return issues.concat(capabilityIssues(value[key], path.concat(Array.isArray(value) ? Number(key) : key)));
    }, []);
  }

  function validateRecord(record, schema) {
    var errors = [];
    validateSchema(record, schema, schema, [], errors);
    // R4 applies outside the frozen JSON Schema bytes, including metadata-only
    // exports and parent identities. Extension data is not a standard checksum.
    function canonical(value, path) {
      if (typeof value === 'string' && !/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(value)) {
        errors.push({ path: path, message: 'must be a canonical SHA-512/256 base64 checksum (rule R4)' });
      }
    }
    if (record && typeof record === 'object') {
      canonical(record.checksum, ['checksum']);
      if (Array.isArray(record.derivedFrom)) record.derivedFrom.forEach(function (parent, index) {
        if (parent && typeof parent === 'object') canonical(parent.checksum, ['derivedFrom', index, 'checksum']);
      });
    }
    if (record && recordType(record) === 'FHT') errors = errors.concat(capabilityIssues(record), completenessIssues(record));
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
    // JSON.stringify already escapes C0 controls, quotes, backslashes and lone
    // surrogates. YAML additionally treats DEL, the C1 block (U+0080-U+009F),
    // U+FFFE and U+FFFF as non-printable, and U+0085/U+2028/U+2029 as line
    // breaks, so a YAML loader rejects or folds them unless they are escaped.
    var text = String(value);
    return JSON.stringify(text).replace(/[\u007f-\u009f\u2028\u2029\ufffe\uffff]/g, function (character) {
      return '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0');
    });
  }

  function emitMap(object, indent, order, schema, root) {
    root = root || schema;
    schema = resolveRef(schema, root);
    var pad = new Array(indent + 1).join(' ');
    var props = (schema && schema.properties) || {};
    var lines = [];
    var keys = order ? order.filter(function (key) { return object[key] !== undefined; }) : Object.keys(object);
    keys.forEach(function (key) {
      var value = object[key];
      var node = resolveRef(ownProperty(props, key) || {}, root);
      if (Array.isArray(value)) {
        if (value.length === 0) { lines.push(pad + key + ': []'); return; }
        lines.push(pad + key + ':');
        emitSeq(value, indent, lines, node.items, root);
      } else if (value && typeof value === 'object') {
        if (Object.keys(value).length === 0) { lines.push(pad + key + ': {}'); return; }
        lines.push(pad + key + ':');
        emitMap(value, indent + 2, null, node, root).forEach(function (line) { lines.push(line); });
      } else {
        lines.push(pad + key + ': ' + yamlScalar(value, node.type));
      }
    });
    return lines;
  }

  function emitSeq(array, indent, lines, itemSchema, root) {
    var pad = new Array(indent + 1).join(' ');
    itemSchema = resolveRef(itemSchema || {}, root);
    array.forEach(function (item) {
      if (Array.isArray(item)) {
        lines.push(pad + '-');
        emitSeq(item, indent + 2, lines, itemSchema.items, root);
      } else if (item && typeof item === 'object') {
        var inner = emitMap(item, indent + 2, null, itemSchema, root);
        inner[0] = pad + '- ' + inner[0].slice(indent + 2);
        inner.forEach(function (line) { lines.push(line); });
      } else {
        lines.push(pad + '- ' + yamlScalar(item, itemSchema.type));
      }
    });
  }

  // Top-level keys the closed object would reject but the selected contract allows
  // through `patternProperties` — the rule R15 extension fields, in record order.
  // Without a snapshot (an unsupported citation) any `x-` shaped key qualifies, so
  // the preview stays conservative about what it puts into microdata.
  function extensionKeys(record, schema) {
    var patterns = schema ? extensionPatterns(schema) : [];
    return Object.keys(record).filter(function (key) {
      if (!patterns.length) return key.indexOf('x-') === 0;
      if (ownProperty(schema.properties, key)) return false;
      return patterns.some(function (expression) { return new RegExp(expression).test(key); });
    });
  }

  // Emission order: the canonical order for known fields, then any extension
  // fields the selected contract allows. Extension keys are never dropped here:
  // the YAML export is the lossless record, and docs/MICRODATA.md M5 removes them
  // from HTML instead.
  function orderedKeys(record, schema, canonical) {
    var known = canonical || Object.keys(record);
    var order = known.filter(function (key) { return record[key] !== undefined; });
    extensionKeys(record, schema).forEach(function (key) {
      if (order.indexOf(key) === -1) order.push(key);
    });
    return order;
  }

  function toYaml(record, schema) {
    var canonical = recordType(record) === 'FHR' ? FIELD_ORDER : null;
    return emitMap(record, 0, orderedKeys(record, schema, canonical), schema).join('\n') + '\n';
  }

  // Pure record-order serializer for separately reviewed candidate profiles.
  // It does not register a release or enable a type in the browser form.
  function recordYaml(record, schema) {
    return emitMap(record, 0, Object.keys(record), schema).join('\n') + '\n';
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

  function htmlValue(key, value, schemaNode, root) {
    var prop = escapeHtml(key);
    var resolved = root ? resolveRef(schemaNode || {}, root) : schemaNode || {};
    if (Array.isArray(value)) {
      var itemSchema = resolved.items || {};
      return '<span itemprop="' + prop + '" data-fhr-type="array">' +
        value.map(function (item) { return htmlValue('item', item, itemSchema, root); }).join('') + '</span>';
    }
    if (value && typeof value === 'object') {
      var props = resolved.properties || {};
      // Rule R15 keys are never written into microdata at any level (M5); a record
      // that nests one is already invalid, and its preview must not tempt a reader.
      var content = Object.keys(value)
        .filter(function (k) { return k.indexOf('x-') !== 0; })
        .map(function (k) {
          return htmlValue(k, value[k], ownProperty(props, k), root);
        }).join('');
      return '<span itemprop="' + prop + '" itemscope data-fhr-type="object">' + content + '</span>';
    }
    var kind = declaredKind(value, resolved);
    var text = typeof value === 'string' ? value : JSON.stringify(value);
    return '<span itemprop="' + prop + '" data-fhr-type="' + kind + '">' + escapeHtml(text) + '</span>';
  }

  function microdataDiv(record, schema) {
    var kind = recordType(record);
    if (kind !== 'FHR' && kind !== 'FHP' && kind !== 'FHGFF3' && kind !== 'FHT') {
      throw new Error('HTML microdata is only supported for FHR, FHP, FHGFF3 and FHT');
    }
    var props = (schema && schema.properties) || {};
    // FHR keeps its canonical FIELD_ORDER; FHP follows the record's own key
    // order, matching its YAML export and the toolkit writer's property order.
    // Extension fields are left out of the item in both cases: docs/MICRODATA.md
    // M5 says microdata carries no `x-` key, and the released toolkit rejects a
    // page whose item has one (verified with fair-bioheaders 0.11.0).
    var extensions = extensionKeys(record, schema);
    var order = (kind === 'FHR' ? FIELD_ORDER : Object.keys(record))
      .filter(function (key) {
        return record[key] !== undefined && extensions.indexOf(key) === -1;
      });
    return '<div itemscope itemtype="' + (kind === 'FHR' ? SCHEMA_URL : kind === 'FHP' ? FHP_ITEMTYPE_URL : kind === 'FHT' ? FHT_ITEMTYPE_URL : FHGFF3_ITEMTYPE_URL) + '">' +
      order.map(function (key) { return htmlValue(key, record[key], ownProperty(props, key), schema); }).join('') + '</div>';
  }

  // The M5 note a microdata writer owes the reader: which keys it left out.
  function microdataOmissionNote(record, schema) {
    var extensions = extensionKeys(record, schema);
    if (!extensions.length) return '';
    return '\n<p>Extension fields are not carried by HTML microdata ' +
      '(FAIR-bioHeaders-Specification docs/MICRODATA.md M5); this document omits ' +
      extensions.map(function (key) { return '"' + escapeHtml(key) + '"'; }).join(', ') +
      '. The YAML metadata export keeps them.</p>';
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
    if (recordType(record) !== 'FHR') {
      var flattened = [];
      function visit(value, path) {
        if (value && typeof value === 'object' && Object.keys(value).length) {
          Object.keys(value).forEach(function (key) { visit(value[key], path ? path + '.' + key : key); });
        } else flattened.push({ label: path, value: value && typeof value === 'object' ? JSON.stringify(value) : String(value) });
      }
      visit(record, '');
      return [{ group: recordType(record) + ' metadata', rows: flattened }];
    }
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
    // Extension fields (rule R15) are the only top-level keys the released FHR
    // contract allows outside FIELD_ORDER; the readable table shows them as their
    // own key/value rows.
    var extra = Object.keys(record).filter(function (key) {
      return FIELD_ORDER.indexOf(key) === -1 && record[key] !== undefined;
    });
    if (extra.length) {
      rows.push({
        group: 'Extension fields',
        rows: extra.map(function (key) { return { label: key, value: displayValue(record[key]) }; })
      });
    }
    return rows;
  }

  function tableHtml(record) {
    var caption = recordTitle(record);
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
    var title = recordTitle(record);
    var kind = recordType(record);
    var carriesMicrodata = kind === 'FHR' || kind === 'FHP' || kind === 'FHGFF3' || kind === 'FHT';
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
      '<title>' + escapeHtml(title) + '</title></head><body>\n' +
      '<h1>' + escapeHtml(title) + '</h1>\n' +
      tableHtml(record) + '\n' +
      (carriesMicrodata ?
        '<h2>Machine-readable ' + kind + ' microdata</h2>\n' +
          (kind === 'FHT' ? '<p>FHT v0.7.0 typed HTML; JSON-LD is unsupported. Metadata validity does not verify file bytes, parent identity or biological derivation.</p>\n' : kind === 'FHGFF3' ? '<p>Experimental FHGFF3 HTML binding; JSON-LD is unsupported. Header metadata does not validate annotation features.</p>\n' : '') + microdataDiv(record, schema) +
          microdataOmissionNote(record, schema) :
        '<p>Readable table only: ' + kind + ' HTML microdata is not supported. Preserve the YAML metadata separately.</p>') + '\n' +
      '</body></html>\n';
  }

  var api = {
    SCHEMA_URL: SCHEMA_URL,
    SHARED_RAW: SHARED_RAW,
    RELEASES: RELEASES,
    DEVELOPMENT: DEVELOPMENT,
    FHP_ITEMTYPE_URL: FHP_ITEMTYPE_URL,
    FHGFF3_ITEMTYPE_URL: FHGFF3_ITEMTYPE_URL,
    FHT_ITEMTYPE_URL: FHT_ITEMTYPE_URL,
    completenessIssues: completenessIssues,
    capabilityIssues: capabilityIssues,
    recordType: recordType,
    selectRelease: selectRelease,
    selectSchema: selectSchema,
    extensionPatterns: extensionPatterns,
    EXTENSION_KEY_PATTERN: EXTENSION_KEY_PATTERN,
    extensionKeys: extensionKeys,
    orderedKeys: orderedKeys,
    contractLabel: contractLabel,
    FIELD_ORDER: FIELD_ORDER,
    GROUPS: GROUPS,
    escapeHtml: escapeHtml,
    validateRecord: validateRecord,
    toYaml: toYaml,
    recordYaml: recordYaml,
    typedHtmlValue: htmlValue,
    microdataDiv: microdataDiv,
    standaloneHtml: standaloneHtml,
    tableRows: tableRows,
    tableHtml: tableHtml
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') window.FairBioHeadersBuilder = api;

  if (typeof document === 'undefined' || typeof module !== 'undefined') {
    return;
  }

  // ------------------------------------------------------------- browser wiring

  var state = {};
  var outputs = null;      // {html, yaml, record}
  var stale = false;
  var objectUrls = [];
  // Pinned contract bytes, keyed by snapshot file name and loaded once from the
  // local assets directory. Nothing here is fetched from a cited URL.
  var snapshots = {};
  var activeType = 'FHR';
  var drafts = { FHR: state };
  // Extension fields are drafted separately from the record body: they are
  // name/value rows the producer appends, and the record is assembled from them
  // at generate time (see buildRecord).
  var extensionDrafts = { FHR: [], FHP: [], FHGFF3: [], FHT: [] };

  function extensionRows() {
    return extensionDrafts[activeType];
  }

  function releasesFor(type) {
    return RELEASES[type] || [];
  }

  function defaultRelease(type) {
    return releasesFor(type)[0] || RELEASES.FHR[0];
  }

  // Local load path for one registry entry. The development cache stays
  // overridable from the page so its documented provenance can be exercised.
  function pathFor(entry, directory, development) {
    if (entry === DEVELOPMENT && development) return development;
    return directory + entry.snapshot;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'text') node.textContent = attrs[key];
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
    if (field.path === 'schemaVersion') input.readOnly = true;
    if (field.path === 'schema') {
      input.setAttribute('list', 'tb-schema-options');
      input.addEventListener('input', function () {
        // The declared schemaVersion follows the cited release exactly as the shared
        // registry publishes it. An unrecognized target changes nothing here: the
        // generate step reports it and blocks export.
        var entry = selectRelease(state.schema);
        if (!entry) return;
        state.schemaVersion = entry.declares;
        var shown = document.getElementById('tb-schemaVersion');
        if (shown) shown.value = state.schemaVersion;
      });
    }
    if (field.help) input.setAttribute('aria-describedby', id + '-help');
    wrap.appendChild(input);
    var help = helpText(id, field);
    if (help) wrap.appendChild(help);
    wrap.appendChild(el('p', { class: 'tb-error', id: id + '-error', hidden: 'hidden' }));
    registerControl(field.path, input, id + '-error');
    return wrap;
  }

  // Extension fields (rule R15) as a repeatable name/value section. The help text is
  // deliberately static: rewriting it when the citation changes shifts the layout under
  // a control the producer may be interacting with at that moment.
  function extensionFieldset() {
    var rows = extensionRows();
    var wrap = el('fieldset', { class: 'tb-group tb-extension', id: 'tb-extensions', tabindex: '-1' });
    wrap.appendChild(el('legend', { text: 'Extension fields' }));
    wrap.appendChild(el('p', { class: 'tb-help', id: 'tb-extensions-help', text:
      'Optional keys the released contracts call extension fields (docs/FORMAT.md rule R15). A name must match '
      + EXTENSION_KEY_PATTERN + ' and the value is recorded as text. FHR 2.1, FHP/FHGFF3 1.1 or later and FHT 1.0 '
      + 'accept them, so a record citing an older release — or stating an older schemaVersion — reports the key '
      + 'as unknown. They appear in the readable table and the YAML; HTML microdata carries none '
      + '(docs/MICRODATA.md M5).' }));
    var host = el('div', { class: 'tb-list__rows' });
    function draw() {
      rerenderList(host, function () {
        rows.forEach(function (row, index) { host.appendChild(extensionRow(row, index, rows, host, draw)); });
      });
    }
    draw();
    wrap.appendChild(host);
    wrap.appendChild(el('button', { type: 'button', class: 'tb-add', id: 'tb-add-extension',
      text: 'Add extension field' }))
      .addEventListener('click', function () {
        rows.push({ name: '', value: '' });
        draw();
        markStale();
        var inputs = host.querySelectorAll('input');
        if (inputs.length) inputs[inputs.length - 2].focus();
      });
    return wrap;
  }

  function extensionRow(row, index, rows, host, draw) {
    var box = el('div', { class: 'tb-list__row' });
    // Each row registers twice: at its stable draft position and, when a key is
    // typed, at that record path — so a schema error on the key and a form-level
    // issue on the row both land on this input. Renaming clears the old key.
    var draftPath = 'extension.' + index + '.name';
    var registrations = function () { return row.name ? [draftPath, row.name] : [draftPath]; };
    var nameId = 'tb-extension-' + index + '-name';
    var valueId = 'tb-extension-' + index + '-value';
    var nameField = el('div', { class: 'tb-field' });
    nameField.appendChild(el('label', { for: nameId, text: 'Extension field ' + (index + 1) + ' name' }));
    var name = el('input', { id: nameId, class: 'tb-input', type: 'text', placeholder: 'x-example-note',
      'aria-describedby': 'tb-extensions-help', autocapitalize: 'off', spellcheck: 'false' });
    name.value = row.name;
    name.addEventListener('input', function () {
      registrations().forEach(function (path) { delete controlRegistry[path]; });
      row.name = name.value;
      registrations().forEach(function (path) { registerControl(path, name, nameId + '-error'); });
      markStale();
    });
    nameField.appendChild(name);
    nameField.appendChild(el('p', { class: 'tb-error', id: nameId + '-error', hidden: 'hidden' }));
    box.appendChild(nameField);
    registrations().forEach(function (path) { registerControl(path, name, nameId + '-error'); });
    var valueField = el('div', { class: 'tb-field' });
    valueField.appendChild(el('label', { for: valueId, text: 'Extension field ' + (index + 1) + ' value' }));
    var value = el('input', { id: valueId, class: 'tb-input', type: 'text' });
    value.value = row.value;
    value.addEventListener('input', function () { row.value = value.value; markStale(); });
    valueField.appendChild(value);
    valueField.appendChild(el('p', { class: 'tb-error', id: valueId + '-error', hidden: 'hidden' }));
    box.appendChild(valueField);
    registerControl('extension.' + index + '.value', value, valueId + '-error');
    box.appendChild(el('button', { type: 'button', class: 'tb-remove', text: 'Remove',
      'aria-label': 'Remove extension field ' + (index + 1) })).addEventListener('click', function () {
      rows.splice(index, 1);
      draw();
      markStale();
    });
    return box;
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
    row.appendChild(el('p', { class: 'tb-error', id: id + '-error', hidden: 'hidden' }));
    registerControl(field.path + '.' + index, input, id + '-error');
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
      required: sub.required, format: sub.format, help: sub.help, options: sub.options }, get, set);
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
    if (activeType !== 'FHR') { renderFamilyForm(container); return; }
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
    // Extension fields are their own repeatable section, after the standard groups.
    form.appendChild(extensionFieldset());
    container.textContent = '';
    form.appendChild(schemaChoices());
    container.appendChild(form);
  }

  // Suggestions for the schema URL field: the pinned releases of the active type
  // plus, for FHR, the documented development cache. A free-text target that
  // matches none of them stays selectable and is reported as unsupported.
  function schemaChoices() {
    var choices = el('datalist', { id: 'tb-schema-options' });
    var entries = activeType === 'FHR' ? [DEVELOPMENT].concat(RELEASES.FHR) : releasesFor(activeType);
    entries.forEach(function (entry) { choices.appendChild(el('option', { value: entry.aliases[0] })); });
    return choices;
  }

  // The snapshot file that drives the form for the current draft: the cited
  // release when it names one of the pinned snapshots for this type, otherwise
  // the type's default release.
  function contractFile() {
    var entry = selectRelease(state.schema);
    if (entry && entry.type === activeType) return entry.snapshot;
    return defaultRelease(activeType).snapshot;
  }

  // The contract the current draft cites, falling back to the active type's
  // default release when the URL field does not name a pinned snapshot.
  function activeSnapshot() {
    return snapshots[contractFile()] || null;
  }


  // The released family contracts define these groups; field types, vocabulary,
  // descriptions and requiredness are read from the fixed local schema.
  function renderFamilyForm(container) {
    var root = activeSnapshot();
    var form = el('form', { class: 'tb-form', novalidate: 'novalidate' });
    var sections = activeType === 'FHT' ? [
      ['Resource', ['schema', 'schemaVersion', 'transcriptome', 'transcriptomeSynonym', 'version', 'assemblyType', 'moleculeType', 'taxon', 'metadataAuthor', 'dateCreated']],
      ['Provenance and methods', ['assemblyAuthor', 'assemblySoftware', 'derivedFrom', 'instrument', 'libraryStrategy', 'strandedness', 'sequencingRuns', 'sample']],
      ['Reported statistics', ['vitalStats', 'completeness']],
      ['Identifiers, rights and integrity', ['accessionID', 'identifier', 'relatedLink', 'scholarlyArticle', 'documentation', 'funding', 'reuseConditions', 'voucherSpecimen', 'checksum']]
    ] : [
      ['Resource', ['schema', 'schemaVersion', 'proteome', 'annotation', 'version', 'sourceType', 'taxon', 'metadataAuthor', 'dateCreated']],
      ['Provenance and methods', ['derivedFrom', 'genomeReference', 'source', 'predictionSoftware', 'annotationSoftware', 'predictionProtocol', 'annotationProtocol', 'geneticCode', 'isoformPolicy', 'soVersion']],
      ['Reported statistics', ['sequenceStats', 'featureCounts', 'completeness']],
      ['Identifiers, rights and integrity', ['accessionID', 'identifier', 'relatedLink', 'scholarlyArticle', 'documentation', 'funding', 'reuseConditions', 'voucherSpecimen', 'checksum']]
    ];
    function field(node, parent, key, path, required) {
      node = Object.assign({}, resolveRef(node, root), node);
      var title = typeof key === 'number' ? 'Entry ' + (key + 1) : String(key).replace(/([a-z])([A-Z])/g, '$1 $2');
      title = title.charAt(0).toUpperCase() + title.slice(1);
      var description = node.description;
      if (path === 'schema') description = 'Cite a pinned ' + activeType + ' release: ' + releasesFor(activeType).map(function (entry) { return entry.release + ' (schema ' + entry.declares + ')'; }).join(' or ') + ', or a fixed raw-tag alias of the same release. Other releases are unavailable for this type.' + (activeType === 'FHT' ? ' Shared raw-main selects this published FHT snapshot, never a future contract.' : ' Raw-main is unavailable for this type.') + '';
      if (path === 'schemaVersion') description = 'Set from the cited release; separate from your resource version.';
      if (key === 'relationship') description = 'Relationship to the parent file; choose from the released vocabulary.';
      if (path === 'checksum') description = 'Producer-supplied sha2-512/256 checksum. Checked structurally only; no file is read or verified.';
      var definition = { path: path, label: title, required: required, help: description,
        kind: path === 'schemaVersion' ? 'text' : node.enum ? 'select' : node.format === 'date' ? 'date' : node.type, options: node.enum ? [''].concat(node.enum) : undefined };
      if (node.type === 'object') {
        if (!parent[key]) parent[key] = {};
        var group = el('fieldset', { class: 'tb-object', id: fieldId(path), tabindex: '-1' });
        group.appendChild(el('legend', { text: title + (required ? ' (required)' : ' (optional)') }));
        if (node.description) group.appendChild(el('p', { class: 'tb-help', text: node.description }));
        Object.keys(node.properties || {}).forEach(function (name) {
          group.appendChild(field(node.properties[name], parent[key], name, path + '.' + name, (node.required || []).indexOf(name) !== -1));
        });
        return group;
      }
      if (node.type === 'array') {
        if (!parent[key]) parent[key] = [];
        var list = el('fieldset', { class: 'tb-list', id: fieldId(path), tabindex: '-1' });
        list.appendChild(el('legend', { text: title + (required ? ' (required)' : ' (optional)') }));
        if (node.description) list.appendChild(el('p', { class: 'tb-help', text: node.description }));
        var rows = el('div');
        function draw() {
          rerenderList(rows, function () {
            parent[key].forEach(function (_, index) {
              var row = el('div', { class: 'tb-list__row' });
              row.appendChild(field(node.items, parent[key], index, path + '.' + index, false));
              var remove = el('button', { type: 'button', class: 'tb-remove', text: 'Remove ' + title + ' ' + (index + 1) });
              remove.addEventListener('click', function () { parent[key].splice(index, 1); draw(); markStale(); });
              row.appendChild(remove); rows.appendChild(row);
            });
          });
        }
        draw(); list.appendChild(rows);
        var add = el('button', { type: 'button', id: 'tb-add-' + slug(path), class: 'tb-add', text: 'Add ' + title });
        add.addEventListener('click', function () {
          var item = resolveRef(node.items, root);
          parent[key].push(item.type === 'object' ? {} : ''); draw(); markStale();
          var controls = rows.querySelectorAll('input, select');
          if (controls.length) controls[controls.length - 1].focus();
        });
        list.appendChild(add); return list;
      }
      return scalarField(definition, function () { return parent[key] === undefined ? '' : parent[key]; }, function (value) {
        var number = Number(value);
        var mantissa = String(value).split(/[eE]/)[0];
        var underflow = number === 0 && /[1-9]/.test(mantissa);
        // Preserve unrepresentable input as text so validation refuses it rather
        // than silently exporting zero after numeric underflow.
        parent[key] = value !== '' && (node.type === 'integer' || node.type === 'number') && !underflow ? number : value;
      });
    }
    sections.forEach(function (section) {
      var group = el('fieldset', { class: 'tb-group' });
      group.appendChild(el('legend', { text: section[0] }));
      section[1].forEach(function (key) {
        if (root.properties[key]) group.appendChild(field(root.properties[key], state, key, key, root.required.indexOf(key) !== -1));
      });
      form.appendChild(group);
    });
    // Extension fields are their own repeatable section, after the standard groups.
    form.appendChild(extensionFieldset());
    container.textContent = '';
    form.appendChild(schemaChoices());
    container.appendChild(form);
  }

  function changeProfile() {
    drafts[activeType] = state;
    activeType = document.getElementById('tb-profile').value;
    var entry = defaultRelease(activeType);
    state = drafts[activeType] || { schema: entry.aliases[0], schemaVersion: entry.declares };
    drafts[activeType] = state;
    outputs = null; stale = false; toggleDownloads(false);
    ['tb-table', 'tb-html-source', 'tb-yaml-source', 'tb-errors'].forEach(function (id) { document.getElementById(id).textContent = ''; });
    document.getElementById('tb-errors').hidden = true;
    renderForm(document.getElementById('tb-form'));
    setStatus(activeType + ' selected, citing ' + entry.release + ' (schema ' + entry.declares +
      '). Entries are kept separately for each type during this visit. Generate to validate.', 'stale');
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

  // Map compact record paths back to visible draft rows without dropping blanks
  // from the form. Required-property errors can inherit their object's mapping.
  var recordPaths = {};
  function prune(value, draftPath, recordPath) {
    var cleaned;
    if (Array.isArray(value)) {
      var items = [];
      value.forEach(function (item, index) {
        var kept = prune(item, draftPath.concat([index]), recordPath.concat([items.length]));
        if (kept !== undefined) items.push(kept);
      });
      cleaned = items.length ? items : undefined;
    } else if (value && typeof value === 'object') {
      var object = {};
      Object.keys(value).forEach(function (key) {
        var kept = prune(value[key], draftPath.concat([key]), recordPath.concat([key]));
        if (kept !== undefined) object[key] = kept;
      });
      cleaned = Object.keys(object).length ? object : undefined;
    } else if (value !== '' && value !== undefined && value !== null) {
      cleaned = value;
    }
    if (cleaned !== undefined) recordPaths[JSON.stringify(recordPath)] = draftPath;
    return cleaned;
  }

  function draftErrorPath(path) {
    for (var length = path.length; length >= 0; length--) {
      var prefix = recordPaths[JSON.stringify(path.slice(0, length))];
      if (prefix) return prefix.concat(path.slice(length));
    }
    return path;
  }

  // Rows the producer typed that cannot become a key: an empty row is simply
  // omitted, but a duplicate or standard-field name is reported instead of
  // silently winning over the field above it (rule R15).
  var extensionIssues = [];

  function buildRecord() {
    recordPaths = {};
    var record = prune(state, [], []);
    record = record && typeof record === 'object' ? record : {};
    var properties = (activeSnapshot() || {}).properties || {};
    // A Map, so names such as toString or __proto__ are not mistaken for
    // keys already written by an earlier row.
    var seen = new Map();
    extensionIssues = [];
    extensionRows().forEach(function (row, index) {
      var name = String(row.name || '');
      if (!name || !String(row.value || '').length) return;
      if (Object.prototype.hasOwnProperty.call(properties, name)) {
        extensionIssues.push({ path: [name], draft: ['extension', index, 'name'], label: [name],
          message: 'is a standard field name; extension fields never override one (rule R15), so edit the field above instead' });
        return;
      }
      if (seen.has(name)) {
        extensionIssues.push({ path: [name], draft: ['extension', index, 'name'], label: [name],
          message: 'is written by more than one extension row; keep one row per key' });
        return;
      }
      seen.set(name, index);
      // Define rather than assign, so a __proto__ row stays an own key that
      // validation reports instead of silently changing the record prototype.
      Object.defineProperty(record, name, { value: row.value, enumerable: true, writable: true, configurable: true });
      recordPaths[JSON.stringify([name])] = [name];
    });
    return record;
  }

  function renderOutputs() {
    var record = buildRecord();
    var entry = recordType(record) === activeType ? selectRelease(record.schema) : null;
    var selected = entry ? snapshots[entry.snapshot] || null : null;
    var errors = selected ? validateRecord(record, selected).concat(extensionIssues) : [{ path: ['schema'],
      message: 'Unsupported schema target. Select a supported released schema for this header type. Unknown releases never fall back.' }];
    renderErrorSummary(errors.map(function (error) {
      var draft = error.draft || draftErrorPath(error.path);
      // Ordinary errors are named by their draft position, which is the row the
      // producer sees. An extension row has no record-shaped draft position, so it
      // is named by the key it holds.
      var label = draft[0] === 'extension' ? error.path : error.label || draft;
      return { label: label.join('.'), path: draft, message: error.message };
    }));
    renderTable(record);
    outputs = { record: record, html: standaloneHtml(record, selected), yaml: toYaml(record, selected) };
    document.getElementById('tb-html-source').textContent = outputs.html;
    document.getElementById('tb-yaml-source').textContent = outputs.yaml;
    stale = false;
    var ready = errors.length === 0;
    toggleDownloads(ready);
    if (ready) {
      setStatus('Structural validation passed against ' + contractLabel(entry) +
        '. The checksum is not verified against any file.', 'ok');
    } else {
      setStatus('Incomplete or invalid: ' + errors.length + ' issue' + (errors.length === 1 ? '' : 's') +
        '. A draft preview is shown; downloads are disabled until it validates.', 'error');
    }
  }

  function contractLabel(entry) {
    if (!entry) return 'an unsupported target';
    if (entry === DEVELOPMENT) return 'the cached raw-main development snapshot';
    return entry.type + ' ' + entry.release + ' (schema ' + entry.declares + ')';
  }

  function renderErrorSummary(errors) {
    var summary = document.getElementById('tb-errors');
    summary.textContent = '';
    clearFieldErrors();
    if (!errors.length) { summary.hidden = true; return; }
    summary.hidden = false;
    var list = el('ul');
    errors.forEach(function (error) {
      var pointer = error.label;
      var item = el('li');
      var target = errorTarget(error.path);
      var link = el('a', { href: '#' + target.id,
        text: (pointer ? pointer + ': ' : '') + error.message });
      link.addEventListener('click', function () { target.focus(); });
      item.appendChild(link);
      list.appendChild(item);
      markFieldError(error.path, error.message);
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
        var remaining = (entry.input.getAttribute('aria-describedby') || '').split(/\s+/)
          .filter(function (id) { return id && id !== entry.error; });
        if (remaining.length) entry.input.setAttribute('aria-describedby', remaining.join(' '));
        else entry.input.removeAttribute('aria-describedby');
      }
      entry.input.removeAttribute('aria-invalid');
    });
  }

  function markFieldError(path, message) {
    var key = path.join('.');
    var entry = controlRegistry[key];
    if (!entry) return;
    entry.input.setAttribute('aria-invalid', 'true');
    if (entry.error) {
      var node = document.getElementById(entry.error);
      if (node) {
        node.textContent += (node.textContent ? ' ' : '') + message;
        node.hidden = false;
        var descriptions = (entry.input.getAttribute('aria-describedby') || '').split(/\s+/)
          .filter(Boolean);
        if (descriptions.indexOf(entry.error) === -1) descriptions.push(entry.error);
        entry.input.setAttribute('aria-describedby', descriptions.join(' '));
      }
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
    var caption = el('caption', { text: recordTitle(record) });
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
    var filename = activeType.toLowerCase() + '-metadata.' + (isHtml ? 'html' : 'yaml');
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
    var directory = container.getAttribute('data-schema-directory') || '/assets/schema/';
    if (directory.slice(-1) !== '/') directory += '/';
    // The documented development cache stays page-overridable; every released
    // snapshot comes from the registry above. All files are local to this site:
    // citing a URL in the form never causes a network request.
    var development = container.getAttribute('data-schema') || null;
    var entries = allReleases();
    function load(url) {
      return fetch(url).then(function (response) {
        if (!response.ok) throw new Error('schema request failed');
        return response.json();
      });
    }
    Promise.all(entries.map(function (entry) {
      return load(pathFor(entry, directory, development));
    })).then(function (loaded) {
        entries.forEach(function (entry, index) { snapshots[entry.snapshot] = loaded[index]; });
        document.getElementById('tb-profile').addEventListener('change', changeProfile);
        changeProfile();
        document.getElementById('tb-generate').addEventListener('click', renderOutputs);
        document.getElementById('tb-download-html').addEventListener('click', function () { download('html'); });
        document.getElementById('tb-download-yaml').addEventListener('click', function () { download('yaml'); });
        cleanup();
      })
      .catch(function () {
        setStatus('The released schemas could not be loaded, so validation is unavailable. Reload the page and try again.', 'error');
      });
    window.addEventListener('pagehide', cleanup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
