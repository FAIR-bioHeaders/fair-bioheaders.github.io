#!/usr/bin/env python3
"""Generate the `/mappings/` crosswalk from byte-pinned upstream artifacts.

FAIR-bioHeaders-Specification owns the mapping semantics; this website renders
them. So the page cannot become a second hand-maintained authority, every table
here is produced from pinned copies under `scripts/mapping-snapshots/`:

    scripts/mapping-snapshots/provenance.json   digests, refs, commits and URLs
    scripts/mapping-snapshots/<file>            the pinned inventory bytes
    _includes/mappings/v1-crosswalk.html        the generated fragment

Commands, from the repository root:

    python3 scripts/mapping_crosswalk.py             # regenerate the fragment
    python3 scripts/mapping_crosswalk.py --check     # CI drift check (no writes)
    python3 scripts/mapping_crosswalk.py --fetch     # refresh the pins (maintainer step)

`--check` is strict on purpose. It fails when a pinned file no longer matches its
recorded digest, when an entry appears, disappears or changes disposition against
the committed fragment, when the delivery matrix gains a row this generator does
not know, or when the generated wording starts claiming something the upstream
status does not support: an official label, deposit readiness or a browser converter.

Standard library only, like `scripts/check_site.py` and `scripts/schema_fields.py`.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import html
import json
import re
import sys
from pinned_fetch import fetch_bytes, snapshot_target
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT_DIR = ROOT / 'scripts' / 'mapping-snapshots'
PROVENANCE_PATH = SNAPSHOT_DIR / 'provenance.json'
OUTPUT_DIR = ROOT / '_includes' / 'mappings'
FRAGMENT = OUTPUT_DIR / 'v1-crosswalk.html'

INVENTORY = 'assembly-dcmi.yml'
MATRIX = 'profile-status.yml'

# The upstream disposition vocabulary, rendered in reader's words. `unsupported`
# becomes "not projected": the inventory rules on the v1 descriptive surface and
# never claims a field is unmappable (adoption packet, row 3).
DISPOSITION = {'conditional': 'Conditional', 'unsupported': 'Not projected by mapping v1'}
TARGET_STATUS = {'draft-fixture': 'Draft fixture: an inventory and one curated graph exist',
                 'planned': 'Planned: no v1 surface exists'}
TYPE_STATUS = {'draft-fixture': 'Covered by the v1 assembly inventory',
               'not-yet-profiled': 'Not profiled',
               'blocked': 'Blocked on its contract'}

# Unrecorded label/deposit/browser-converter claims remain forbidden even though
# the narrow documented runtime exporter now ships.
FORBIDDEN = ('official guidance', 'official mapping', 'unmappable', 'this page exports',
             'deposit-ready output', 'we export')


# ------------------------------------------------------------------ pinned bytes

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_provenance() -> dict:
    return json.loads(PROVENANCE_PATH.read_text(encoding='utf-8'))


def pinned(name: str, provenance: dict, errors: list) -> str:
    meta = provenance['files'].get(name)
    path = SNAPSHOT_DIR / name
    if meta is None:
        errors.append(f'{name}: not recorded in provenance.json')
        return ''
    if not path.is_file():
        errors.append(f'{name}: pinned copy is missing')
        return ''
    digest = sha256_bytes(path.read_bytes())
    if digest != meta['sha256']:
        errors.append(f'{name}: pinned bytes no longer match provenance.json '
                      f'({meta["sha256"]} recorded, {digest} on disk); refresh with --fetch and re-verify upstream')
        return ''
    return path.read_text(encoding='utf-8')


# ------------------------------------------------------- minimal YAML subset reader

# Keys in these files include hyphenated names (`dcmi-qualified`) and, in the
# inventory, the entry paths are values rather than keys.
KEY = re.compile(r'^([A-Za-z_][A-Za-z0-9_.-]*):(?:\s+(.*))?$')
QUOTE = re.compile(r"^'(.*)'$")


def read_yaml(text: str, source: str) -> dict:
    """Parse the restricted block shape the two pinned files use.

    Handles block mappings, block sequences (of mappings or of scalars), plain and
    single-quoted scalars, and folded continuation lines. Anything else raises:
    these pins have a fixed generated shape, and a silent mis-read would put wrong
    semantics on a public page.
    """
    lines = []
    for number, raw in enumerate(text.splitlines(), start=1):
        if not raw.strip() or raw.lstrip().startswith('#'):
            continue
        lines.append([number, len(raw) - len(raw.lstrip(' ')), raw.strip()])
    if not lines:
        raise ValueError(f'{source}: no content')
    index = 0

    def scalar(token: str):
        if token == '[]':          # an explicitly empty flow sequence
            return []
        quoted = QUOTE.match(token)
        return quoted.group(1) if quoted else token

    def folded(value: str, indent: int) -> str:
        """Join a scalar's continuation lines: deeper, not a key, not a list item."""
        nonlocal index
        while index < len(lines) and lines[index][1] > indent \
                and not KEY.match(lines[index][2]) and not lines[index][2].startswith('- '):
            value = f'{value} {lines[index][2]}'
            index += 1
        return value

    def parse_mapping(indent: int) -> dict:
        nonlocal index
        result = {}
        while index < len(lines):
            number, line_indent, content = lines[index]
            if line_indent != indent or content.startswith('- '):
                break
            match = KEY.match(content)
            if not match:
                raise ValueError(f'{source}:{number}: expected "key: value", got "{content}"')
            key, rest = match.group(1), (match.group(2) or '').strip()
            index += 1
            if rest:
                result[key] = folded(scalar(rest), indent)
                continue
            if index >= len(lines):
                raise ValueError(f'{source}:{number}: "{key}" has no value')
            child_indent, child_content = lines[index][1], lines[index][2]
            if child_content.startswith('- ') and child_indent >= indent:
                result[key] = parse_sequence(child_indent)
            elif child_indent > indent:
                result[key] = parse_mapping(child_indent)
            else:
                raise ValueError(f'{source}:{number}: "{key}" has no value')
        return result

    def parse_sequence(indent: int) -> list:
        nonlocal index
        items = []
        while index < len(lines) and lines[index][1] == indent and lines[index][2].startswith('- '):
            number, dash_indent, content = lines[index]
            rest = content[2:].strip()
            if rest.startswith('- '):
                raise ValueError(f'{source}:{number}: compact nested sequences are outside the supported subset')
            column = dash_indent + 2
            if not rest:
                index += 1
                if index >= len(lines) or lines[index][1] < column:
                    raise ValueError(f'{source}:{number}: empty sequence item')
                items.append(parse_sequence(lines[index][1]) if lines[index][2].startswith('- ')
                             else parse_mapping(lines[index][1]))
                continue
            if KEY.match(rest):
                # A mapping item whose first key sits on the dash line.
                lines[index] = [number, column, rest]
                items.append(parse_mapping(column))
            else:
                items.append(scalar(rest))
                index += 1
        return items

    value = parse_sequence(lines[0][1]) if lines[0][2].startswith('- ') else parse_mapping(lines[0][1])
    if index != len(lines):
        raise ValueError(f'{source}: stopped at line {lines[index][0]} ({lines[index][2]!r}); the file shape '
                         'changed from the subset this generator reads')
    return value


# ---------------------------------------------------------------------- validation

def validate(inventory: dict, matrix: dict, errors: list) -> None:
    for field in ('profile_version', 'status', 'source_schema', 'source_schema_version', 'resource_scope'):
        if not inventory.get(field):
            errors.append(f'{INVENTORY}: {field} is missing')
    if inventory.get('source_schema') != 'https://w3id.org/fair-bioheaders/fhr/v0.4.0':
        errors.append(f'{INVENTORY}: the v1 surface is documented as FHR v0.4.0; the inventory no longer says so, '
                      'so this page must be re-scoped rather than re-rendered')
    entries = inventory.get('entries') or []
    context = inventory.get('context_entries') or []
    if len(entries) != 24:
        errors.append(f'{INVENTORY}: {len(entries)} root entries; the v1 surface covers the 24 FHR v0.4.0 root fields')
    if len(context) != 4:
        errors.append(f'{INVENTORY}: {len(context)} context entries, expected 4')
    kinds = [entry.get('kind') for entry in entries]
    if set(kinds) - set(DISPOSITION):
        errors.append(f'{INVENTORY}: disposition(s) {sorted(set(kinds) - set(DISPOSITION))} are unknown here')
    paths = [entry.get('path') for entry in entries]
    if len(set(paths)) != len(paths):
        errors.append(f'{INVENTORY}: duplicate entry paths')
    namespace = (inventory.get('target') or {}).get('namespace')
    if not namespace:
        errors.append(f'{INVENTORY}: target namespace is missing')
    for entry in entries:
        gaps = [key for key in ('path', 'subject', 'kind', 'condition', 'transformation', 'loss_or_limitation')
                if not entry.get(key)]
        if gaps:
            errors.append(f'{INVENTORY}: {entry.get("path", "?")} lacks {", ".join(gaps)}')
        if entry.get('subject') not in ('resource', 'metadata-record'):
            errors.append(f'{INVENTORY}: {entry.get("path")} has subject {entry.get("subject")!r}')
        terms = entry.get('terms') or []
        if entry.get('kind') == 'conditional' and not terms:
            errors.append(f'{INVENTORY}: {entry.get("path")} is conditional but names no target term')
        if entry.get('kind') == 'unsupported' and terms:
            errors.append(f'{INVENTORY}: {entry.get("path")} is not projected but names target terms')
        for term in terms:
            if namespace and not term.startswith(namespace):
                errors.append(f'{INVENTORY}: {entry.get("path")} targets {term}, outside the pinned namespace')
    targets = matrix.get('targets') or {}
    if len(targets) != 6:
        errors.append(f'{MATRIX}: {len(targets)} targets; the v1 matrix names six')
    for name, row in targets.items():
        if row.get('status') not in TARGET_STATUS:
            errors.append(f'{MATRIX}: target {name} has status {row.get("status")!r}, unknown here')
        for key in ('candidate_version', 'reference', 'remaining'):
            if not row.get(key):
                errors.append(f'{MATRIX}: target {name} lacks {key}')
    types = matrix.get('header_types') or {}
    if len(types) != 4:
        errors.append(f'{MATRIX}: {len(types)} header types, expected FHR, FHP, FHGFF3 and FHT')
    for name, row in types.items():
        if row.get('status') not in TYPE_STATUS:
            errors.append(f'{MATRIX}: header type {name} has status {row.get("status")!r}, unknown here')


def totals(inventory: dict) -> dict:
    kinds = [entry.get('kind') for entry in inventory.get('entries') or []]
    return {'conditional': kinds.count('conditional'), 'unsupported': kinds.count('unsupported'),
            'context': len(inventory.get('context_entries') or []), 'root': len(kinds)}


# ------------------------------------------------------------------------- render

def cell(value) -> str:
    return html.escape('' if value is None else str(value))


def code(value) -> str:
    return f'<code>{cell(value)}</code>'


def attr(value) -> str:
    """A value for a double-quoted HTML attribute (href, data-*)."""
    return html.escape('' if value is None else str(value), quote=True)


def terms_cell(terms) -> str:
    values = [] if not terms else ([terms] if isinstance(terms, str) else list(terms))
    if not values:
        return '<span class="field-none">none in v1</span>'
    return '<ul class="field-constraints">' + ''.join(f'<li>{code(term)}</li>' for term in values) + '</ul>'


def table(label: str, headers: list, rows: list, note: str) -> str:
    head = ''.join(f'<th scope="col">{cell(name)}</th>' for name in headers)
    return (f'<div class="field-table" role="region" tabindex="0" aria-label="{html.escape(label, quote=True)}">\n'
            f'<table>\n<caption class="visually-hidden">{cell(label)}: {len(rows)} rows, {note}.</caption>\n'
            f'<thead><tr>{head}</tr></thead>\n<tbody>\n' + '\n'.join(rows) + '\n</tbody>\n</table>\n</div>')


def render_root_table(inventory: dict) -> str:
    rows = [
        '<tr><th scope="row">' + code(str(entry['path'])[1:]) + '</th>'
        f'<td>{cell(DISPOSITION[entry["kind"]])}</td><td>{cell(entry["subject"])}</td>'
        f'<td>{cell(entry.get("source_cardinality"))}</td><td>{terms_cell(entry.get("terms"))}</td>'
        f'<td>{cell(entry.get("condition"))}</td><td>{cell(entry.get("transformation"))}</td>'
        f'<td>{cell(entry.get("loss_or_limitation"))}</td></tr>'
        for entry in inventory.get('entries') or []
    ]
    return table('FHR root fields in mapping v1',
                 ['FHR root field', 'Disposition in mapping v1', 'Subject', 'Source cardinality',
                  'Qualified DC term', 'Condition', 'Transformation', 'Loss or limitation'],
                 rows, 'generated from the pinned inventory instead of retyped here')


def render_context_table(inventory: dict) -> str:
    rows = [
        '<tr><th scope="row">' + code(str(entry['path'])[1:]) + '</th>'
        f'<td>{cell(entry.get("subject"))}</td><td>{terms_cell(entry.get("term"))}</td>'
        f'<td>{cell(entry.get("condition"))}</td></tr>'
        for entry in inventory.get('context_entries') or []
    ]
    return table('Supplemental export-context keys in mapping v1',
                 ['Export-context key', 'Subject', 'Qualified DC term', 'Condition'],
                 rows, 'generated from the pinned inventory')


def render_target_table(matrix: dict) -> str:
    rows = [
        f'<tr><th scope="row">{cell(name)}</th><td>{cell(TARGET_STATUS[row["status"]])}</td>'
        f'<td>{cell(row.get("candidate_version"))}</td><td>{cell(row.get("remaining"))}</td></tr>'
        for name, row in (matrix.get('targets') or {}).items()
    ]
    return table('Mapping targets in the v1 delivery matrix',
                 ['Intended use', 'Status in the delivery matrix', 'Candidate version', 'What remains upstream'],
                 rows, 'generated from the pinned delivery matrix')


def render_type_table(matrix: dict) -> str:
    rows = []
    for name, row in (matrix.get('header_types') or {}).items():
        release = f'{row.get("released_schema_version")} (shared {row.get("release")})' \
            if row.get('release') else f'{row.get("released_schema_version")} — no shared release'
        remaining = row.get('remaining') or ('; '.join(row.get('blocking_issues') or []))
        rows.append(f'<tr><th scope="row">{cell(name)}</th><td>{cell(release)}</td>'
                    f'<td>{cell(TYPE_STATUS[row["status"]])}</td><td>{cell(remaining)}</td></tr>')
    return table('Header-type coverage in the v1 delivery matrix',
                 ['Header type', 'Released contract at the pinned revision', 'Mapping status',
                  'What remains upstream'],
                 rows, 'generated from the pinned delivery matrix')


def render_example(provenance: dict, errors: list) -> str:
    """The worked bundle, verbatim from the pinned bytes: context, graph, omissions."""
    parts = []
    for name, caption in (('context.json', 'Supplemental export context (the file as pinned)'),
                          ('qualified-dc.ttl', 'Curated qualified-DC graph (hand-written fixture, not tool output)')):
        text = pinned(name, provenance, errors)
        meta = provenance['files'][name]
        if not text:
            continue
        parts.append(f'<section id="example-{name.replace(".", "-")}">\n<h3>{cell(caption)}</h3>\n'
                     f'<p class="reference-provenance">Pinned copy of '
                     f'<a href="{attr(meta["url"])}">{code(name)}</a>, SHA-256 {code(meta["sha256"])}. Reproduced '
                     'unchanged; every identifier in it is illustrative.</p>\n'
                     f'<pre class="tb-source" tabindex="0"><code>{html.escape(text)}</code></pre>\n</section>')
    report_text = pinned('report.json', provenance, errors)
    if report_text:
        report = json.loads(report_text)
        report_meta = provenance['files']['report.json']
        not_projected = report.get('source_root_fields_not_projected') or []
        limitations = report.get('limitations') or []
        not_supplied = report.get('not_supplied_context') or []
        facts = [('profileVersion', report.get('profileVersion')),
                 ('status', report.get('status')),
                 ('preserved source', report.get('preserved_source')),
                 ('output', report.get('output')),
                 ('conflict policy', report.get('conflict_policy')),
                 ('context keys not supplied', ', '.join(not_supplied) or 'none'),
                 ('registration readiness',
                  '; '.join(f'{agency}: {outcome}'
                            for agency, outcome in (report.get('registration_readiness') or {}).items()))]
        rows = [f'<tr><th scope="row">{cell(key)}</th><td>{cell(value)}</td></tr>' for key, value in facts]
        rows.append('<tr><th scope="row">' + cell(f'root fields not projected ({len(not_projected)})')
                    + '</th><td>' + ', '.join(cell(field) for field in not_projected) + '</td></tr>')
        parts.append('<section id="example-report">\n<h3>What the bundle reports as lost or unasserted</h3>\n'
                     f'<p class="reference-provenance">Pinned copy of '
                     f'<a href="{attr(report_meta["url"])}">{code("report.json")}</a>, SHA-256 '
                     f'{code(report_meta["sha256"])}. The source record itself is '
                     f'<a href="{attr(provenance["files"]["source.json"]["url"])}">{code("source.json")}</a> '
                     f'(SHA-256 {code(provenance["files"]["source.json"]["sha256"])}) — an unchanged, '
                     'schema-valid FHR example, so it is linked rather than duplicated here.</p>\n'
                     '<div class="field-table" role="region" tabindex="0" '
                     'aria-label="Worked example report">\n<table>\n'
                     '<caption class="visually-hidden">Reported omissions, limitations and conflict policy of '
                     'the pinned worked example.</caption>\n'
                     '<thead><tr><th scope="col">Report field</th><th scope="col">Value</th></tr></thead>\n'
                     '<tbody>\n' + '\n'.join(row for row in rows if row) + '\n</tbody>\n</table>\n</div>')
        parts.append('<p>Limitations the bundle states about itself:</p>\n<ul class="field-constraints">'
                     + ''.join(f'<li>{cell(item)}</li>' for item in limitations) + '</ul>\n</section>')
    return '\n'.join(parts)


def render(inventory: dict, matrix: dict, provenance: dict, errors: list,
           include_example: bool = True) -> str:
    if errors:
        raise SystemExit('the pinned mapping bytes failed validation:\n  - ' + '\n  - '.join(errors))
    meta, matrix_meta = provenance['files'][INVENTORY], provenance['files'][MATRIX]
    context_meta = provenance['files']['assembly-export-context.schema.json']
    adoption = provenance['adoption']
    runtime = provenance['runtimeExporter']
    summary = totals(inventory)
    target = inventory.get('target') or {}
    parts = [
        f'<!-- Generated by scripts/mapping_crosswalk.py from {INVENTORY} (SHA-256 {meta["sha256"]}) and '
        f'{MATRIX} (SHA-256 {matrix_meta["sha256"]}). Do not edit by hand: refresh the pins with --fetch, '
        'update provenance.json, then rerun the generator. -->',
        '<p class="reference-provenance" data-mapping-sha256="' + attr(meta['sha256']) + '" '
        f'data-mapping-profile-version="{cell(inventory.get("profile_version"))}">Generated from '
        f'<a href="{attr(meta["url"])}">{code(INVENTORY)}</a> and '
        f'<a href="{attr(matrix_meta["url"])}">{code(MATRIX)}</a> of FAIR-bioHeaders/FAIR-bioHeaders-Specification '
        f'at commit {code(meta["commit"][:10])} — SHA-256 {code(meta["sha256"])} and '
        f'{code(matrix_meta["sha256"])} — retrieved {cell(meta["retrieved"])}. Profile version '
        f'{code(inventory.get("profile_version"))}, upstream status {code(inventory.get("status"))}. '
        'Regenerate and compare with <code>python3 scripts/mapping_crosswalk.py --check</code>, which the site '
        'checks run on every pull request. The specification repository stays the authority: this is a '
        'rendering of it, not a second definition.</p>',
        f'<p>The v1 descriptive surface rules on all {summary["root"]} root fields of the FHR '
        f'{code(inventory.get("source_schema_version"))} contract — the record scope is '
        f'{code(inventory.get("resource_scope"))} — against qualified DCMI Terms '
        f'{code(target.get("version"))} (<a href="{attr(provenance["references"]["dcmi"])}">the '
        f'{cell(target.get("version"))} versioned page</a>): {summary["conditional"]} conditional '
        f'projections and {summary["unsupported"]} fields not projected, plus {summary["context"]} keys that '
        'arrive from the supplemental export context instead of from the header. Each row carries its own '
        'condition, transformation and loss statement; nothing here is collapsed into an unconditional '
        'equivalence.</p>',
        '<p>"Not projected" describes this surface rather than the field: the inventory records why the value '
        'is left out of the graph and where it is preserved instead. The RDF graph is not lossless — it drops '
        'array order and nested structure — so the source record and the context remain the preservation layer, '
        'and Simple DC is not used as an intermediate store.</p>',
        '<section id="root-fields">\n<h2>FHR root fields in mapping v1</h2>\n',
        render_root_table(inventory),
        '</section>\n<section id="context-keys">\n<h2>Supplemental export-context keys</h2>\n',
        '<p>These keys are not FHR fields and add nothing to any header. They let a citation title, publisher, '
        'publication date and resource IRI come from an explicit assertion rather than be inferred from the '
        f'record. The proposed contract is <a href="{attr(context_meta["url"])}">'
        f'{code("assembly-export-context.schema.json")}</a> at the same commit, checked offline by '
        f'{code("scripts/check_mapping_context.py")} upstream.</p>',
        render_context_table(inventory),
        '</section>\n<section id="target-status">\n<h2>Status of each mapping target</h2>\n',
        '<p>Only the qualified DCMI descriptive direction has any v1 surface. The rest are recorded as '
        '<em>planned</em> upstream and are listed here precisely so a candidate version number is not read as '
        'available support: those versions are review references, not claims that an adapter validates the '
        'format, and no row below is deposit-ready.</p>',
        render_target_table(matrix),
        '</section>\n<section id="type-status">\n<h2>Coverage by header type</h2>\n',
        '<p>Shared FH* terminology does not imply mapping parity. Only FHR has a v1 descriptive surface; the '
        'other types wait for their own reviewed profiles, and FHT waits for a contract at all.</p>',
        render_type_table(matrix),
        '</section>\n<section id="worked-example">\n<h2>One worked bundle, end to end</h2>\n',
        '<p>The v1 surface ships one curated example rather than a generated export: a schema-valid FHR source '
        'record, an explicit export context, a hand-written qualified-DC graph, and a report that names what '
        'the graph did not carry. Reading the report next to the graph is the point — a descriptive export is '
        'judged by what it states and by what it admits it dropped, not by the fact that it parsed.</p>',
        *( [render_example(provenance, errors)] if include_example else [] ),
        '</section>\n<section id="adoption">\n<h2>Adoption state of what is shown here</h2>\n',
        '<p>Maintainers adopted this v1 surface as <strong>correct-but-not-final</strong> on '
        f'{cell(adoption["recorded"])} and <strong>withheld the "official" label until a deterministic '
        'exporter ships</strong>. That is the dated adoption record. Published fair-bioheaders '
        f'{cell(runtime["toolkitVersion"])} now ships the narrow '
        f'<a href="{attr(runtime["documentation"])}">export-dcmi CLI</a> for complete FHR v0.4.0 inputs. '
        'Actual installed repeated runs produced identical preservation bundles. This page grants no new '
        'official label or expanded profile: it remains reference material, and the worked graph remains '
        'a manually curated fixture rather than tool output. The pinned artifacts '
        f'still carry their own upstream label {code("status: " + str(inventory.get("status")))} and profile version '
        f'{code(inventory.get("profile_version"))}; any version bump, label or re-scoping is recorded on '
        '<a href="https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/issues/56">#56</a>, not '
        'here. The row-by-row decision sheet is the '
        f'<a href="{attr(adoption["decisionPacket"])}">v1 adoption packet</a> at the pinned commit.</p>\n</section>',
    ]
    return '\n'.join(parts) + '\n'


# ------------------------------------------------------------------------ commands

def build() -> tuple:
    provenance = load_provenance()
    errors: list = []
    inventory_text, matrix_text = pinned(INVENTORY, provenance, errors), pinned(MATRIX, provenance, errors)
    inventory, matrix = {}, {}
    for name, text in ((INVENTORY, inventory_text), (MATRIX, matrix_text)):
        if not text:
            continue
        try:
            parsed = read_yaml(text, name)
        except ValueError as problem:
            errors.append(str(problem))
            continue
        if name == INVENTORY:
            inventory = parsed
        else:
            matrix = parsed
    if inventory and matrix:
        validate(inventory, matrix, errors)
    return render(inventory, matrix, provenance, errors), errors


def command_write() -> int:
    fragment, _ = build()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRAGMENT.write_text(fragment, encoding='utf-8')
    print(f'wrote {FRAGMENT.relative_to(ROOT)}')
    return 0


def command_check() -> int:
    fragment, errors = build()
    problems = list(errors)
    if not FRAGMENT.is_file():
        print(f'{FRAGMENT.relative_to(ROOT)}: missing; run python3 scripts/mapping_crosswalk.py', file=sys.stderr)
        return 1
    if FRAGMENT.read_text(encoding='utf-8') != fragment:
        problems.append('the committed fragment no longer matches the pinned mapping bytes')
    for phrase in FORBIDDEN:
        if phrase in fragment.lower():
            problems.append(f'the generated fragment says "{phrase}", which the withheld label and the missing '
                            'do not support')
    for delimiter in ('{{', '{%'):
        if delimiter in fragment:
            problems.append(f'the generated fragment contains "{delimiter}", which Liquid would execute')
    if problems:
        print('\n'.join(problems), file=sys.stderr)
        print('Regenerate with: python3 scripts/mapping_crosswalk.py', file=sys.stderr)
        return 1
    print('Checked the /mappings/ crosswalk against the pinned inventory and delivery matrix.')
    return 0


def command_fetch() -> int:
    """Re-download every pinned file and compare it with the recorded digest."""
    provenance = load_provenance()
    changed, today = 0, str(datetime.date.today())
    for name, meta in provenance['files'].items():
        target = snapshot_target(SNAPSHOT_DIR, name)
        data = fetch_bytes(meta['fetchUrl'])
        if not target.is_file() or target.read_bytes() != data:
            target.write_bytes(data)
            print(f'refreshed {name} from {meta["fetchUrl"]}')
            changed += 1
        digest = sha256_bytes(data)
        if meta['sha256'] != digest:
            print(f'new digest for {name}: {meta["sha256"]} -> {digest}')
            meta['sha256'], meta['retrieved'] = digest, today
            changed += 1
    if changed:
        PROVENANCE_PATH.write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print('Update the ref/commit fields in provenance.json, then run '
              'python3 scripts/mapping_crosswalk.py and commit the pins with the generated fragment.')
    else:
        print('Every pinned mapping file already matches its authoritative URL.')
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='Generate the /mappings/ crosswalk from pinned mapping bytes.')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--check', action='store_true', help='fail if the committed fragment drifted')
    group.add_argument('--fetch', action='store_true', help='refresh the pinned bytes (maintainer step)')
    args = parser.parse_args(argv)
    if args.fetch:
        return command_fetch()
    if args.check:
        return command_check()
    return command_write()


if __name__ == '__main__':
    sys.exit(main())
