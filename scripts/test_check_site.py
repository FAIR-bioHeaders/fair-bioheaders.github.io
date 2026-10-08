"""Regression coverage for the documented MathJax opt-in and runtime checks."""
import unittest

from check_site import Page, mathjax_errors, reference_errors

PINNED_SCRIPT = '<script id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"></script>'
OPT_IN = '<meta name="fhr:math" content="true">'


class MathJaxChecks(unittest.TestCase):
    def test_ordinary_page_does_not_need_mathjax(self):
        self.assertEqual(mathjax_errors(Page('<p>No mathematical notation.</p>')), [])

    def test_documented_opt_in_is_allowed(self):
        self.assertEqual(mathjax_errors(Page(OPT_IN + PINNED_SCRIPT)), [])

    def test_mathjax_without_opt_in_is_rejected(self):
        self.assertTrue(mathjax_errors(Page(PINNED_SCRIPT)))

    def test_missing_mathjax_on_opted_in_page_is_rejected(self):
        self.assertTrue(mathjax_errors(Page(OPT_IN)))

    def test_unpinned_script_is_rejected(self):
        script = PINNED_SCRIPT.replace('@3.2.2/', '@latest/')
        self.assertTrue(mathjax_errors(Page(OPT_IN + script)))

    def test_duplicate_script_is_rejected(self):
        self.assertTrue(mathjax_errors(Page(OPT_IN + PINNED_SCRIPT * 2)))

    def test_script_without_standard_id_still_requires_opt_in(self):
        self.assertTrue(mathjax_errors(Page(PINNED_SCRIPT.replace(' id="MathJax-script"', ''))))

    def test_prose_mention_is_not_a_runtime_script(self):
        self.assertEqual(mathjax_errors(Page('<p>The MathJax-script is optional.</p>')), [])


REFERENCE = (
    '<div class="reference" id="Wright2024" itemscope itemtype="https://schema.org/ScholarlyArticle">'
    '<meta itemprop="name" content="Title">'
    '<span itemprop="author" itemscope itemtype="https://schema.org/Person">'
    '<meta itemprop="givenName" content="Adam"><meta itemprop="familyName" content="Wright"></span>'
    '<span itemprop="identifier" itemscope itemtype="https://schema.org/PropertyValue">'
    '<meta itemprop="propertyID" content="DOI"><meta itemprop="value" content="10.1/x"></span>'
    '<button class="cite-button" data-cite-key="Wright2024">Cite</button>'
    '<div class="cite-panel" data-cite-panel="Wright2024" hidden>'
    '<pre data-cite-output="Wright2024"></pre>'
    '<button class="cite-copy" data-cite-copy="Wright2024">Copy BibTeX</button>'
    '</div>'
    '</div>'
)


class ReferenceChecks(unittest.TestCase):
    def test_valid_reference_passes(self):
        page = Page(REFERENCE)
        self.assertEqual(reference_errors('index.html', REFERENCE, page), [])

    def test_missing_itemtype_is_reported(self):
        bad = REFERENCE.replace(' itemscope itemtype="https://schema.org/ScholarlyArticle"', '')
        self.assertTrue(reference_errors('index.html', bad, Page(bad)))

    def test_missing_doi_and_repository_is_reported(self):
        bad = REFERENCE.replace('<meta itemprop="propertyID" content="DOI"><meta itemprop="value" content="10.1/x">', '')
        self.assertTrue(reference_errors('index.html', bad, Page(bad)))

    def test_repository_reference_without_doi_passes(self):
        repo = (
            '<div class="reference" id="repo" itemscope itemtype="https://schema.org/SoftwareSourceCode">'
            '<meta itemprop="name" content="Tool">'
            '<span itemprop="author" itemscope itemtype="https://schema.org/Person">'
            '<meta itemprop="givenName" content="A"><meta itemprop="familyName" content="B"></span>'
            '<meta itemprop="codeRepository" content="https://example.org/repo">'
            '<button class="cite-button" data-cite-key="repo">Cite</button>'
            '<div class="cite-panel" data-cite-panel="repo" hidden>'
            '<pre data-cite-output="repo"></pre>'
            '<button class="cite-copy" data-cite-copy="repo">Copy BibTeX</button>'
            '</div></div>'
        )
        self.assertEqual(reference_errors('index.html', repo, Page(repo)), [])

    def test_mismatched_cite_output_is_reported(self):
        bad = REFERENCE.replace('<pre data-cite-output="Wright2024"></pre>', '')
        self.assertTrue(reference_errors('index.html', bad, Page(bad)))

    def test_missing_copy_button_is_reported(self):
        bad = REFERENCE.replace('<button class="cite-copy" data-cite-copy="Wright2024">Copy BibTeX</button>', '')
        self.assertTrue(reference_errors('index.html', bad, Page(bad)))

    def test_nested_panel_does_not_break_reference_scan(self):
        # The citation panel is a nested div; both references must still parse.
        two = REFERENCE + REFERENCE.replace('Wright2024', 'Cannon2025')
        self.assertEqual(reference_errors('index.html', two, Page(two)), [])


class ElementIDChecks(unittest.TestCase):
    def test_duplicate_ids_are_detected(self):
        self.assertEqual(Page('<div id="a"></div><pre id="a"></pre>').duplicate_ids, {'a'})

    def test_distinct_ids_are_allowed(self):
        self.assertEqual(Page('<div id="a"></div><pre id="b"></pre>').duplicate_ids, set())


class IconFontChecks(unittest.TestCase):
    def test_plain_italic_is_allowed(self):
        self.assertEqual(Page('<i>emphasis</i>').icons, [])

    def test_font_awesome_markup_is_detected(self):
        for markup in ('<i class="fa fa-clock-o"></i>',
                       '<i class="fas fa-calendar"></i>',
                       '<i class="fab fa-github"></i>',
                       '<i class="far fa-star"></i>'):
            self.assertTrue(Page(markup).icons, markup)

    def test_icons_on_other_elements_are_detected(self):
        for markup in ('<span class="fa fa-calendar"></span>',
                       '<span class="fa-calendar"></span>'):
            self.assertTrue(Page(markup).icons, markup)

    def test_unrelated_class_containing_fa_is_allowed(self):
        self.assertEqual(Page('<i class="factual"></i>').icons, [])


if __name__ == '__main__':
    unittest.main()
