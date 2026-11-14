"""Drift coverage for the generated /mappings/ crosswalk (issue #29).

CI runs this through `python3 -m unittest discover -s scripts -p 'test_*.py'`, so the
page cannot outlive the bytes it was rendered from:

1. the pinned upstream artifacts must still equal their recorded digests;
2. the committed fragment must equal what those bytes produce right now;
3. the reader must refuse a changed file shape instead of guessing;
4. the semantic guards must fire — a disposition that appears, a target row that is
   invented, or wording that claims the withheld "official" label or an exporter;
5. the fragment must carry the inventory's own vocabulary.
"""
import json
import subprocess
import sys
import unittest
from pathlib import Path

import mapping_crosswalk as tools

ROOT = Path(__file__).resolve().parent.parent
PINS = ROOT / 'scripts' / 'mapping-snapshots'


def inventory():
    return tools.read_yaml((PINS / tools.INVENTORY).read_text(encoding='utf-8'), tools.INVENTORY)


def matrix():
    return tools.read_yaml((PINS / tools.MATRIX).read_text(encoding='utf-8'), tools.MATRIX)


class PinnedBytes(unittest.TestCase):
    def test_every_pin_matches_its_recorded_digest(self):
        provenance = tools.load_provenance()
        errors = []
        for name in provenance['files']:
            self.assertTrue(tools.pinned(name, provenance, errors) != '', name)
        self.assertEqual(errors, [])

    def test_a_tampered_pin_is_reported(self):
        provenance = tools.load_provenance()
        provenance['files'][tools.INVENTORY]['sha256'] = '0' * 64
        errors = []
        self.assertEqual(tools.pinned(tools.INVENTORY, provenance, errors), '')
        self.assertTrue(any('no longer match' in error for error in errors), errors)


class YamlSubset(unittest.TestCase):
    """The reader is deliberately narrow; these are the shapes it must survive."""

    def test_root_counts_and_dispositions(self):
        data = inventory()
        self.assertEqual(len(data['entries']), 24)
        self.assertEqual(len(data['context_entries']), 4)
        self.assertEqual(tools.totals(data), {'conditional': 9, 'unsupported': 15, 'context': 4, 'root': 24})

    def test_empty_flow_sequence_reads_as_empty_list(self):
        entry = next(item for item in inventory()['entries'] if item['kind'] == 'unsupported')
        self.assertEqual(entry['terms'], [])

    def test_folded_scalar_is_joined(self):
        self.assertIn('nested details', inventory()['coverage'])

    def test_hyphenated_keys_and_nested_sequences(self):
        targets = matrix()['targets']
        self.assertIn('dcmi-qualified', targets)
        self.assertTrue(targets['dcmi-qualified']['reference'].startswith('https://'))
        self.assertTrue(matrix()['header_types']['FHT']['blocking_issues'][0].startswith('https://'))

    def test_quoted_scalar_keeps_its_literal_value(self):
        self.assertEqual(inventory()['source_schema_version'], '2.0')

    def test_unsupported_shape_raises_instead_of_guessing(self):
        with self.assertRaises(ValueError):
            tools.read_yaml('anchors: &a one\n  - broken: [unclosed\n', 'shape.yml')


class SemanticGuards(unittest.TestCase):
    def test_clean_pins_validate(self):
        errors = []
        tools.validate(inventory(), matrix(), errors)
        self.assertEqual(errors, [])

    def test_a_new_disposition_is_rejected(self):
        data = inventory()
        data['entries'][0]['kind'] = 'exact'
        errors = []
        tools.validate(data, matrix(), errors)
        self.assertTrue(any('unknown here' in error or 'unknown' in error for error in errors), errors)

    def test_an_invented_target_row_is_rejected(self):
        data = matrix()
        data['targets']['datacite']['status'] = 'shipped'
        errors = []
        tools.validate(inventory(), data, errors)
        self.assertTrue(any('datacite' in error for error in errors), errors)

    def test_conditional_without_a_term_is_rejected(self):
        data = inventory()
        conditional = next(item for item in data['entries'] if item['kind'] == 'conditional')
        conditional['terms'] = []
        errors = []
        tools.validate(data, matrix(), errors)
        self.assertTrue(any('conditional but names no target term' in error for error in errors), errors)

    def test_a_repinned_source_schema_rejects_the_page_instead_of_rerendering(self):
        data = inventory()
        data['source_schema'] = 'https://w3id.org/fair-bioheaders/fhp/v0.6.0'
        errors = []
        tools.validate(data, matrix(), errors)
        self.assertTrue(any('re-scoped' in error for error in errors), errors)


class GeneratedFragment(unittest.TestCase):
    def test_committed_fragment_equals_the_pinned_bytes(self):
        fragment, errors = tools.build()
        self.assertEqual(errors, [])
        committed = (ROOT / '_includes' / 'mappings' / 'v1-crosswalk.html').read_text(encoding='utf-8')
        self.assertEqual(committed, fragment)

    def test_fragment_carries_the_pinned_identity_and_vocabulary(self):
        fragment, _ = tools.build()
        digest = tools.sha256_bytes((PINS / tools.INVENTORY).read_bytes())
        self.assertIn(f'data-mapping-sha256="{digest}"', fragment)
        self.assertIn('Not projected by mapping v1', fragment)
        self.assertIn('0.1.0-draft.1', fragment)
        self.assertIn('withheld', fragment)

    def test_fragment_never_claims_the_withheld_label_or_an_exporter(self):
        fragment, _ = tools.build()
        lowered = fragment.lower()
        for phrase in tools.FORBIDDEN:
            self.assertNotIn(phrase, lowered, phrase)

    def test_every_root_field_and_context_key_appears(self):
        fragment, _ = tools.build()
        for entry in inventory()['entries']:
            self.assertIn(f'<code>{entry["path"][1:]}</code>', fragment, entry['path'])
        for entry in inventory()['context_entries']:
            self.assertIn(f'<code>{entry["path"][1:]}</code>', fragment, entry['path'])

    def test_check_command_passes_on_the_committed_tree(self):
        result = subprocess.run([sys.executable, str(ROOT / 'scripts' / 'mapping_crosswalk.py'), '--check'],
                                capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class ProvenanceRecord(unittest.TestCase):
    def test_every_pin_names_a_commit_a_url_and_a_digest(self):
        provenance = json.loads((PINS / 'provenance.json').read_text(encoding='utf-8'))
        for name, meta in provenance['files'].items():
            with self.subTest(name=name):
                self.assertRegex(meta['commit'], r'^[0-9a-f]{40}$')
                self.assertTrue(meta['fetchUrl'].startswith('https://raw.githubusercontent.com/'))
                self.assertIn(meta['commit'], meta['fetchUrl'])
                self.assertRegex(meta['sha256'], r'^[0-9a-f]{64}$')
                self.assertRegex(meta['retrieved'], r'^\d{4}-\d{2}-\d{2}$')

    def test_the_adoption_record_states_the_withheld_label(self):
        provenance = json.loads((PINS / 'provenance.json').read_text(encoding='utf-8'))
        self.assertIn('withheld', provenance['adoption']['label'])
        self.assertEqual(provenance['adoption']['profileVersion'], inventory()['profile_version'])
        self.assertEqual(provenance['adoption']['upstreamStatus'], inventory()['status'])


if __name__ == '__main__':
    unittest.main()
