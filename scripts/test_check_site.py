"""Regression coverage for the documented MathJax opt-in and runtime checks."""
import unittest

from check_site import Page, mathjax_errors

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


if __name__ == '__main__':
    unittest.main()
