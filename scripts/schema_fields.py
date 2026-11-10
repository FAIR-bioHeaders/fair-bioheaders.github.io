#!/usr/bin/env python3
"""Generate the `/specifications/` field inventories from pinned schema bytes.

`FAIR-bioHeaders-Specification` is the schema authority; this website documents it.
So that the documentation cannot drift from the contract — and cannot become a
second authority either — the field tables on the four specification pages are
**generated** from byte-pinned copies of the published schemas:

    scripts/schema-snapshots/provenance.json    digests, refs, commits and URLs
    scripts/schema-snapshots/<file>             the pinned schema/model/example bytes
    scripts/schema-snapshots/shared-core.json   which slots and objects are shared
    scripts/schema-snapshots/notes/<type>.json  curated examples, units and notes

Each run writes one machine-readable inventory per type:

    _data/schema/<type>.json

Commands, from the repository root:

    python3 scripts/schema_fields.py            # regenerate the inventories
    python3 scripts/schema_fields.py --check    # CI drift check (no writes)
    python3 scripts/schema_fields.py --report   # coverage statistics only
    python3 scripts/schema_fields.py --fetch    # refresh the pinned bytes from their
                                                # authoritative URLs (maintainer step)

`--check` is strict on purpose. It fails when a field is added, removed, renamed,
re-typed or changes requiredness against the committed inventory; when a curated
note names a field that no longer exists; when a documented field has neither a
description nor a curated one; when a field has neither an example nor a stated
reason for omitting it; when the shared-slot labels no longer match the pinned
core model; and when a conditional rule appears in or disappears from the schema
bytes without a matching curated explanation.

Standard library only, like `scripts/check_site.py`, so both run in the same CI job.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT_DIR = ROOT / 'scripts' / 'schema-snapshots'
NOTE_DIR = SNAPSHOT_DIR / 'notes'
PROVENANCE_PATH = SNAPSHOT_DIR / 'provenance.json'
SHARED_PATH = SNAPSHOT_DIR / 'shared-core.json'

# docs/FORMAT.md R15: extension keys are a pattern, not a literal field name.
EXTENSION_PATH = 'x-<name>'
PAGES = ('fhr', 'fht', 'fhp', 'fhgff3')
def field_id(path: str) -> str:
    """Stable, readable anchor for a field path: `derivedFrom[].checksum` -> `derivedfrom-checksum`."""
    return re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-')


CONTAINER_VALUES = ('object', 'array')
ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def check_example(path: str, node: dict, value) -> str | None:
    """Verify a displayed example against the schema's own constraints.

    Examples come from released example records or from the curated notes; either
    way they must satisfy the enum, pattern and range the contract states, so a
    stale or mistyped example cannot stay on the page quietly. `format` is checked
    for `date` only; URI form is prose (docs/FORMAT.md R14), not a pattern.
    """
    if not isinstance(value, str) or not value or value in CONTAINER_VALUES:
        return None
    parts = [p.strip() for p in value.split(',')]
    if 'enum' in node and type_label(node) != 'array':
        if value not in [str(v) for v in node['enum']]:
            return f'{path}: example "{value}" is not one of {node["enum"]}'
    for key in ('pattern', 'minimum', 'maximum', 'minLength', 'maxLength'):
        if key not in node:
            continue
        for part in parts:
            if 'pattern' in node and not re.search(node['pattern'], part):
                return f'{path}: example "{part}" does not match {node["pattern"]}'
            if key in ('minimum', 'maximum'):
                try:
                    number = float(part)
                except ValueError:
                    return f'{path}: example "{part}" is not a number, but the schema bounds it'
                if 'minimum' in node and number < node['minimum']:
                    return f'{path}: example "{part}" is below minimum {node["minimum"]}'
                if 'maximum' in node and number > node['maximum']:
                    return f'{path}: example "{part}" is above maximum {node["maximum"]}'
            if key == 'minLength' and len(part) < node['minLength']:
                return f'{path}: example "{part}" is shorter than minLength {node["minLength"]}'
            if key == 'maxLength' and len(part) > node['maxLength']:
                return f'{path}: example "{part}" is longer than maxLength {node["maxLength"]}'
    for branch in node.get('anyOf', []):
        if 'minimum' in branch or 'maximum' in branch:
            try:
                number = float(value)
            except ValueError:
                return f'{path}: example "{value}" is not a number, but the schema bounds it'
            if not any(branch.get('minimum', number) <= number <= branch.get('maximum', number)
                       for branch in node['anyOf']):
                return f'{path}: example "{value}" is outside every anyOf range'
            break
    if node.get('format') == 'date' and not ISO_DATE.match(value):
        return f'{path}: example "{value}" is not an ISO date'
    return None


def read_json(path: Path):
    with path.open(encoding='utf-8') as handle:
        return json.load(handle)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()



# --------------------------------------------------------------------------
# Inline presentation
# --------------------------------------------------------------------------

LINK = re.compile(r'\[([^\]]+)\]\((https://[^)\s]+)\)')


def markup(text):
    """Escape a prose value, then apply the two inline forms the notes may use.

    `code` spans become <code> and [label](https://url) becomes a link. Everything
    else arrives as escaped text, so schema prose and curated notes can be printed
    directly by the page templates without an escaping step in Liquid.
    """
    if text is None:
        return None
    escaped = html.escape(str(text), quote=False)
    escaped = re.sub(r'`([^`]+)`', r'<code>\1</code>', escaped)
    escaped = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', escaped)
    escaped = LINK.sub(r'<a href="\2">\1</a>', escaped)
    return escaped


def code(value) -> str:
    return '<code>' + html.escape(str(value), quote=False) + '</code>'


# --------------------------------------------------------------------------
# Pinned inputs
# --------------------------------------------------------------------------

def load_provenance() -> dict:
    return read_json(PROVENANCE_PATH)


def snapshot_path(provenance: dict, page: str) -> Path:
    for name, meta in provenance['files'].items():
        if meta['page'] == page:
            return SNAPSHOT_DIR / name
    raise SystemExit(f'provenance.json has no pinned schema for page "{page}"')


def verify_digest(path: Path, recorded: str, label: str, errors: list) -> bytes:
    data = path.read_bytes()
    if sha256(data) != recorded:
        errors.append(f'{label}: bytes no longer match the digest pinned in provenance.json '
                      f'(recorded {recorded}, found {sha256(data)})')
    return data


def load_shared(provenance: dict) -> dict:
    """Shared slot/object labels, verified against the pinned core model bytes.

    A shared slot that is renamed or removed upstream fails the drift check here
    instead of quietly vanishing from the tables.
    """
    shared = read_json(SHARED_PATH)
    errors: list = []
    slots, objects = {}, {}
    for section in ('core', 'shared'):
        entry = shared[section]
        path = SNAPSHOT_DIR / entry['file']
        reference = provenance.get('references', {}).get(entry['file'])
        if reference is None:
            errors.append(f'{entry["file"]}: pinned core model is not recorded in provenance.json')
            continue
        body = verify_digest(path, reference['sha256'], entry['file'], errors).decode('utf-8')
        for name in entry['slots']:
            slots[name] = entry['label']
            if not re.search(rf'^  {re.escape(name)}:$', body, re.MULTILINE):
                errors.append(f'{entry["file"]}: shared-core.json lists slot "{name}", which the model does not define')
        for name in list(entry['objects']) + list(entry.get('enums', [])):
            objects[name] = entry['label']
            if not re.search(rf'^  {re.escape(name)}:$', body, re.MULTILINE):
                errors.append(f'{entry["file"]}: shared-core.json lists object "{name}", which the model does not define')
    if errors:
        raise SystemExit('\n'.join(errors))
    return {'slots': slots, 'objects': objects}


def load_examples(type_name: str) -> dict:
    """Every value the pinned released examples actually state, keyed by field path."""
    provenance = load_provenance()
    merged: dict = {}
    for relative, meta in provenance['examples'].items():
        if meta['type'] != type_name:
            continue
        values = flatten(read_json(SNAPSHOT_DIR / relative))
        for path, value in values.items():
            merged.setdefault(path, {'value': value, 'source': meta['url'], 'label': meta['label']})
    return merged


def flatten(record, prefix=''):
    """Map each path of an example record to the value it states."""
    out = {}
    if isinstance(record, dict):
        for key, value in record.items():
            path = f'{prefix}.{key}' if prefix else key
            if isinstance(value, dict):
                out.setdefault(path, 'object')
                out.update(flatten(value, path))
            elif isinstance(value, list):
                scalars = [v for v in value if not isinstance(v, (dict, list))]
                rendered = ', '.join(json.dumps(v) if isinstance(v, (int, float, bool)) else str(v)
                                     for v in scalars)
                out.setdefault(path, rendered or 'array')
                if value and isinstance(value[0], dict):
                    out[path + '[]'] = 'object'
                    out.update(flatten(value[0], path + '[]'))
            else:
                out[path] = value
    return out


# --------------------------------------------------------------------------
# Schema reading
# --------------------------------------------------------------------------

def definitions(schema: dict) -> dict:
    return schema.get('$defs') or schema.get('definitions') or {}


def deref(node, defs: dict) -> dict:
    """Resolve one local ``$ref``, letting a sibling ``description`` win."""
    if not isinstance(node, dict):
        return {}
    if '$ref' not in node:
        return dict(node)
    name = node['$ref'].rsplit('/', 1)[-1]
    merged = dict(defs.get(name, {}))
    merged['_definition'] = name
    for key, value in node.items():
        if key != '$ref':
            merged[key] = value
    if not merged.get('description') and defs.get(name, {}).get('description'):
        merged['description'] = defs[name]['description']
    return merged


def type_label(node: dict) -> str:
    if node.get('type'):
        return str(node['type'])
    if 'anyOf' in node:
        labels = []
        for branch in node['anyOf']:
            label = type_label(branch)
            if label and label not in labels:
                labels.append(label)
        return ' or '.join(labels) if labels else 'any JSON value'
    return 'string' if 'enum' in node else 'any JSON value'


def array_label(node: dict, defs: dict) -> str:
    items = deref(node.get('items', {}), defs)
    kind = type_label(items)
    name = items.get('_definition')
    if kind == 'object':
        return f'array of {name} objects' if name else 'array of objects'
    if kind == 'any JSON value':
        return 'array'
    return f'array of {kind} values'


def constraint_texts(node: dict) -> list:
    """Constraint text reproduced from the schema bytes."""
    texts = []
    if 'enum' in node:
        texts.append('one of: ' + ' | '.join(str(v) for v in node['enum']))
    if 'const' in node:
        texts.append(f'exactly: {node["const"]}')
    if node.get('format'):
        texts.append(f'format: {node["format"]}')
    if 'pattern' in node:
        texts.append(f'pattern: {node["pattern"]}')
    bounds = []
    if 'minimum' in node:
        bounds.append(f'>= {node["minimum"]}')
    if 'maximum' in node:
        bounds.append(f'<= {node["maximum"]}')
    if bounds:
        texts.append('range: ' + ' and '.join(bounds))
    if 'minLength' in node and node.get('minLength') == node.get('maxLength'):
        texts.append(f'length: exactly {node["minLength"]}')
    else:
        if 'minLength' in node:
            texts.append(f'length: at least {node["minLength"]}')
        if 'maxLength' in node:
            texts.append(f'length: at most {node["maxLength"]}')
    for branch in node.get('anyOf', []):
        sub = constraint_texts(branch)
        if sub:
            texts.append('alternative: ' + '; '.join(sub))
    return texts


def container_of(node: dict, defs: dict):
    """Describe the object members reachable from a property, if it has any."""
    def from_node(raw, kind):
        target = deref(raw, defs)
        if not target.get('properties'):
            return None
        return {
            'kind': kind,
            'definition': target.get('_definition'),
            'properties': target['properties'],
            'required': target.get('required', []),
            'closed': target.get('additionalProperties') is False,
            'description': target.get('description', ''),
            'anyOf': target.get('anyOf'),
        }

    candidates = []
    if node.get('type') == 'array':
        candidates.append(from_node(node.get('items', {}), 'array'))
    elif node.get('type') == 'object' or node.get('properties'):
        candidates.append(from_node(node, 'object'))
    for branch in node.get('anyOf', []):
        branch = deref(branch, defs)
        if branch.get('type') == 'array':
            candidates.append(from_node(branch.get('items', {}), 'array'))
        elif branch.get('type') == 'object' or branch.get('properties'):
            candidates.append(from_node(branch, 'object'))
    return next((c for c in candidates if c), None)


# --------------------------------------------------------------------------
# Inventory builder
# --------------------------------------------------------------------------

class Builder:
    def __init__(self, type_name: str, schema: dict, notes: dict, shared: dict):
        self.type_name = type_name
        self.schema = schema
        self.defs = definitions(schema)
        self.notes = notes
        self.shared = shared
        self.examples = load_examples(type_name)
        self.groups: list = []
        self.used_slugs: set = set()
        self.errors: list = []

    def slug(self, field: str) -> str:
        # derivedFrom[].accessionID -> derived-from-accession-id
        readable = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '-', field or 'record')
        slug = re.sub(r'[^a-zA-Z0-9]+', '-', readable).strip('-').lower() or 'record'
        base, n = slug, 2
        while slug in self.used_slugs:
            slug = f'{base}-{n}'
            n += 1
        self.used_slugs.add(slug)
        return slug

    def new_group(self, field: str, title: str, description: str, **extra) -> dict:
        slug = self.slug(field)
        group = {
            'slug': slug,
            'anchor': f'{self.type_name.lower()}-group-{slug}',
            'field': field,
            'title': title,
            'description': description,
            'rows': [],
            'kind': extra.pop('kind', 'object'),
            'definition': None,
            'closed': None,
            'rule': None,
            'notes': [],
            'inherited': None,
        }
        group.update(extra)
        self.groups.append(group)
        return group

    def members_text(self, required) -> str | None:
        return ', '.join(f'`{name}`' for name in required) if required else None

    def make_row(self, path: str, name: str, node: dict, required: bool,
                 container: bool) -> dict:
        note = self.notes.get('fields', {}).get(path, {})
        row = {
            'path': path,
            'id': f'{self.type_name.lower()}-field-{field_id(path)}',
            'name': name,
            'required': 'Required' if required else 'Optional',
            'type': type_label(node),
            'cardinality': self.cardinality(node),
            'constraints': constraint_texts(node),
            'description': note.get('description') or node.get('description') or '',
            'units': note.get('units'),
            'notes': list(note.get('notes', [])),
            'example': None,
            'exampleNote': None,
            'group': None,
            'members': None,
            'inherited': note.get('inherited'),
            'container': container,
        }
        if not row['description']:
            self.errors.append(f'{self.type_name}: {path} has no description in the schema and none in '
                               f'notes/{self.type_name.lower()}.json')
        if note.get('example') is not None:
            row['example'] = {
                'value': note['example'],
                'source': note.get('exampleSource'),
                'label': note.get('exampleLabel', 'illustrative value'),
            }
        elif path in self.examples and self.examples[path]['value'] not in CONTAINER_VALUES:
            row['example'] = self.examples[path]
        elif note.get('exampleOmitted'):
            row['exampleNote'] = note['exampleOmitted']
        elif container:
            row['exampleNote'] = 'Supplied through its members, listed in its own table below.'
        else:
            self.errors.append(f'{self.type_name}: {path} has no example value; add "example" or '
                               f'"exampleOmitted" to notes/{self.type_name.lower()}.json')
        if row['example'] is not None:
            problem = check_example(path, self.value_node(node), row['example']['value'])
            if problem:
                self.errors.append(f'{self.type_name}: {problem}')
        return row

    def value_node(self, node: dict) -> dict:
        """The node carrying the constraints of the value(s) a field holds."""
        candidates = [node] + [deref(branch, self.defs) for branch in node.get('anyOf', [])]
        for candidate in candidates:
            if candidate.get('type') == 'array':
                return deref(candidate.get('items', {}), self.defs)
        return node

    def cardinality(self, node: dict) -> str:
        labels = []
        for branch in node.get('anyOf', [node]):
            target = deref(branch, self.defs)
            if target.get('type') == 'array':
                label = array_label(target, self.defs)
                if target.get('minItems'):
                    label += f', {target["minItems"]} or more'
                labels.append(label)
            elif target.get('properties') or target.get('type') == 'object':
                labels.append('object')
            else:
                labels.append('single value')
        return ' or '.join(dict.fromkeys(labels))

    def walk(self, properties: dict, prefix: str, required, depth: int) -> list:
        rows = []
        for name, raw in properties.items():
            node = deref(raw, self.defs)
            path = f'{prefix}{name}'
            container = container_of(node, self.defs)
            row = self.make_row(path, name, node, name in (required or []), container is not None)
            if container:
                row['type'] = self.container_type(node, container)
            if not prefix and name in self.shared['slots']:
                row['inherited'] = row['inherited'] or self.shared['slots'][name]
            if container and depth < 6:
                group = self.build_group(path, container, depth)
                row['group'] = group['anchor']
                row['members'] = self.members_text(container['required'])
            rows.append(row)
        return rows

    def container_type(self, node: dict, container: dict) -> str:
        """Readable type text for an object- or array-of-object-valued field."""
        if node.get('anyOf'):
            return type_label(node)
        if container['kind'] == 'array':
            return array_label(node if node.get('type') == 'array' else {'items': node}, self.defs)
        definition = container['definition']
        return f'object ({definition})' if definition else 'object'

    def build_group(self, path: str, container: dict, depth: int) -> dict:
        prefix = f'{path}[]' if container['kind'] == 'array' else path
        title = path + (f' \u2014 {container["definition"]}' if container['definition'] else '')
        rule = None
        if container.get('anyOf'):
            alternatives = [b['required'][0] for b in container['anyOf']
                            if isinstance(b, dict) and b.get('required')]
            if alternatives:
                rule = ('One member must be supplied: '
                        + ', '.join(f'`{name}`' for name in alternatives) + '.')
        group = self.new_group(
            field=path,
            title=title,
            description=container['description'],
            kind=container['kind'],
            definition=container['definition'],
            closed=container['closed'],
            rule=rule,
            inherited=self.shared['objects'].get(container['definition'] or ''),
        )
        group['rows'] = self.walk(container['properties'], f'{prefix}.', container['required'], depth + 1)
        return group

    def add_extension_row(self) -> None:
        """One row for the R15 extension keys declared in ``patternProperties``."""
        patterns = list(self.schema.get('patternProperties', {}))
        if not patterns:
            return
        note = self.notes.get('fields', {}).get(EXTENSION_PATH, {})
        declared = self.schema['patternProperties'][patterns[0]]
        root = self.groups[0]
        row = {
            'path': EXTENSION_PATH,
            'id': f'{self.type_name.lower()}-field-x-name',
            'name': EXTENSION_PATH,
            'required': 'Optional',
            'type': 'any JSON value',
            'cardinality': 'single value or array, at any depth',
            'constraints': [f'pattern: {pattern}' for pattern in patterns],
            'description': note.get('description') or declared.get('description', ''),
            'units': note.get('units'),
            'notes': list(note.get('notes', [])),
            'example': {'value': note['example'], 'source': None, 'label': 'illustrative value'}
            if note.get('example') is not None else None,
            'exampleNote': note.get('exampleOmitted'),
            'group': None,
            'members': None,
            'inherited': note.get('inherited'),
            'container': False,
        }
        if not row['description']:
            self.errors.append(f'{self.type_name}: extension fields have no description')
        if row['example'] is None and row['exampleNote'] is None:
            self.errors.append(f'{self.type_name}: extension fields have no example or omission note')
        root['rows'].append(row)

    def apply_group_notes(self) -> None:
        for field, extra in self.notes.get('groups', {}).items():
            group = next((g for g in self.groups if g['field'] == field), None)
            if group is None:
                self.errors.append(f'{self.type_name}: notes name group "{field}", which the schema has no object field for')
                continue
            group['title'] = extra.get('title', group['title'])
            group['description'] = extra.get('description', group['description'])
            group['notes'] = list(extra.get('notes', []))

    def check_rule_notes(self, rules: list) -> None:
        curated = self.notes.get('rules', {})
        detected = {rule['id'] for rule in rules}
        for rule_id in sorted(detected - set(curated)):
            self.errors.append(f'{self.type_name}: the schema carries rule "{rule_id}" with no curated note in rules')
        for rule_id in sorted(set(curated) - detected):
            self.errors.append(f'{self.type_name}: notes rule "{rule_id}" is no longer present in the schema bytes')
        for rule in rules:
            entry = curated.get(rule['id'], {})
            rule['title'] = entry.get('title', rule['id'])
            rule['text'] = entry.get('text', '')
            if not rule['text']:
                self.errors.append(f'{self.type_name}: rule "{rule["id"]}" has no explanation text')

    def check_note_paths(self) -> None:
        known = {row['path'] for group in self.groups for row in group['rows']}
        known.add(EXTENSION_PATH)
        for path in self.notes.get('fields', {}):
            if path not in known:
                self.errors.append(f'{self.type_name}: notes field "{path}" is not a field of the pinned schema '
                                   f'(renamed or removed upstream?)')


def detect_rules(schema: dict) -> list:
    """Structural rules that no single field row can express."""
    defs = definitions(schema)
    rules = []
    branches = schema.get('anyOf', [])
    if branches:
        alternatives = []
        for option in branches:
            for name in option.get('required', []):
                contains = option.get('properties', {}).get(name, {}).get('contains', {})
                target = contains.get('$ref')
                alternatives.append(f'{name} holding an item that matches '
                                    f'`{target.rsplit("/", 1)[-1]}`' if target else name)
        if alternatives:
            rules.append({'id': 'at-least-one-genome-link', 'alternatives': alternatives})
    for clause in schema.get('allOf', []):
        clause = deref(clause, defs)
        const = clause.get('if', {}).get('properties', {}).get('schemaVersion', {}).get('const')
        if const is not None and 'propertyNames' in clause.get('then', {}):
            rules.append({'id': 'extension-fields-need-the-new-minor', 'states': const})
        inner = clause.get('not', {})
        if isinstance(inner, dict) and 'properties' in inner:
            rules.append({'id': 'at-most-one-annotates-parent'})
        items = clause.get('properties', {}).get('derivedFrom', {}).get('items')
        if isinstance(items, dict) and items.get('if'):
            const = items['if'].get('properties', {}).get('relationship', {}).get('const')
            target = items.get('then', {}).get('properties', {}).get('headerType', {}).get('const')
            rules.append({'id': 'annotates-parent-must-be-FHR', 'relationship': const, 'parent': target})
    if schema.get('propertyNames'):
        rules.append({'id': 'no-line-feed-in-a-key'})
    if schema.get('additionalProperties') is False:
        rules.append({'id': 'closed-top-level'})
    if schema.get('patternProperties'):
        rules.append({'id': 'extension-fields-allowed'})
    return rules


def unreferenced_definitions(schema: dict) -> list:
    """Definitions present in the file but never reachable from a field."""
    defs = definitions(schema)
    reachable = {node.rsplit('/', 1)[-1] for node in re.findall(r'"\$ref":\s*"([^"]+)"',
                                                                json.dumps(schema))}
    return sorted(name for name in defs
                  if name != schema.get('title') and name not in reachable)


# --------------------------------------------------------------------------
# Release history from the pinned registry
# --------------------------------------------------------------------------

def build_releases(meta: dict, schema: dict, provenance: dict) -> dict:
    """Release lines for one type, read from the pinned `schemas/versions.json`.

    The registry, not the website, says which shared release carries which
    `schemaVersion`; the pinned schema's own enum is cross-checked against it so a
    release line and a contract version cannot disagree with the shipped bytes.
    """
    registry_name = 'versions-v0.5.0.json'
    reference = provenance.get('references', {}).get(registry_name)
    if reference is None:
        raise SystemExit(f'{registry_name}: the version registry is not pinned in provenance.json')
    registry_bytes = verify_digest(SNAPSHOT_DIR / registry_name, reference['sha256'], registry_name, [])
    registry = json.loads(registry_bytes)
    errors = []
    alias = registry['w3id'].get(meta['type'])
    lines = []
    for release, mapping in registry['releases'].items():
        value = mapping.get(meta['type'])
        if value is None:
            continue
        lines.append({
            'release': release,
            'schemaVersion': str(value),
            'legacy': not isinstance(value, str),
            'date': provenance['releaseDates'].get(release),
            'alias': f'https://w3id.org/fair-bioheaders/{alias}/{release}' if alias else None,
            'current': release == meta['release'],
            'unchangedFrom': None,
        })
    lines.sort(key=lambda line: [int(part) for part in line['release'].lstrip('v').split('.')])
    for previous, line in zip(lines, lines[1:]):
        if line['schemaVersion'] == previous['schemaVersion'] and not line['legacy']:
            line['unchangedFrom'] = previous['release']
    for line in lines:
        if line['date'] is None:
            errors.append(f"provenance.json has no release date for {line['release']}")
    if meta['status'] == 'released':
        if registry['current'] != meta['release']:
            errors.append(f"the pinned release {meta['release']} is not the registry's current release "
                          f"{registry['current']}")
        accepted = [str(value) for value in schema['properties']['schemaVersion'].get('enum', [])]
        current = next((line for line in lines if line['current']), None)
        if current is None:
            errors.append(f"the registry has no {meta['type']} entry for the pinned release {meta['release']}")
        elif accepted and accepted[-1] != current['schemaVersion']:
            errors.append(f'the schema accepts {", ".join(accepted)} but the registry says '
                          f'{meta["release"]} publishes {current["schemaVersion"]}')
        for line in lines:
            if not line['legacy'] and accepted and line['schemaVersion'] not in accepted:
                errors.append(f"the registry assigns {line['release']} {line['schemaVersion']}, which the "
                              f"pinned schema does not accept ({', '.join(accepted)})")
    else:
        listed = {kind for mapping in registry['releases'].values() for kind in mapping}
        if meta['type'] in listed:
            errors.append(f"the registry now lists {meta['type']}: the draft page must be re-labelled")
    if errors:
        raise SystemExit('\n'.join(f'{meta["type"]}: {error}' for error in errors))
    return {
        'lines': lines,
        'urls': provenance['registry'],
        'alias': f'https://w3id.org/fair-bioheaders/{alias}' if alias else None,
    }


def build_type(page: str, provenance: dict, shared: dict) -> dict:
    path = snapshot_path(provenance, page)
    name = path.name
    meta = provenance['files'][name]
    digest_errors: list = []
    raw = verify_digest(path, meta['sha256'], name, digest_errors)
    if digest_errors:
        raise SystemExit('\n'.join(digest_errors))
    schema = json.loads(raw)
    notes_path = NOTE_DIR / f'{page}.json'
    notes = read_json(notes_path) if notes_path.is_file() else {'fields': {}, 'rules': {}, 'groups': {}}
    contract = notes.get('contract')
    if not contract:
        raise SystemExit(f'{name}: notes/{page}.json has no "contract" block for the status section')
    missing = [key for key in ('summary', 'scope', 'serializations', 'tooling', 'caveats')
               if not contract.get(key)]
    if missing:
        raise SystemExit(f'{name}: notes/{page}.json contract block is missing {", ".join(missing)}')

    builder = Builder(meta['type'], schema, notes, shared)
    builder.new_group(field='', title='Top-level fields',
                      description=notes.get('groups', {}).get('', {}).get('description', ''))
    builder.groups[0]['rows'] = builder.walk(schema['properties'], '', schema.get('required', []), 1)
    builder.add_extension_row()
    builder.apply_group_notes()
    builder.check_note_paths()
    rules = detect_rules(schema)
    builder.check_rule_notes(rules)
    releases = build_releases(meta, schema, provenance)
    accepted = [str(value) for value in schema['properties'].get('schemaVersion', {}).get('enum', [])]
    if accepted and meta['schemaVersion'] not in accepted:
        raise SystemExit(f'{name}: provenance.json calls this the {meta["schemaVersion"]} contract, but the '
                         f'pinned bytes accept {", ".join(accepted)}')

    if builder.errors:
        raise SystemExit(f'{name}: the documentation inventory is incomplete\n'
                         + '\n'.join(f'  - {error}' for error in builder.errors))

    version = schema['properties'].get('schemaVersion', {})
    stats = {
        'topLevel': len(schema['properties']) + (1 if schema.get('patternProperties') else 0),
        'nested': sum(len(group['rows']) for group in builder.groups[1:]),
        'objectTables': len(builder.groups) - 1,
        'documented': sum(len(group['rows']) for group in builder.groups),
        'withDescription': sum(1 for g in builder.groups for r in g['rows'] if r['description']),
        'withExample': sum(1 for g in builder.groups for r in g['rows'] if r['example']),
        'withExampleOmittedReason': sum(1 for g in builder.groups for r in g['rows']
                                        if r['example'] is None and r['exampleNote']),
        'withExampleLink': sum(1 for g in builder.groups for r in g['rows']
                               if r['example'] and r['example']['source']),
        'withNote': sum(1 for g in builder.groups for r in g['rows'] if r['notes']),
        'withUnits': sum(1 for g in builder.groups for r in g['rows'] if r['units']),
        'inheritedFields': sum(1 for g in builder.groups for r in g['rows'] if r['inherited']),
        'inheritedGroups': sum(1 for g in builder.groups if g['inherited']),
        'required': sum(1 for g in builder.groups for r in g['rows'] if r['required'] == 'Required'),
        'rules': len(rules),
    }
    return {
        'type': meta['type'],
        'page': page,
        'status': meta['status'],
        'contract': contract,
        'schemaTitle': schema.get('title', meta['type']),
        'schemaDescription': schema.get('description', ''),
        'schemaId': schema.get('$id', ''),
        'schemaVersions': [str(value) for value in version.get('enum', [])],
        'release': meta['release'],
        'releases': releases,
        'pinned': {
            'file': f'scripts/schema-snapshots/{name}',
            'sha256': sha256(raw),
            'repository': meta['repository'],
            'ref': meta['ref'],
            'commit': meta['commit'],
            'path': meta['path'],
            'url': meta['fetchUrl'],
            'rawUrl': meta['rawUrl'],
            'retrieved': meta['retrieved'],
            'schemaVersion': meta['schemaVersion'],
        },
        'groups': builder.groups,
        'rules': rules,
        'unreferenced': unreferenced_definitions(schema),
        'stats': stats,
    }


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------

COLUMNS = ('Field', 'Required', 'JSON type and cardinality', 'Constraints',
           'Description, units and notes', 'Example')
RELEASES_URL = 'https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/releases/tag/'
TAG_URL = 'https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/blob/'


def render_constraints(row: dict) -> str:
    if not row['constraints']:
        return '<span class="field-none">none stated</span>'
    return ('<ul class="field-constraints">'
            + ''.join(f'<li>{code(value)}</li>' for value in row['constraints']) + '</ul>')


def render_example(row: dict) -> str:
    example = row['example']
    if example is None:
        return f'<span class="field-none">{markup(row["exampleNote"])}</span>'
    value = f'<code>{html.escape(str(example["value"]), quote=False)}</code>'
    label = markup(example['label'])
    if example['source']:
        return f'{value}<span class="field-example-source">{label} <a href="{example["source"]}">source</a></span>'
    return f'{value}<span class="field-example-source">{label}</span>'


def render_type_cell(row: dict) -> str:
    parts = [code(row['type'])]
    if row['cardinality'] not in ('single value', 'object', row['type']):
        parts.append(f'<span class="field-cardinality">{markup(row["cardinality"])}</span>')
    if row['members']:
        parts.append('<span class="field-members">when present, requires '
                     + row['members'].replace('`', '') + '</span>')
    if row['group']:
        parts.append(f'<span class="field-jump"><a href="#{row["group"]}">members listed below</a></span>')
    return ''.join(parts)


def render_description_cell(row: dict) -> str:
    parts = [f'<p class="field-description">{markup(row["description"])}</p>']
    if row['inherited']:
        parts.append(f'<p class="field-origin">Inherited from the {markup(row["inherited"])}.</p>')
    if row['units']:
        parts.append(f'<p class="field-units">Units: {markup(row["units"])}</p>')
    for note in row['notes']:
        parts.append(f'<p class="field-note">{markup(note)}</p>')
    return ''.join(parts)


def render_row(row: dict) -> str:
    return (f'<tr id="{row["id"]}">'
            f'<th scope="row">{code(row["path"])}</th>'
            f'<td class="field-required">{markup(row["required"])}</td>'
            f'<td>{render_type_cell(row)}</td>'
            f'<td>{render_constraints(row)}</td>'
            f'<td>{render_description_cell(row)}</td>'
            f'<td>{render_example(row)}</td></tr>')


def render_table(data: dict, group: dict) -> str:
    page = data['page']
    label = (f'{data["type"]} top-level fields' if group['field'] == ''
             else f'{data["type"]}: {plain(group["title"])} fields')
    facts = []
    if group['inherited']:
        facts.append(f'These members come from the {markup(group["inherited"])}, so they read the same in '
                     'every header type that imports the object.')
    if group['closed']:
        facts.append('The object is closed: an unknown key inside it is invalid, and so is an `x-` '
                     'extension key at this level (rule R15).')
    if group['rule']:
        facts.append(group['rule'])
    facts.extend(group.get('notes', []))
    facts_html = ('<ul class="group-facts">'
                  + ''.join(f'<li>{markup(fact)}</li>' for fact in facts) + '</ul>') if facts else ''
    lead = f'<p class="group-lead">{markup(group["description"])}</p>' if group['description'] else ''
    head = ''.join(f'<th scope="col">{name}</th>' for name in COLUMNS)
    rows = '\n'.join(render_row(row) for row in group['rows'])
    return (f'<h3 id="{group["anchor"]}">{code(group["title"]) if group["field"] else markup(group["title"])}</h3>\n'
            f'{lead}{facts_html}\n'
            f'<div class="field-table" role="region" tabindex="0" '
            f'aria-label="{html.escape(label, quote=True)}">\n<table>\n'
            f'<caption class="visually-hidden">{html.escape(label, quote=False)}: '
            f'{len(group["rows"])} fields, generated from the published schema.</caption>\n'
            f'<thead><tr>{head}</tr></thead>\n<tbody>\n{rows}\n</tbody>\n</table>\n</div>')


def plain(text: str) -> str:
    return re.sub(r'[`*]', '', str(text))


def render_status(data: dict) -> str:
    contract = data['contract']
    current = data['releases']['lines'][-1] if data['releases']['lines'] else None
    if current:
        published = (f'Released contract. `schemaVersion` **"{current["schemaVersion"]}"** shipped in '
                     f'shared specification [{current["release"]}]({RELEASES_URL}{current["release"]}) '
                     f'on {current["date"]}.')
    else:
        published = ('**Draft — not released.** This is the development contract only: no shared release, '
                     'no release tag, no fixed alias and no DOI exists for it, and no released tool validates it.')
    versions = ', '.join(f'`{value}`' for value in data['schemaVersions']) or 'none published'
    rows = [
        ('Status', published),
        ('Versions this schema accepts', f'{versions}. A schema of version M.N also accepts records that state '
                                        'any earlier minor of the same major, and holds each of them to that '
                                        'minor: what a later minor allows is invalid in an earlier one.'),
        ('What it describes', contract['summary']),
        ('What it does not cover', contract['scope']),
    ]
    body = '\n'.join(f'<tr><th scope="row">{markup(label)}</th><td>{markup(value)}</td></tr>'
                     for label, value in rows)
    serializations = ''.join(f'<li>{markup(item)}</li>' for item in contract['serializations'])
    tooling = ''.join(f'<li>{markup(item)}</li>' for item in contract['tooling'])
    return (f'<table class="status-table">\n<caption class="visually-hidden">{data["type"]} contract status'
            f'</caption>\n<tbody>\n{body}\n</tbody>\n</table>\n'
            f'<h3 id="{data["page"]}-serializations">Serializations with verified support</h3>\n'
            f'<ul>{serializations}</ul>\n'
            f'<h3 id="{data["page"]}-tooling">Tools that implement this contract</h3>\n'
            f'<ul>{tooling}</ul>')


def render_location(data: dict) -> str:
    pinned = data['pinned']
    repository = pinned['repository']
    project = repository.rsplit('/', 1)[-1]
    project_url = f'https://github.com/{repository}'
    tag_url = f'{TAG_URL}{pinned["ref"]}/{pinned["path"]}'
    blob_url = f'{TAG_URL}{pinned["commit"]}/{pinned["path"]}'
    if data['status'] == 'released':
        links = [
            f'<li><strong>Fixed schema URL of the current release</strong>: '
            f'<a href="{pinned["url"]}">{pinned["url"]}</a>. Cite the release a record targets: never '
            'hard-code a "latest" schema, and never check an unknown version against a different one.</li>',
            f'<li>The same bytes at the release tag: <a href="{tag_url}">{tag_url}</a>, also fixed at '
            f'commit <a href="{blob_url}">{pinned["commit"][:10]}</a>.</li>',
            f'<li>Development URL on <code>main</code>, the current contract, which moves: '
            f'<a href="{data["schemaId"]}">{data["schemaId"]}</a>.</li>',
        ]
    else:
        links = [
            f'<li><strong>Development schema only</strong>, and it moves with <code>main</code>: '
            f'<a href="{pinned["url"]}">{pinned["url"]}</a>. Read it as a review input, not a citable '
            'release.</li>',
            '<li>No w3id alias, release-tag URL or DOI exists for this type, so none is offered. Release '
            f'work is tracked in [{project}#10]({project_url}/issues/10) and shared publication in '
            '[FAIR-bioHeaders-Specification#107](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders'
            '-Specification/issues/107).</li>',
            f'<li>Model source: [{project}]({project_url}) on <code>main</code>, pinned here at commit '
            f'<code>{pinned["commit"][:10]}</code>. The JSON Schema is generated from the LinkML model and '
            'is never hand-edited.</li>',
        ]
    links.append('<li>Schema-version registry: '
                 f'<a href="{data["releases"]["urls"]["versions"]}"><code>schemas/versions.json</code></a> and '
                 f'<a href="{data["releases"]["urls"]["guide"]}"><code>docs/SCHEMA-VERSIONS.md</code></a>.</li>')
    return '<ul class="schema-links">\n' + '\n'.join(links) + '\n</ul>\n' + render_history(data)


def render_history(data: dict) -> str:
    lines = data['releases']['lines']
    if not lines:
        return (f'<h3 id="{data["page"]}-release-history">Release history</h3>\n'
                '<p>The shared version registry has no entry for this type: nothing has been released, so '
                'there is no <code>schemaVersion</code> history to cite.</p>')
    head = ''.join(f'<th scope="col">{name}</th>'
                   for name in ('Shared release', 'schemaVersion', 'Published', 'Fixed schema URL'))
    rows = []
    for line in lines:
        release = f'<a href="{RELEASES_URL}{line["release"]}">{line["release"]}</a>'
        version = f'<code>{line["schemaVersion"]}</code>' + (' (the number, not a string)' if line['legacy'] else '')
        unchanged = (f'<span class="field-none">unchanged from {line["unchangedFrom"]}</span>'
                     if line['unchangedFrom'] else '')
        alias = (f'<a href="{line["alias"]}">{line["alias"].split("fair-bioheaders/", 1)[1]}</a>'
                 if line['alias'] and not line['legacy']
                 else '<span class="field-none">none published</span>')
        rows.append(f'<tr><th scope="row">{release}</th><td>{version}</td>'
                    f'<td>{line["date"]}{unchanged}</td><td>{alias}</td></tr>')
    label = f'{data["type"]} schema versions by shared release'
    return (f'<h3 id="{data["page"]}-release-history">Release history</h3>\n'
            f'<div class="field-table" role="region" tabindex="0" aria-label="{html.escape(label)}">\n<table>\n'
            f'<caption class="visually-hidden">{html.escape(label)}, read from '
            f'<code>schemas/versions.json</code>.</caption>\n'
            f'<thead><tr>{head}</tr></thead>\n<tbody>\n' + '\n'.join(rows) + '\n</tbody>\n</table>\n</div>')


def render_rules(data: dict) -> str:
    """The structural rules of the contract, and the requirements its keywords cannot express."""
    head = ''.join(f'<th scope="col">{name}</th>' for name in ('Rule', 'What the contract requires'))
    rows = '\n'.join(
        f'<tr><th scope="row">{markup(rule["title"])}</th><td>{markup(rule["text"])}</td></tr>'
        for rule in data['rules'])
    label = f'{data["type"]} conditional and object-level rules'
    rules_html = (f'<div class="field-table" role="region" tabindex="0" aria-label="{html.escape(label)}">\n'
                  f'<table>\n<caption class="visually-hidden">{html.escape(label)}, read from the schema bytes.'
                  f'</caption>\n<thead><tr>{head}</tr></thead>\n<tbody>\n{rows}\n</tbody>\n</table>\n</div>')
    caveats = ''.join(f'<li>{markup(item)}</li>' for item in data['contract']['caveats'])
    return (rules_html + '\n'
            f'<h3 id="{data["page"]}-unexpressed">What the schema cannot say</h3>\n'
            f'<p>The contract is more than its JSON Schema. These requirements are normative for a '
            f'conforming record, and a validator that cannot check them must say so:</p>\n'
            f'<ul class="contract-caveats">{caveats}</ul>')


def render_contents(data: dict) -> str:
    if len(data['groups']) < 3:
        return ''
    items = ''.join(f'<li><a href="#{group["anchor"]}">{code(plain(group["title"]))}</a></li>'
                    for group in data['groups'][1:])
    return (f'<nav class="group-contents" aria-label="{data["type"]} nested objects">'
            f'<h3 id="{data["page"]}-objects">Nested and reused objects</h3><ul>{items}</ul></nav>')


def render_provenance(data: dict) -> str:
    pinned = data['pinned']
    stats = data['stats']
    extra = ('' if not data['unreferenced'] else
             ' The published file also defines '
             + ', '.join(f'<code>{name}</code>' for name in data['unreferenced'])
             + ', which no field of the record reaches.')
    if data['status'] == 'released':
        identity = 'byte-identical to the copy pinned at'
        moving = ''
    else:
        identity = 'pinned for this rendering at'
        moving = (' Because this development URL moves, the table documents exactly that commit: refresh the '
                  'pin and regenerate before citing it.')
    return (f'<p class="reference-provenance" data-schema-type="{data["type"]}" '
            f'data-schema-sha256="{pinned["sha256"]}">Generated from '
            f'<a href="{pinned["url"]}"><code>{pinned["path"]}</code></a> of '
            f'{pinned["repository"]} at <code>{pinned["ref"]}</code> (commit '
            f'<code>{pinned["commit"][:10]}</code>), {identity} '
            f'<code>{pinned["file"]}</code> — SHA-256 <code>{pinned["sha256"]}</code>. It documents '
            f'{stats["documented"]} fields: {stats["topLevel"]} at the top level and {stats["nested"]} inside '
            f'{stats["objectTables"]} nested or reused objects.{extra}{moving} '
            'Regenerate and compare with <code>python3 scripts/schema_fields.py --check</code>, which the site '
            'checks run on every pull request. The specification repository stays the authority: this page is '
            'a rendering of it, not a second definition.</p>')


def render_reference(data: dict) -> str:
    page = data['page']
    parts = [
        f'<h2 id="{page}-contract-status">Contract status</h2>',
        render_status(data),
        f'<h2 id="{page}-schema-location">Schema location</h2>',
        render_location(data),
        f'<h2 id="{page}-field-reference">Field reference</h2>',
        f'<p id="{page}-how-to-read" class="how-to-read">Every field of the contract appears here, including '
        'the fields and objects inherited from the shared core: nothing is left out because another type also '
        'uses it. <em>Required</em> means the key must be present; <em>when present, requires</em> lists the '
        'members that become mandatory once you supply an optional object. Constraints are reproduced verbatim '
        'from the schema, so a pattern you see here is the pattern the validator matches. Examples are the '
        'values stated by the released example records, which are synthetic, or an illustrative value where no '
        'example reaches the field.</p>',
        render_table(data, data['groups'][0]),
        render_contents(data),
        '\n'.join(render_table(data, group) for group in data['groups'][1:]),
        f'<h2 id="{page}-conditional-rules">Rules beyond a single field</h2>',
        render_rules(data),
        render_provenance(data),
    ]
    return '\n'.join(part for part in parts if part) + '\n'


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------

OUTPUT_DIR = ROOT / '_includes' / 'schema'


def build_all() -> dict:
    provenance = load_provenance()
    shared = load_shared(provenance)
    return {page: build_type(page, provenance, shared) for page in PAGES}


def render_inventory(data: dict) -> str:
    text = render_reference(data)
    for delimiter in ('{{', '{%'):
        if delimiter in text:
            raise SystemExit(f'{data["page"]}: the generated reference contains "{delimiter}", which Liquid '
                             'would execute instead of displaying')
    banner = (f'<!-- Generated by scripts/schema_fields.py from {data["pinned"]["file"]} '
              f'(SHA-256 {data["pinned"]["sha256"]}). Do not edit by hand: run '
              f'`python3 scripts/schema_fields.py` after refreshing the pinned schema, and commit the '
              f'generated file with it. -->\n')
    return banner + text


def command_write() -> int:
    built = build_all()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for page, data in built.items():
        target = OUTPUT_DIR / f'{page}-reference.html'
        text = render_inventory(data)
        if not target.is_file() or target.read_text(encoding='utf-8') != text:
            target.write_text(text, encoding='utf-8')
            print(f'wrote {target.relative_to(ROOT)}')
    print_report(built)
    return 0


def command_check() -> int:
    built = build_all()
    problems = []
    for page, data in built.items():
        target = OUTPUT_DIR / f'{page}-reference.html'
        expected = render_inventory(data)
        if not target.is_file():
            problems.append(f'{target.relative_to(ROOT)}: missing; run python3 scripts/schema_fields.py')
            continue
        committed = target.read_text(encoding='utf-8')
        if committed != expected:
            problems.append(f'{target.relative_to(ROOT)}: no longer matches the pinned schema bytes'
                            + describe_difference(committed, expected))
    if problems:
        print('\n'.join(problems), file=sys.stderr)
        print('Regenerate with: python3 scripts/schema_fields.py', file=sys.stderr)
        return 1
    print_report(built)
    print(f'Checked {len(built)} field references against the pinned schema bytes '
          f'({sum(data["stats"]["documented"] for data in built.values())} fields).')
    return 0


def describe_difference(committed: str, expected: str) -> str:
    old = re.findall(r'<tr id="([^"]+)"', committed)
    new = re.findall(r'<tr id="([^"]+)"', expected)
    parts = [f' removed {path}' for path in sorted(set(old) - set(new))]
    parts += [f' added {path}' for path in sorted(set(new) - set(old))]
    if not parts:
        parts.append(' changed requiredness, types, constraints, descriptions or examples')
    return ':' + ';'.join(parts)


def print_report(built: dict) -> None:
    print('Field coverage of the pinned schemas (every documented row is generated from the schema bytes):')
    print(f'{"page":6} {"status":9} {"top-level":>9} {"nested":>7} {"tables":>6} {"documented":>10} '
          f'{"required":>8} {"described":>9} {"examples":>8} {"from examples":>13} {"units":>6} '
          f'{"annotated":>9} {"shared":>7} {"rules":>6}')
    for page, data in built.items():
        stats = data['stats']
        print(f'{page:6} {data["status"]:9} {stats["topLevel"]:>9} {stats["nested"]:>7} '
              f'{stats["objectTables"]:>6} {stats["documented"]:>10} {stats["required"]:>8} '
              f'{stats["withDescription"]:>9} {stats["withExample"]:>8} {stats["withExampleLink"]:>13} '
              f'{stats["withUnits"]:>6} {stats["withNote"]:>9} {stats["inheritedFields"]:>7} '
              f'{stats["rules"]:>6}')
        if data['unreferenced']:
            print(f'{"":6} defined by the schema but reached by no field: '
                  + ', '.join(data['unreferenced']))
        gap = stats['documented'] - stats['withDescription']
        if gap:
            print(f'{"":6} INCOMPLETE: {gap} fields lack a description')


def command_fetch() -> int:
    """Re-download every pinned file and compare it with the recorded digest.

    This is the authority link: CI stays offline against the pinned bytes, and a
    maintainer runs this to learn that the released schemas, the shared models, the
    version registry or the example records moved.
    """
    provenance = load_provenance()
    changed = 0
    today = str(datetime.date.today())
    for section in ('files', 'references', 'examples'):
        for name, meta in provenance[section].items():
            url = meta['fetchUrl']
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read()
            target = SNAPSHOT_DIR / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.is_file() or target.read_bytes() != data:
                target.write_bytes(data)
                print(f'refreshed {name} from {url}')
                changed += 1
            if meta['sha256'] != sha256(data):
                print(f'new digest for {name}: {meta["sha256"]} -> {sha256(data)}')
                meta['sha256'] = sha256(data)
                meta['retrieved'] = today
                changed += 1
    if changed:
        PROVENANCE_PATH.write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + '\n',
                                   encoding='utf-8')
        print('Update the ref/commit fields in provenance.json, then run '
              'python3 scripts/schema_fields.py and commit the schemas with the references.')
    else:
        print('Every pinned file already matches its authoritative URL.')
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='Generate the /specifications/ field references.')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--check', action='store_true', help='fail if a committed reference drifted')
    group.add_argument('--report', action='store_true', help='print coverage statistics only')
    group.add_argument('--fetch', action='store_true', help='refresh the pinned bytes (maintainer step)')
    args = parser.parse_args(argv)
    if args.fetch:
        return command_fetch()
    if args.check:
        return command_check()
    if args.report:
        print_report(build_all())
        return 0
    return command_write()


if __name__ == '__main__':
    sys.exit(main())
