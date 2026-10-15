"""Regressions for renamed resources without relabeling their DOI identity."""
import unittest

from check_site import resource_errors


BASE = 'https://github.com/FAIR-bioHeaders/'


def fixture():
    links = ''.join(f'<a href="{BASE}{name}">{name}</a>' for name in (
        'FAIR-bioHeaders-Specification', 'FAIR-bioHeaders-Tools',
        'FHR-Specification', 'FHT-Specification', 'FHP-Specification', 'FHGFF3'))
    entries = []
    for key, title, repository, doi in (
        ('FHR_Specification', 'FHR Specification', 'FAIR-bioHeaders-Specification',
         '10.5281/zenodo.6762549'),
        ('FHR_File_Converter', 'FHR File Converter', 'FAIR-bioHeaders-Tools',
         '10.5281/zenodo.6762547'),
    ):
        entries.append(f'''<div class="reference" id="{key}" itemscope itemtype="https://schema.org/Dataset">
<meta itemprop="name" content="{title}"><meta itemprop="url" content="{BASE}{repository}">
<span itemprop="identifier" itemscope itemtype="https://schema.org/PropertyValue">
<meta itemprop="propertyID" content="DOI"><meta itemprop="value" content="{doi}"></span>
<span itemprop="license" itemscope itemtype="https://schema.org/CreativeWork">
<meta itemprop="name" content="MPL-2.0"></span></div>''')
    return links + ''.join(entries)


class ResourceRoles(unittest.TestCase):
    def test_publication_and_development_links_coexist(self):
        self.assertEqual(resource_errors(fixture()), [])

    def test_legacy_converter_redirect_is_not_active_guidance(self):
        for name in ('FHR-File-Converter', 'FHT-File-Converter'):
            with self.subTest(name=name):
                errors = resource_errors(fixture() + f'<a href="{BASE}{name}">Old tool</a>')
                self.assertTrue(any('obsolete active converter' in e for e in errors))

    def test_development_name_cannot_replace_publication_identity(self):
        broken = fixture().replace(f'content="{BASE}FAIR-bioHeaders-Specification"',
                                   f'content="{BASE}FHR-Specification"')
        self.assertTrue(any('owning repository' in e for e in resource_errors(broken)))

    def test_display_rebrand_cannot_change_registered_title(self):
        broken = fixture().replace('content="FHR File Converter"',
                                   'content="FAIR BioHeaders Tools"')
        self.assertTrue(any('registered citation title' in e for e in resource_errors(broken)))

    def test_release_doi_cannot_silently_replace_concept_citation(self):
        broken = fixture().replace('6762549', '23376528')
        self.assertTrue(any('concept DOI identity' in e for e in resource_errors(broken)))

    def test_old_license_metadata_is_detected(self):
        broken = fixture().replace('MPL-2.0', 'PDDL-1.0')
        self.assertTrue(any('current license metadata' in e for e in resource_errors(broken)))
