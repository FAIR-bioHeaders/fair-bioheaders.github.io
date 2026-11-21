"""Structural parity for the website's pinned native model producer, not K1-K6."""
import copy
import json
from pathlib import Path
import subprocess
import unittest
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent.parent


class NativeModelStructure(unittest.TestCase):
    def test_native_constraints_match_reference(self):
        schema = json.loads((ROOT / 'assets/schema/fhgm-0.1.json').read_text())
        valid = {'modelId': 'example:model', 'modelVersion': 'opaque-v1',
                 'featureId': 'gene-1', 'reference': {'genomeReference': {
                     'accession': 'EXAMPLE_1', 'seqcol_id': 'A' * 32}}}
        records = [valid]
        for key in schema['required']:
            record = copy.deepcopy(valid)
            del record[key]
            records.append(record)
        for field, value in [
            ('reference', {}), ('methods', {}), ('publication', {}),
            ('contributors', []), ('evidence', []), ('modelId', ''),
            ('modelId', '\x85model'), ('modelId', '\x1cmodel'),
            ('modelId', 'model\x85'), ('modelId', 'model\u200b'),
            ('modelId', '\ufeffmodel'), ('modelId', 'α-model'),
            ('schemaVersion', '0.1'), ('schema', 'https://example.org'),
            ('methods', {'protocol': 'javascript:alert(1)'}),
            ('methods', {'protocol': 'https://example.org/protocol'}),
            ('methods', {'limitations': ['Synthetic limitation']}),
            ('publication', {'article': '10.1234/example', 'deposit': ['example:model']}),
            ('contributors', [{'name': 'Example', 'role': 'annotation', 'nameType': 'Other'}]),
            ('contributors', [{'name': 'Example', 'role': 'annotation', 'uri': 'https://orcid.org/0000-0002-1825-0097'}]),
            ('evidence', [{'description': 'Synthetic evidence', 'uri': 'ftp://example.org/e'}]),
            ('predecessor', {'annotationChecksum': 'A' * 43 + '=', 'modelId': 'different', 'modelVersion': 'old'}),
        ]:
            records.append({**copy.deepcopy(valid), field: value})
        reference = Draft202012Validator(schema, format_checker=FormatChecker())
        expected = [reference.is_valid(record) for record in records]
        script = "const fs=require('fs'), b=require('./assets/js/fhgm-builder.js'); const s=JSON.parse(fs.readFileSync('./assets/schema/fhgm-0.1.json')); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(r=>b.validate(r,s).length===0)));"
        result = subprocess.run(['node', '-e', script], cwd=ROOT,
                                input=json.dumps(records), text=True,
                                capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout), expected)
