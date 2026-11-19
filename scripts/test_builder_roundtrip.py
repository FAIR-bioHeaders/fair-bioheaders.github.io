#!/usr/bin/env python3
"""Released-type builder export round trips (website issue #15, item 3 slice).

`docs/maintenance.md` records the dated toolkit round trip as a local
procedure: website CI installs no `fair-bioheaders`, and pinning a toolkit
version there is an open maintainer decision, so nothing in this file claims a
converter or toolkit verification. What it does automate, on every CI run and
with standard library parsing only (mirroring the stdlib discipline of
`schema_fields.py` and `mapping_crosswalk.py`), is the repository's own
producer boundary for the pinned v0.6.0 releases:

    record -> table-builder.js export (YAML, readable table, standalone HTML,
    typed FHR/FHP microdata) -> re-read with stdlib-only parsers written
    against the published bindings -> re-validate the reconstructed record
    with this repository's existing snapshot validator

Assertions per fixture and per hostile vector:

* the YAML export re-reads to a type-tagged copy of the record (strings stay
  strings; 0, false and null stay values; array order survives);
* the microdata document re-reads to the record minus the rule R15 extension
  keys, which docs/MICRODATA.md M5 keeps out of HTML by design;
* the readable table and the standalone document carry every value as text
  only — no script, anchor, href or src is ever produced from metadata, so a
  `javascript:` URL or a `</script>` sequence cannot execute;
* FHGFF3 standalone HTML carries no microdata at all (its binding has not
  landed; see issue #15 item 1);
* each reconstructed record validates against the same byte-pinned snapshot
  that the source record does — the validator is `table-builder.js`'s own,
  invoked through `scripts/builder_roundtrip.mjs --validate`.

The stdlib re-readers are deliberately strict: a YAML line outside the
builder's restricted subset, an untyped microdata node or a duplicate
itemprop raises instead of guessing, so a serialization change fails here
loudly and gets reviewed rather than being silently re-read.

Run: `python3 -m unittest discover -s scripts -p 'test_*.py'` (Node 24 from
`.nvmrc` must be on PATH; CI provides it in the same job).
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRIVER = ROOT / 'scripts' / 'builder_roundtrip.mjs'

FHR_ITEMTYPE = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json'
FHP_ITEMTYPE = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FAIR-bioHeaders-Specification/main/fhp.json'


# ---------------------------------------------------------- Node driver plumbing

def _run_node(args, stdin_text=None):
    if shutil.which('node') is None:
        raise AssertionError(
            'node is required for the builder round-trip checks; install the .nvmrc '
            'toolchain (CI runs `npm ci` in the same job). This gate never skips silently.')
    completed = subprocess.run(['node', str(DRIVER), *args], input=stdin_text, capture_output=True,
                               text=True, cwd=ROOT, timeout=120)
    if completed.returncode != 0:
        raise AssertionError(f'node scripts/builder_roundtrip.mjs {" ".join(args)} failed: {completed.stderr}')
    return completed.stdout


_REPORT = None


def report():
    global _REPORT
    if _REPORT is None:
        _REPORT = json.loads(_run_node(['--export']))
    return _REPORT


def entries():
    return report()['fixtures'] + report()['vectors']


# ------------------------------------------------- builder YAML subset re-loader

KEY = re.compile(r'^([A-Za-z_][A-Za-z0-9_.-]*):(?:\s(.*))?$')
INT = re.compile(r'^-?(?:0|[1-9][0-9]*)$')
FLOAT = re.compile(r'^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$')


class BuilderYamlError(ValueError):
    pass


def load_builder_yaml(text: str):
    """Re-read exactly the builder's emitted subset; anything else raises.

    The subset (see `yamlScalar`/`emitMap`/`emitSeq` in `assets/js/table-builder.js`):
    block mappings with `key: value`, `key:` + deeper block, `key: []`, `key: {}`;
    block sequences at the key's own indent, including `- ` for a nested
    sequence and `- key:` to start a mapping item; scalars are `null`, `true`,
    `false`, plain integers/floats, or JSON-style double-quoted strings (the
    builder escapes every string with JSON.stringify plus \\uXXXX for characters
    YAML treats as non-printable). Plain and single-quoted scalars are NOT part
    of the subset and must not be silently accepted.
    """
    lines = []
    for number, raw in enumerate(text.split('\n'), start=1):
        if raw == '' and number == len(text.split('\n')):
            continue  # the trailing newline after the final line
        if not raw.strip():
            raise BuilderYamlError(f'line {number}: unexpected blank line in builder output')
        if raw.startswith('\t') or '\t' in raw[:len(raw) - len(raw.lstrip(' '))]:
            raise BuilderYamlError(f'line {number}: tab indentation is outside the subset')
        lines.append((number, len(raw) - len(raw.lstrip(' ')), raw.strip()))
    pos = 0

    def scalar(token, number):
        if token == 'null':
            return None
        if token == 'true':
            return True
        if token == 'false':
            return False
        if token == '[]':
            return []
        if token == '{}':
            return {}
        if token.startswith('"'):
            try:
                value = json.loads(token)
            except json.JSONDecodeError as error:
                raise BuilderYamlError(f'line {number}: malformed quoted scalar {token!r} ({error})') from error
            if not isinstance(value, str):
                raise BuilderYamlError(f'line {number}: quoted scalar is not a string')
            return value
        if INT.match(token):
            return int(token)
        if FLOAT.match(token):
            return float(token)
        raise BuilderYamlError(f'line {number}: scalar {token!r} is outside the builder YAML subset')

    def peek():
        return lines[pos] if pos < len(lines) else None

    def parse_mapping(indent):
        nonlocal pos
        result = {}
        while True:
            item = peek()
            if item is None or item[1] != indent or item[2].startswith('-'):
                break
            number, _, content = item
            match = KEY.match(content)
            if not match:
                raise BuilderYamlError(f'line {number}: expected "key: value", got {content!r}')
            key, rest = match.group(1), (match.group(2) or '')
            pos += 1
            if rest:
                if key in result:
                    raise BuilderYamlError(f'line {number}: duplicate key {key!r}')
                result[key] = scalar(rest, number)
                continue
            child = peek()
            if child is None:
                raise BuilderYamlError(f'line {number}: key {key!r} has no value')
            if child[2] == '-' or child[2].startswith('- '):
                if child[1] < indent:
                    raise BuilderYamlError(f'line {number}: sequence dedents below its key')
                result[key] = parse_sequence(child[1])
            elif child[1] > indent:
                result[key] = parse_mapping(child[1])
            else:
                raise BuilderYamlError(f'line {number}: key {key!r} has no value at this indent')
        return result

    def parse_sequence(indent):
        nonlocal pos
        items = []
        while True:
            item = peek()
            if item is None or item[1] != indent or not (item[2] == '-' or item[2].startswith('- ')):
                break
            number, dash_indent, content = item
            rest = content[1:].strip()
            pos += 1
            if not rest:
                child = peek()
                if child is None or child[1] <= indent:
                    raise BuilderYamlError(f'line {number}: empty sequence item')
                items.append(parse_sequence(child[1]) if child[2].startswith('-') else parse_mapping(child[1]))
                continue
            if KEY.match(rest):
                # A mapping item whose first key sits on the dash line; the
                # builder re-indents the item body to the column after '- '.
                column = dash_indent + 2
                lines[number - 1] = (number, column, rest)
                pos -= 1  # let parse_mapping consume the rewritten dash line
                items.append(parse_mapping(column))
            else:
                items.append(scalar(rest, number))
        return items

    first = peek()
    if first is None:
        raise BuilderYamlError('empty document')
    value = parse_sequence(first[1]) if first[2].startswith('-') else parse_mapping(first[1])
    if pos != len(lines):
        raise BuilderYamlError(f'stopped at line {lines[pos][0]}: {lines[pos][2]!r} is outside the subset')
    return value


# -------------------------------------------------- microdata subset re-reader

class _Element:
    __slots__ = ('tag', 'attrs', 'children', 'text')

    def __init__(self, tag, attrs):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []
        self.text = ''


class _SpanTree(HTMLParser):
    """Builds the element tree of the typed-span microdata layout.

    `convert_charrefs` (the default) unescapes text data, so a reconstructed
    leaf compares directly against the source string.
    """

    def __init__(self):
        super().__init__()
        self.root = None
        self._stack = []

    def handle_starttag(self, tag, attrs):
        element = _Element(tag, attrs)
        if self._stack:
            self._stack[-1].children.append(element)
        elif self.root is None:
            self.root = element
        self._stack.append(element)

    def handle_endtag(self, tag):
        if not self._stack:
            raise AssertionError(f'unbalanced </{tag}> in microdata document')
        self._stack.pop()

    def handle_data(self, data):
        if self._stack:
            self._stack[-1].text += data


def _typed(value, token):
    if value is True or value is False:
        return 'bool'
    if isinstance(value, int):
        return 'int'
    if isinstance(value, float):
        return 'float'
    return type(value).__name__


def typed_equal(expected, actual, path='$'):
    """Equality that keeps 0 apart from false and 1 apart from 1.0."""
    assert _typed(expected, path) == _typed(actual, path) or (expected is None and actual is None), \
        f'{path}: type tag differs ({_typed(expected, path)} vs {_typed(actual, path)}): {expected!r} / {actual!r}'
    if isinstance(expected, dict):
        assert list(expected.keys()) == list(actual.keys()) or set(expected) == set(actual), \
            f'{path}: keys differ: {sorted(set(expected) ^ set(actual))}'
        for key in expected:
            typed_equal(expected[key], actual[key], f'{path}/{key}')
    elif isinstance(expected, list):
        assert len(expected) == len(actual), f'{path}: array length {len(expected)} vs {len(actual)}'
        for index, (left, right) in enumerate(zip(expected, actual)):
            typed_equal(left, right, f'{path}/{index}')
    else:
        assert expected == actual, f'{path}: {expected!r} != {actual!r}'
    return True


def read_microdata(html_text, expected_itemtype):
    """Re-read the builder's typed-span layout per the FHR/FHP binding.

    Mirrors what the reviewed toolkit readers consume (the item scope,
    `itemprop`, the `data-fhr-type` tags, `itemprop="item"` array children and
    the `itemscope` nesting) — deliberately strict: an untyped node, a stray
    text run inside a container, a repeated scalar property or any `x-`
    itemprop raises, because the bindings forbid exactly that output.
    """
    parser = _SpanTree()
    parser.feed(html_text)
    parser.close()
    root = parser.root
    assert root is not None and root.tag == 'div' and 'itemscope' in root.attrs, 'microdata root div is missing'
    assert root.attrs.get('itemtype') == expected_itemtype, \
        f'item scope {root.attrs.get("itemtype")!r} is not the expected {expected_itemtype!r}'

    def read(node):
        kind = node.attrs.get('data-fhr-type')
        if kind == 'array':
            assert not node.text.strip(), 'text inside an array container'
            values = []
            for child in node.children:
                assert child.attrs.get('itemprop') == 'item', 'array child must use itemprop="item"'
                values.append(read_child_value(child))
            return values
        if kind == 'object':
            assert not node.text.strip(), 'text inside an object container'
            result = {}
            for child in node.children:
                key = child.attrs.get('itemprop')
                assert key, 'object child without itemprop'
                assert not key.startswith('x-'), f'extension key {key!r} reached the microdata item (M5)'
                assert key not in result, f'repeated scalar/object property {key!r}'
                result[key] = read_child_value(child)
            return result
        raise AssertionError(f'container without a declared data-fhr-type: {kind!r}')

    def read_child_value(node):
        kind = node.attrs.get('data-fhr-type')
        if 'itemscope' in node.attrs:
            assert kind == 'object', 'itemscope node must declare type object'
            return read(node)
        if kind == 'array':
            return read(node)
        text = node.text
        assert not node.children, 'scalar node has element children'
        if kind == 'string':
            return text
        if kind == 'integer':
            assert INT.match(text), f'integer leaf holds {text!r}'
            return int(text)
        if kind == 'number':
            assert FLOAT.match(text), f'number leaf holds {text!r}'
            return float(text)
        if kind == 'boolean':
            assert text in ('true', 'false'), f'boolean leaf holds {text!r}'
            return text == 'true'
        if kind == 'null':
            assert text == 'null', f'null leaf holds {text!r}'
            return None
        raise AssertionError(f'unsupported data-fhr-type {kind!r}')

    result = {}
    for child in root.children:
        key = child.attrs.get('itemprop')
        assert key, 'top-level microdata child without itemprop'
        assert not key.startswith('x-'), f'extension key {key!r} reached the microdata item (M5)'
        assert key not in result, f'repeated top-level property {key!r}'
        result[key] = read_child_value(child)
    return result


# ------------------------------------------------------------- readable table

def read_table(html_text):
    """Return [(label, value)] rows of a standalone/table document."""

    class Rows(HTMLParser):
        def __init__(self):
            super().__init__()
            self.rows = []
            self.cell = None
            self.pending = []

        def handle_starttag(self, tag, attrs):
            if tag in ('th', 'td'):
                self.cell = []

        def handle_endtag(self, tag):
            if tag in ('th', 'td') and self.cell is not None:
                self.pending.append(''.join(self.cell))
                self.cell = None
            elif tag == 'tr':
                if len(self.pending) == 2:
                    self.rows.append(tuple(self.pending))
                self.pending = []

        def handle_data(self, data):
            if self.cell is not None:
                self.cell.append(data)

    parser = Rows()
    parser.feed(html_text)
    parser.close()
    return parser.rows


# ------------------------------------------------------------------- the tests

class ReleasedTypeRoundTrip(unittest.TestCase):
    maxDiff = None

    def assert_node_present(self):
        if shutil.which('node') is None:
            self.fail('node is required for the builder round-trip checks; this gate never skips silently.')

    def test_snapshots_still_match_their_pinned_digests(self):
        # The round trips below are statements about specific bytes; if a
        # snapshot changed, this test must fail before its exports are trusted.
        pinned = {
            'fhr-v0.6.0.json': '694ab5afaf8c3743eacf9e2aacb5551f7cbe37073b6f4afc3ae4a65b47f9d4df',
            'fhp-v0.6.0.json': '92a0b3cbcfe69939ebfaac69f0c5958ce426c005873efe8d3e3eb0fc0dab6de5',
            'fhgff3-v0.6.0.json': '1942be4cefc8b3a2537942c2252b45fbcef87a5532486e4fd0f5d4c540e0fbf9',
        }
        import hashlib
        for name, digest in pinned.items():
            actual = hashlib.sha256((ROOT / 'assets' / 'schema' / name).read_bytes()).hexdigest()
            self.assertEqual(actual, digest, name)

    def test_driver_reports_the_seven_pinned_v060_fixtures_and_two_vectors(self):
        self.assert_node_present()
        names = [entry['name'] for entry in entries()]
        self.assertEqual(names, [
            'example.fhr.json', 'extension-fields.fhr.yaml', 'rich-database.fhp.json', 'rich-mixed.fhp.yaml',
            'minimal-reference.fhgff3.json', 'rich.fhgff3.yaml', 'dotted-lineage.fhp.yaml',
            'vector.fhr', 'vector.fhp'])

    def test_source_records_validate_against_their_pinned_snapshot(self):
        self.assert_node_present()
        for entry in entries():
            self.assertEqual(entry['validationErrors'], [], entry['name'])

    def test_raw_angle_bracket_data_uri_is_rejected_like_the_released_runtime(self):
        # fair-bioheaders 0.12.0 rejects `data:text/html,<script>...` as
        # "not a 'uri'" (jsonschema's strict RFC 3986 checker, run locally
        # 2026-11-19 and recorded in docs/maintenance.md). The browser
        # validator must not accept what the toolkit refuses.
        self.assert_node_present()
        rejection = report()['rejections'][0]
        self.assertEqual(rejection['name'], 'reject.fhr.data-uri')
        offenders = [error for error in rejection['validationErrors']
                     if error['path'] == ['relatedLink', 0]]
        self.assertEqual(len(offenders), 1, str(rejection['validationErrors']))
        self.assertIn('uri', offenders[0]['message'].lower())

    def test_yaml_export_reloads_to_the_same_record(self):
        self.assert_node_present()
        for entry in entries():
            with self.subTest(entry['name']):
                reloaded = load_builder_yaml(entry['yaml'])
                typed_equal(entry['record'], reloaded, entry['name'])

    def test_microdata_reloads_to_the_record_without_extension_fields(self):
        self.assert_node_present()
        for entry in entries():
            if entry['kind'] == 'FHGFF3':
                continue
            with self.subTest(entry['name']):
                itemtype = FHR_ITEMTYPE if entry['kind'] == 'FHR' else FHP_ITEMTYPE
                rebuilt = read_microdata(entry['microdataDiv'], itemtype)
                expected = {key: value for key, value in entry['record'].items() if key not in entry['extensions']}
                typed_equal(expected, rebuilt, entry['name'])

    def test_reconstructed_records_validate_against_the_same_snapshot(self):
        self.assert_node_present()
        for entry in entries():
            if entry['kind'] == 'FHGFF3':
                continue
            with self.subTest(entry['name']):
                rebuilt = read_microdata(entry['microdataDiv'],
                                         FHR_ITEMTYPE if entry['kind'] == 'FHR' else FHP_ITEMTYPE)
                errors = json.loads(_run_node(['--validate', entry['snapshot']], json.dumps(rebuilt)))
                self.assertEqual(errors, [], f"{entry['name']}: reconstructed record is invalid")
                # The M5 boundary is observable, not assumed: exactly the
                # reported extension keys are missing from the item, and the
                # standalone document names each one it left out.
                self.assertEqual(set(entry['record']) - set(rebuilt), set(entry['extensions']),
                                 f"{entry['name']}: only extension keys may be absent from microdata")
                for key in entry['extensions']:
                    self.assertIn(f'"{key}"', entry['standaloneHtml'],
                                  f"{entry['name']}: omitted extension {key} must be reported")

    def test_fhgff3_still_emits_no_microdata(self):
        self.assert_node_present()
        for entry in entries():
            if entry['kind'] != 'FHGFF3':
                continue
            with self.subTest(entry['name']):
                self.assertIsNone(entry['microdataDiv'])
                self.assertTrue(entry['microdataThrows'], 'microdataDiv must keep refusing FHGFF3')
                self.assertNotIn('itemscope', entry['standaloneHtml'])
                self.assertIn('HTML microdata is not supported', entry['standaloneHtml'])

    def test_standalone_documents_are_inert_for_every_value(self):
        self.assert_node_present()

        class TagScan(HTMLParser):
            def __init__(self):
                super().__init__()
                self.tags = []

            def handle_starttag(self, tag, attrs):
                self.tags.append(tag)

            def handle_startendtag(self, tag, attrs):
                self.tags.append(tag)

        for entry in entries():
            with self.subTest(entry['name']):
                html_text = entry['standaloneHtml']
                scan = TagScan()
                scan.feed(html_text)
                scan.close()
                # Structure, not substring: escaped payloads legitimately CONTAIN
                # text like `src=x`, so the assertion is that no such ELEMENT
                # exists. The exports are tables, headings, paragraphs and the
                # typed span/object/array microdata layout — nothing executable.
                for forbidden in ('script', 'iframe', 'a', 'img', 'form', 'input', 'svg',
                                  'object', 'embed', 'link', 'style'):
                    self.assertNotIn(forbidden, scan.tags, f"{entry['name']}: <{forbidden}> appeared")
                self.assertIn(entry['tableHtml'], html_text, 'the displayed table is the one embedded')
                if entry['kind'] != 'FHGFF3':
                    self.assertIn(entry['microdataDiv'], html_text, 'the typed item is embedded verbatim')

    @staticmethod
    def _strings(value):
        if isinstance(value, str):
            yield value
        elif isinstance(value, dict):
            for key, item in value.items():
                yield key
                yield from ReleasedTypeRoundTrip._strings(item)
        elif isinstance(value, list):
            for item in value:
                yield from ReleasedTypeRoundTrip._strings(item)

    def test_hostile_vectors_survive_as_text_and_never_as_markup(self):
        self.assert_node_present()
        payloads = {
            'vector.fhr': [
                '</script><script>alert(1)</script>',          # markup breakout
                'javascript:alert(1)',                          # scheme that a link would execute
                'data:text/html,%3Cscript%3Ealert(1)%3C%2Fscript%3E',  # percent-encoded, a valid URI
                '!!python/object:evil.tag',                     # YAML tag injection
                '*anchor-ref', '&anchor definition', '@reserved indicator', '`reserved backtick',
                '  - leading dash sequence',
                'x\u202Eoverriding\u202B text\ufeff\u200b',      # bidi override + zero-width bytes
                'tab\there\u0007bel\u001bescape',
            ],
            'vector.fhp': [
                '<a href="javascript:alert(1)">link</a>',
                'javascript:alert(document.domain)',
                '\u202eRLO value',
            ],
        }
        for name, needles in payloads.items():
            entry = next(e for e in entries() if e['name'] == name)
            with self.subTest(name):
                rows = ' \x00 '.join(' '.join(cell for cell in row) for row in read_table(entry['tableHtml']))
                reloaded = load_builder_yaml(entry['yaml'])
                hay = '\x01'.join(self._strings(reloaded))
                for needle in needles:
                    self.assertIn(needle, rows, f'{name}: {needle!r} must display as text')
                    # The payload survives the YAML as a decoded string value,
                    # read back through the stdlib loader — not as a raw
                    # substring: tabs, control bytes and quotes legitimately
                    # arrive escaped in the file.
                    self.assertIn(needle, hay, f'{name}: {needle!r} must survive the YAML round trip')
                # No YAML line of the document may hold a character that YAML
                # treats as non-printable (same c-printable rule as the Node
                # suite): everything hostile is either quoted or \\u-escaped.
                for line in entry['yaml'].split('\n'):
                    self.assertRegex(line,
                                     '^[\t\r\u0020-\u007e\u00a0-\u2027\u202a-\ud7ff\ue000-\ufffd\U00010000-\U0010ffff]*$',
                                     'a character YAML 1.2 treats as non-printable/line-breaking (C0/C1, DEL, NEL, LS, PS, FFFE/FFFF) was emitted unescaped')
                # The emitted YAML never lets a value open a new structural line:
                # every raw line is a key, a dash item, or a continuation.
                for line in entry['yaml'].split('\n'):
                    if not line.strip():
                        continue
                    stripped = line.strip()
                    self.assertTrue(KEY.match(stripped) or stripped == '-' or stripped.startswith('- '),
                                    f'{name}: unexpected YAML line shape {line!r}')

    def test_yaml_subset_loader_is_strict_about_the_subset(self):
        # The loader's tripwire value depends on rejecting what the builder
        # must never emit. These shapes all appear in ordinary YAML.
        for document in ('key: bare string\n', "key: 'single quoted'\n", 'key: 01\n', 'key: .inf\n',
                         'key:\n  - a\nother\tkey: 1\n', 'key: "unterminated\n', 'key:\n', '- top level\n'):
            with self.subTest(document=document.strip()):
                with self.assertRaises(BuilderYamlError):
                    load_builder_yaml(document)
        # And the emitted shapes must parse. (Note the continuation of the
        # mapping item after `- h: 1` sits at column 4, as the builder emits
        # it; a 3-column version must fail, which the case above shows.)
        self.assertEqual(load_builder_yaml('a: "s"\nb: 1\nc: 1.0\nd: []\ne: {}\nf:\n  - "x"\n'
                                           'g:\n  - h: 1\n    i: "j"\nk: null\nl: false\n'),
                         {'a': 's', 'b': 1, 'c': 1.0, 'd': [], 'e': {}, 'f': ['x'],
                          'g': [{'h': 1, 'i': 'j'}], 'k': None, 'l': False})
        typed_equal({'c': 1.0}, load_builder_yaml('c: 1.0\n'), 'float')
        self.assertIs(type(load_builder_yaml('c: 1\n')['c']), int)
        self.assertIs(type(load_builder_yaml('c: "1"\n')['c']), str)


if __name__ == '__main__':
    unittest.main()
