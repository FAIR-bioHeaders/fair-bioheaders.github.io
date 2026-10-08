"""Regression coverage for the documented MathJax opt-in and runtime checks."""
import unittest

from check_site import (
    Page,
    feed_errors,
    jsonld_container_errors,
    mathjax_errors,
    publication_itemlist_errors,
    reference_errors,
    MATHJAX_INTEGRITY,
)

PINNED_SCRIPT = f'<script integrity="{MATHJAX_INTEGRITY}" crossorigin="anonymous" id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"></script>'
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

    def test_missing_integrity_is_rejected(self):
        script = PINNED_SCRIPT.replace(f' integrity="{MATHJAX_INTEGRITY}"', '')
        self.assertTrue(mathjax_errors(Page(OPT_IN + script)))

    def test_wrong_integrity_is_rejected(self):
        self.assertTrue(mathjax_errors(Page(OPT_IN + PINNED_SCRIPT.replace(MATHJAX_INTEGRITY, 'sha384-wrong'))))

    def test_missing_cors_is_rejected(self):
        self.assertTrue(mathjax_errors(Page(OPT_IN + PINNED_SCRIPT.replace(' crossorigin="anonymous"', ''))))

    def test_prose_mention_is_not_a_runtime_script(self):
        self.assertEqual(mathjax_errors(Page('<p>The MathJax-script is optional.</p>')), [])


REFERENCE = (
    '<div class="reference" id="Wright2024" itemscope itemtype="https://schema.org/ScholarlyArticle">'
    '<meta itemprop="name" content="Title">'
    '<span itemprop="author" itemscope itemtype="https://schema.org/Person">'
    '<meta itemprop="givenName" content="Adam"><meta itemprop="familyName" content="Wright"></span>'
    '<span itemprop="identifier" itemscope itemtype="https://schema.org/PropertyValue">'
    '<meta itemprop="propertyID" content="DOI"><meta itemprop="value" content="10.1/x"></span>'
    '<meta itemprop="datePublished" content="2024">'
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

    def test_article_without_date_is_reported(self):
        bad = REFERENCE.replace('<meta itemprop="datePublished" content="2024">', '')
        self.assertTrue(reference_errors('index.html', bad, Page(bad)))

    def test_issue_number_requires_publication_issue(self):
        bad = REFERENCE.replace(
            '<meta itemprop="datePublished" content="2024">',
            '<meta itemprop="issueNumber" content="3">'
            '<span itemprop="isPartOf" itemscope itemtype="https://schema.org/Periodical">'
            '<meta itemprop="name" content="J"></span>'
            '<meta itemprop="datePublished" content="2024">')
        self.assertTrue(any('PublicationIssue' in e for e in reference_errors('index.html', bad, Page(bad))))

    def test_valid_volume_issue_hierarchy_passes(self):
        node = (
            '<div class="reference" id="a" itemscope itemtype="https://schema.org/ScholarlyArticle">'
            '<meta itemprop="name" content="T">'
            '<span itemprop="author" itemscope itemtype="https://schema.org/Person">'
            '<meta itemprop="givenName" content="A"><meta itemprop="familyName" content="B"></span>'
            '<span itemprop="identifier" itemscope itemtype="https://schema.org/PropertyValue">'
            '<meta itemprop="propertyID" content="DOI"><meta itemprop="value" content="10.1/x"></span>'
            '<meta itemprop="datePublished" content="2024">'
            '<span itemprop="isPartOf" itemscope itemtype="https://schema.org/PublicationIssue">'
            '<meta itemprop="issueNumber" content="3">'
            '<span itemprop="isPartOf" itemscope itemtype="https://schema.org/PublicationVolume">'
            '<meta itemprop="volumeNumber" content="25">'
            '<span itemprop="isPartOf" itemscope itemtype="https://schema.org/Periodical">'
            '<meta itemprop="name" content="J"></span></span></span>'
            '<button class="cite-button" data-cite-key="a">Cite</button>'
            '<div class="cite-panel" data-cite-panel="a" hidden>'
            '<pre data-cite-output="a"></pre>'
            '<button class="cite-copy" data-cite-copy="a">Copy BibTeX</button>'
            '</div></div>'
        )
        self.assertEqual(reference_errors('index.html', node, Page(node)), [])

    def test_volume_only_hierarchy_passes(self):
        hierarchy = (
            '<span itemprop="isPartOf" itemscope itemtype="https://schema.org/PublicationVolume">'
            '<meta itemprop="volumeNumber" content="2026">'
            '<span itemprop="isPartOf" itemscope itemtype="https://schema.org/Periodical">'
            '<meta itemprop="name" content="Database"></span></span>'
        )
        node = REFERENCE.replace(
            '<meta itemprop="datePublished" content="2024">',
            '<meta itemprop="datePublished" content="2024">' + hierarchy,
        )
        self.assertEqual(reference_errors('index.html', node, Page(node)), [])

    def test_misplaced_issue_number_does_not_pass_with_empty_issue_scope(self):
        hierarchy = (
            '<span itemprop="isPartOf" itemscope itemtype="https://schema.org/Periodical">'
            '<meta itemprop="issueNumber" content="3"><meta itemprop="name" content="J"></span>'
            '<span itemprop="other" itemscope itemtype="https://schema.org/PublicationIssue"></span>'
        )
        node = REFERENCE.replace(
            '<meta itemprop="datePublished" content="2024">',
            '<meta itemprop="datePublished" content="2024">' + hierarchy,
        )
        errors = reference_errors('index.html', node, Page(node))
        self.assertTrue(any('container hierarchy' in error for error in errors))
        self.assertTrue(any('issueNumber must belong' in error for error in errors))


class ItemListChecks(unittest.TestCase):
    def test_exact_ordered_urls_pass(self):
        urls = ['https://fair-bioheaders.github.io/publication/a',
                'https://fair-bioheaders.github.io/publication/b']
        item_list = {'itemListElement': [
            {'item': {'url': url}} for url in urls
        ]}
        self.assertEqual(publication_itemlist_errors(item_list, urls), [])

    def test_duplicate_item_url_is_reported(self):
        duplicate = 'https://fair-bioheaders.github.io/publication/a'
        item_list = {'itemListElement': [
            {'item': {'url': duplicate}}, {'item': {'url': duplicate}}
        ]}
        errors = publication_itemlist_errors(
            item_list,
            [duplicate, 'https://fair-bioheaders.github.io/publication/b'],
        )
        self.assertTrue(any('duplicate' in error for error in errors))
        self.assertTrue(any('order do not match' in error for error in errors))

    def test_wrong_order_is_reported(self):
        urls = ['https://fair-bioheaders.github.io/publication/a',
                'https://fair-bioheaders.github.io/publication/b']
        item_list = {'itemListElement': [
            {'item': {'url': urls[1]}}, {'item': {'url': urls[0]}}
        ]}
        self.assertTrue(publication_itemlist_errors(item_list, urls))


class JsonLdHierarchyChecks(unittest.TestCase):
    def test_volume_only_hierarchy_passes(self):
        article = {'isPartOf': {
            '@type': 'PublicationVolume',
            'volumeNumber': '2026',
            'isPartOf': {'@type': 'Periodical', 'name': 'Database'},
        }}
        self.assertEqual(jsonld_container_errors(article, 'publication/x'), [])

    def test_volume_only_rejects_an_empty_issue(self):
        article = {'isPartOf': {
            '@type': 'PublicationIssue',
            'isPartOf': {
                '@type': 'PublicationVolume',
                'volumeNumber': '2026',
                'isPartOf': {'@type': 'Periodical', 'name': 'Database'},
            },
        }}
        self.assertTrue(jsonld_container_errors(article, 'publication/x'))


class FeedChecks(unittest.TestCase):
    FEED_URL = 'https://fair-bioheaders.github.io/publications/feed.xml'
    ENTRY_URL = 'https://fair-bioheaders.github.io/publication/x'
    ENTRY_DATE = '2026-01-01T00:00:00+00:00'

    def write_feed(self, feed):
        import tempfile
        from pathlib import Path
        directory = tempfile.TemporaryDirectory()
        path = Path(directory.name) / 'feed.xml'
        path.write_text(feed)
        self.addCleanup(directory.cleanup)
        return path

    def valid_feed(self, entry=ENTRY_URL, published=ENTRY_DATE, updated=ENTRY_DATE,
                   self_url=FEED_URL, feed_updated=ENTRY_DATE):
        return (
            '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">'
            f'<link rel="self" href="{self_url}"/>'
            f'<updated>{feed_updated}</updated>'
            f'<entry><id>{entry}</id><published>{published}</published>'
            f'<updated>{updated}</updated>'
            f'<link rel="alternate" href="{self.ENTRY_URL}"/>'
            '<link href="https://doi.org/10.1/x"/></entry></feed>'
        )

    def test_valid_feed_passes(self):
        path = self.write_feed(self.valid_feed())
        expected = {self.ENTRY_URL: self.ENTRY_DATE}
        self.assertEqual(feed_errors(path, self.FEED_URL, expected), [])

    def test_entry_outside_origin_is_reported(self):
        path = self.write_feed(self.valid_feed(entry='https://evil.example/x'))
        self.assertTrue(feed_errors(
            path, self.FEED_URL, {self.ENTRY_URL: self.ENTRY_DATE}
        ))

    def test_missing_publication_entry_is_reported(self):
        feed = self.valid_feed().replace(
            f'<entry><id>{self.ENTRY_URL}</id><published>{self.ENTRY_DATE}</published>'
            f'<updated>{self.ENTRY_DATE}</updated><link rel="alternate" href="{self.ENTRY_URL}"/>'
            '<link href="https://doi.org/10.1/x"/></entry>',
            '',
        )
        path = self.write_feed(feed)
        self.assertTrue(feed_errors(
            path, self.FEED_URL, {self.ENTRY_URL: self.ENTRY_DATE}
        ))

    def test_noncanonical_self_link_is_reported(self):
        path = self.write_feed(self.valid_feed(
            self_url=self.FEED_URL + '-old',
        ))
        self.assertTrue(feed_errors(
            path, self.FEED_URL, {self.ENTRY_URL: self.ENTRY_DATE}
        ))

    def test_missing_or_malformed_feed_timestamp_is_reported(self):
        path = self.write_feed(self.valid_feed(feed_updated='not-a-date'))
        errors = feed_errors(path, self.FEED_URL, {self.ENTRY_URL: self.ENTRY_DATE})
        self.assertTrue(any('feed has missing or invalid updated' in error for error in errors))

    def test_malformed_entry_timestamp_is_reported(self):
        path = self.write_feed(self.valid_feed(updated=''))
        errors = feed_errors(path, self.FEED_URL, {self.ENTRY_URL: self.ENTRY_DATE})
        self.assertTrue(any('invalid updated timestamp' in error for error in errors))

    def test_entry_date_must_match_publication(self):
        path = self.write_feed(self.valid_feed(published='2026-01-02T00:00:00+00:00'))
        errors = feed_errors(path, self.FEED_URL, {self.ENTRY_URL: self.ENTRY_DATE})
        self.assertTrue(any('does not match publication date' in error for error in errors))


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
