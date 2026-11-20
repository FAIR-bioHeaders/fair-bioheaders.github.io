"""Independent structural re-read of the published v0.7.0 FHT exports."""
import json
from pathlib import Path
import subprocess
import unittest
from test_builder_roundtrip import read_microdata, load_builder_yaml, typed_equal

ROOT = Path(__file__).resolve().parent.parent
ITEMTYPE = 'https://w3id.org/fair-bioheaders/fht/v0.7.0'


class FHTCandidateRoundTrips(unittest.TestCase):
    def test_seven_exports_keep_exact_values_types_arrays_and_own_identity(self):
        result = subprocess.run(['node', 'scripts/test_fht_builder_candidate.mjs', '--exports'],
                                cwd=ROOT, capture_output=True, text=True, check=True)
        records = json.loads(result.stdout)
        self.assertEqual(len(records), 7)
        for item in records:
            with self.subTest(item=item['name']):
                expected = {k: v for k, v in item['record'].items() if not k.startswith('x-')}
                typed_equal(expected, read_microdata(item['microdata'], ITEMTYPE), item['name'])
                typed_equal(item['record'], load_builder_yaml(item['yaml']), item['name'])
                self.assertEqual(item['status'], 'published-v0.7.0')


if __name__ == '__main__':
    unittest.main()
