"""Drift coverage for the generated /specifications/ field references (issue #46).

CI runs this file through the existing `python3 -m unittest discover -s scripts`
step, so a schema change cannot ship with stale documentation:

1. the committed reference fragments must equal what the pinned schema bytes produce;
2. the pinned bytes must still equal their recorded digests;
3. an independently written walk of each schema must find exactly the field paths the
   rendered tables document (this is the completeness proof, not the generator's own
   bookkeeping);
4. every curated note must still name a real field, and the draft type must stay a
   draft: no release, no fixed alias.
"""
import html as html_lib
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

import schema_fields as schema_tools

ROOT = Path(__file__).resolve().parent.parent
INCLUDES = ROOT / '_includes' / 'schema'


def independent_paths(schema: dict) -> set:
    """Every field path in a schema, walked without the generator's helpers.

    Deliberately naive and written twice on purpose: the tables are only accepted as
    complete when this second, independent enumeration agrees with them.
    """
    defs = schema.get('$defs') or schema.get('definitions') or {}

    def resolve(node):
        seen = set()
        while isinstance(node, dict) and '$ref' in node and node['$ref'] not in seen:
            seen.add(node['$ref'])
            name = node['$ref'].rsplit('/', 1)[-1]
            merged = dict(defs.get(name, {}))
            merged.update({k: v for k, v in node.items() if k != '$ref'})
            node = merged
        return node if isinstance(node, dict) else {}

    def members(node, prefix, found):
        for name, raw in (node.get('properties') or {}).items():
            path = f'{prefix}{name}'
            found.add(path)
            target = resolve(raw)
            children = []
            if target.get('type') == 'array':
                children.append((f'{path}[].', resolve(target.get('items', {}))))
            if target.get('properties'):
                children.append((f'{path}.', target))
            for branch in target.get('anyOf', []):
                branch = resolve(branch)
                if branch.get('type') == 'array':
                    children.append((f'{path}[].', resolve(branch.get('items', {}))))
                elif branch.get('properties'):
                    children.append((f'{path}.', branch))
            for nested_prefix, child in children:
                members(child, nested_prefix, found)

    found = set()
    members(schema, '', found)
    if schema.get('patternProperties'):
        found.add(schema_tools.EXTENSION_PATH)
    return found


def documented_paths(html: str) -> set:
    rows = re.findall(r'<tr id="[^"]+"><th scope="row"><code>([^<]+)</code></th>', html)
    return {html_lib.unescape(row) for row in rows}


class PinnedBytes(unittest.TestCase):
    def setUp(self):
        self.provenance = schema_tools.load_provenance()

    def test_pinned_files_match_their_recorded_digests(self):
        for section in ('files', 'references', 'examples'):
            for name, meta in self.provenance[section].items():
                with self.subTest(name=name):
                    path = schema_tools.SNAPSHOT_DIR / name
                    self.assertTrue(path.is_file(), f'{name} is missing from the snapshots')
                    self.assertEqual(schema_tools.sha256(path.read_bytes()), meta['sha256'],
                                     f'{name} no longer matches provenance.json')

    def test_pinned_release_is_what_the_registry_calls_current(self):
        registry = json.loads((schema_tools.SNAPSHOT_DIR / 'versions-v0.5.0.json').read_text())
        self.assertIsNone(registry['preRelease'], 'a pre-release marker means the pin is not a published release')
        for name, meta in self.provenance['files'].items():
            if meta['status'] != 'released':
                continue
            with self.subTest(schema=name):
                self.assertEqual(meta['release'], registry['current'])
                self.assertEqual(registry['releases'][registry['current']][meta['type']],
                                 meta['schemaVersion'])

    def test_release_dates_are_recorded_for_every_line(self):
        dates = self.provenance['releaseDates']
        for release in json.loads((schema_tools.SNAPSHOT_DIR / 'versions-v0.5.0.json').read_text())['releases']:
            with self.subTest(release=release):
                self.assertIn(release, dates, 'add the published date to provenance.json')


class GeneratedReferences(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.built = schema_tools.build_all()

    def test_committed_fragments_match_the_pinned_schemas(self):
        drifted = []
        for page, data in self.built.items():
            expected = schema_tools.render_inventory(data)
            target = INCLUDES / f'{page}-reference.html'
            self.assertTrue(target.is_file(), f'{target} is missing; run the generator')
            if target.read_text(encoding='utf-8') != expected:
                drifted.append(page)
        self.assertEqual(drifted, [], 'run: python3 scripts/schema_fields.py')

    def test_generator_check_command_agrees(self):
        result = subprocess.run([sys.executable, str(ROOT / 'scripts' / 'schema_fields.py'), '--check'],
                                capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_every_schema_field_is_documented(self):
        for page, data in self.built.items():
            with self.subTest(page=page):
                schema = json.loads((schema_tools.SNAPSHOT_DIR / Path(data['pinned']['file']).name)
                                    .read_text())
                expected = independent_paths(schema)
                found = documented_paths((INCLUDES / f'{page}-reference.html').read_text())
                self.assertEqual(expected, found,
                                 f'undocumented: {sorted(expected - found)}; extra: {sorted(found - expected)}')
                self.assertEqual(data['stats']['documented'], len(expected))

    def test_every_documented_field_has_a_description_and_an_example_or_reason(self):
        for page, data in self.built.items():
            stats = data['stats']
            with self.subTest(page=page):
                self.assertEqual(stats['withDescription'], stats['documented'],
                                 'some fields have no description')
                self.assertEqual(stats['withExample'] + stats['withExampleOmittedReason'],
                                 stats['documented'], 'some fields have neither an example nor a reason')

    def test_shared_slots_stay_marked_as_shared(self):
        """A shared-core field must never silently become type-specific prose."""
        shared = schema_tools.load_shared(schema_tools.load_provenance())
        for page, data in self.built.items():
            top = {row['path']: row for row in data['groups'][0]['rows']}
            for slot in shared['slots']:
                if slot not in top:
                    continue
                with self.subTest(page=page, slot=slot):
                    self.assertTrue(top[slot]['inherited'],
                                    f'{page}: {slot} is a shared core slot but is not labelled')

    def test_curated_notes_describe_only_existing_fields(self):
        for page, data in self.built.items():
            notes = schema_tools.read_json(schema_tools.NOTE_DIR / f'{page}.json')
            documented = {row['path'] for group in data['groups'] for row in group['rows']}
            for path in notes['fields']:
                with self.subTest(page=page, path=path):
                    self.assertIn(path, documented)

    def test_conditional_rules_are_all_explained(self):
        for page, data in self.built.items():
            for rule in data['rules']:
                with self.subTest(page=page, rule=rule['id']):
                    self.assertTrue(rule['text'].strip())
                    self.assertTrue(rule['title'].strip())

    def test_draft_type_carries_no_release_claims(self):
        draft = [data for data in self.built.values() if data['status'] != 'released']
        self.assertEqual([data['page'] for data in draft], ['fht'])
        for data in draft:
            self.assertIsNone(data['release'])
            self.assertEqual(data['releases']['lines'], [])
            self.assertIsNone(data['releases']['alias'])
            html = (INCLUDES / f'{data["page"]}-reference.html').read_text()
            self.assertNotIn(f'w3id.org/fair-bioheaders/{data["page"]}', html)
            self.assertIn('Draft', html)

    def test_released_types_match_their_contracts(self):
        expected = {
            'fhr': ('FHR', '2.1', 'v0.5.0', 'https://w3id.org/fair-bioheaders/fhr/v0.5.0'),
            'fhp': ('FHP', '1.1', 'v0.5.0', 'https://w3id.org/fair-bioheaders/fhp/v0.5.0'),
            'fhgff3': ('FHGFF3', '1.1', 'v0.5.0', 'https://w3id.org/fair-bioheaders/fhgff3/v0.5.0'),
        }
        for page, (type_name, version, release, alias) in expected.items():
            data = self.built[page]
            with self.subTest(page=page):
                self.assertEqual(data['type'], type_name)
                self.assertEqual(data['release'], release)
                self.assertEqual(data['schemaVersions'][-1], version)
                self.assertEqual(data['pinned']['url'], alias)
                self.assertEqual(data['releases']['alias'], alias.rsplit('/', 1)[0])
                self.assertEqual(data['pinned']['schemaVersion'], version)
                self.assertIn(alias, (INCLUDES / f'{page}-reference.html').read_text())


if __name__ == '__main__':
    unittest.main()
