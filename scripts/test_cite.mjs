// Minimal DOM stub so cite.js's parsers can be unit-tested without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

class Node {
  constructor(tagName, attrs = {}, children = [], text = '') {
    this.tagName = tagName.toUpperCase();
    this.attrs = attrs;
    this.children = children;
    this._text = text;
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name);
  }

  get textContent() {
    return this._text + this.children.map((c) => c.textContent).join('');
  }
}

globalThis.document = undefined;
const { parseItem, bibtex } = require('../assets/js/cite.js');

// Article -> PublicationIssue -> PublicationVolume -> Periodical, matching the
// rendered microdata hierarchy.
function article() {
  const person = (given, family) =>
    new Node('span', { itemprop: 'author', itemscope: '', itemtype: 'https://schema.org/Person' }, [
      new Node('meta', { itemprop: 'givenName', content: given }),
      new Node('meta', { itemprop: 'familyName', content: family })
    ]);
  return new Node('div', { id: 'smith2026quantum', itemscope: '', itemtype: 'https://schema.org/ScholarlyArticle' }, [
    new Node('meta', { itemprop: 'name', content: 'Advances in Quantum Computing' }),
    person('John', 'Smith'),
    person('Alice', 'Doe'),
    new Node('span', { itemprop: 'identifier', itemscope: '', itemtype: 'https://schema.org/PropertyValue' }, [
      new Node('meta', { itemprop: 'propertyID', content: 'DOI' }),
      new Node('meta', { itemprop: 'value', content: '10.1000/xyz123' })
    ]),
    new Node('meta', { itemprop: 'url', content: 'https://doi.org/10.1000/xyz123' }),
    new Node('span', { itemprop: 'isPartOf', itemscope: '', itemtype: 'https://schema.org/PublicationIssue' }, [
      new Node('meta', { itemprop: 'issueNumber', content: '3' }),
      new Node('span', { itemprop: 'isPartOf', itemscope: '', itemtype: 'https://schema.org/PublicationVolume' }, [
        new Node('meta', { itemprop: 'volumeNumber', content: '42' }),
        new Node('span', { itemprop: 'isPartOf', itemscope: '', itemtype: 'https://schema.org/Periodical' }, [
          new Node('meta', { itemprop: 'name', content: 'Journal of Technology' })
        ])
      ])
    ]),
    new Node('span', { itemprop: 'publisher', itemscope: '', itemtype: 'https://schema.org/Organization' }, [
      new Node('meta', { itemprop: 'name', content: 'Tech Press' })
    ]),
    new Node('meta', { itemprop: 'pageStart', content: '150' }),
    new Node('meta', { itemprop: 'pageEnd', content: '165' }),
    new Node('meta', { itemprop: 'datePublished', content: '2026' })
  ]);
}

test('generates an @article BibTeX entry from the container hierarchy', () => {
  const output = bibtex('smith2026quantum', parseItem(article()));
  assert.match(output, /^@article\{smith2026quantum,/);
  assert.match(output, /author = \{Smith, John and Doe, Alice\},/);
  assert.match(output, /title = \{Advances in Quantum Computing\},/);
  assert.match(output, /journal = \{Journal of Technology\},/);
  assert.match(output, /year = \{2026\},/);
  assert.match(output, /volume = \{42\},/);
  assert.match(output, /number = \{3\},/);
  assert.match(output, /pages = \{150-165\},/);
  assert.match(output, /publisher = \{Tech Press\},/);
  assert.match(output, /doi = \{10\.1000\/xyz123\},/);
  assert.doesNotMatch(output, /,\n\}/);
});

test('handles an article with only a Periodical (no volume/issue)', () => {
  const node = new Node('div', { itemscope: '', itemtype: 'https://schema.org/ScholarlyArticle' }, [
    new Node('meta', { itemprop: 'name', content: 'A note' }),
    new Node('span', { itemprop: 'isPartOf', itemscope: '', itemtype: 'https://schema.org/Periodical' }, [
      new Node('meta', { itemprop: 'name', content: 'Database' })
    ]),
    new Node('meta', { itemprop: 'datePublished', content: '2026' })
  ]);
  const output = bibtex('note', parseItem(node));
  assert.match(output, /journal = \{Database\},/);
  assert.doesNotMatch(output, /volume =/);
  assert.doesNotMatch(output, /number =/);
});

test('maps software to @software', () => {
  const node = new Node('div', { itemscope: '', itemtype: 'https://schema.org/SoftwareSourceCode' }, [
    new Node('meta', { itemprop: 'name', content: 'FHR File Converter' }),
    new Node('span', { itemprop: 'author', itemscope: '', itemtype: 'https://schema.org/Person' }, [
      new Node('meta', { itemprop: 'familyName', content: 'Molik' }),
      new Node('meta', { itemprop: 'givenName', content: 'David' })
    ]),
    new Node('meta', { itemprop: 'datePublished', content: '2024' })
  ]);
  const output = bibtex('FHR_File_Converter', parseItem(node));
  assert.match(output, /^@software\{FHR_File_Converter,/);
  assert.match(output, /author = \{Molik, David\},/);
});

test('escapes braces in field values', () => {
  const node = new Node('div', { itemscope: '', itemtype: 'https://schema.org/ScholarlyArticle' }, [
    new Node('meta', { itemprop: 'name', content: 'A {curly} title' })
  ]);
  const output = bibtex('x', parseItem(node));
  assert.match(output, /title = \{A \\\{curly\\\} title\}/);
});
