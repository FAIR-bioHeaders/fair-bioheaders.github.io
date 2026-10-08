/* ==========================================================================
   Citation buttons
   Reads Schema.org microdata from each .reference block (rendered by
   _includes/reference.html) and generates a BibTeX entry on demand, so the
   microdata is the single source of truth for the citation.
   ========================================================================== */

(function () {
  'use strict';

  var VALUE_ATTRS = { META: 'content', LINK: 'href', A: 'href', TIME: 'datetime', IMG: 'src' };
  var TYPE_MAP = {
    'https://schema.org/ScholarlyArticle': 'article',
    'https://schema.org/Book': 'book',
    'https://schema.org/SoftwareSourceCode': 'software',
    'https://schema.org/Dataset': 'dataset',
    'https://schema.org/CreativeWork': 'misc'
  };

  function add(props, name, value) {
    if (props[name] === undefined) {
      props[name] = value;
    } else if (Array.isArray(props[name])) {
      props[name].push(value);
    } else {
      props[name] = [props[name], value];
    }
  }

  function valueOf(el) {
    var attr = VALUE_ATTRS[el.tagName];
    if (attr && el.hasAttribute(attr)) {
      return el.getAttribute(attr);
    }
    return (el.textContent || '').trim();
  }

  function parseItem(el) {
    var item = { types: (el.getAttribute('itemtype') || '').split(/\s+/).filter(Boolean), props: {} };
    var children = el.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var names = (child.getAttribute('itemprop') || '').split(/\s+/).filter(Boolean);
      if (child.hasAttribute('itemscope')) {
        var nested = parseItem(child);
        for (var n = 0; n < names.length; n++) {
          add(item.props, names[n], nested);
        }
      } else {
        var value = valueOf(child);
        for (var m = 0; m < names.length; m++) {
          add(item.props, names[m], value);
        }
        var deeper = parseItem(child).props;
        Object.keys(deeper).forEach(function (key) {
          add(item.props, key, deeper[key]);
        });
      }
    }
    return item;
  }

  function first(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  function toItems(value) {
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  }

  function propsOf(value) {
    var item = first(value);
    return item && item.props ? item.props : {};
  }

  function text(value) {
    var item = first(value);
    if (item === undefined) return '';
    if (item && item.props) {
      return text(item.props.name) || text(item.props.headline);
    }
    return String(item).trim();
  }

  function authors(value) {
    return toItems(value).map(function (author) {
      var p = author.props || {};
      var family = text(p.familyName);
      var given = text(p.givenName);
      if (family || given) {
        return family + ', ' + given;
      }
      return text(p.name);
    }).filter(Boolean).join(' and ');
  }

  function doi(value) {
    var items = toItems(value);
    for (var i = 0; i < items.length; i++) {
      var p = items[i] && items[i].props;
      if (p && text(p.value)) return text(p.value);
    }
    return '';
  }

  function pages(p) {
    if (p.pageStart && p.pageEnd) return text(p.pageStart) + '-' + text(p.pageEnd);
    return text(p.pagination);
  }

  function escapeBraces(value) {
    return String(value).replace(/([{}])/g, '\\$1');
  }

  function bibtex(key, item) {
    var p = item.props;
    var fields = [
      ['author', authors(p.author)],
      ['title', text(p.name) || text(p.headline)],
      ['journal', text(propsOf(p.isPartOf).name)],
      ['year', text(p.datePublished)],
      ['volume', text(propsOf(p.isPartOf).volumeNumber)],
      ['number', text(propsOf(p.isPartOf).issueNumber)],
      ['pages', pages(p)],
      ['publisher', text(propsOf(p.publisher).name)],
      ['doi', doi(p.identifier)],
      ['url', text(p.url)]
    ];
    var type = TYPE_MAP[item.types[0]] || 'misc';
    var lines = ['@' + type + '{' + key + ','];
    fields.forEach(function (pair) {
      if (pair[1]) {
        lines.push('  ' + pair[0] + ' = {' + escapeBraces(pair[1]) + '},');
      }
    });
    if (lines.length > 1) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
    }
    lines.push('}');
    return lines.join('\n');
  }

  function entryFor(key) {
    var reference = document.getElementById(key);
    if (!reference) return '';
    return bibtex(key, parseItem(reference));
  }

  function toggle(button) {
    var key = button.getAttribute('data-cite-key');
    var panel = document.querySelector('[data-cite-panel="' + key + '"]');
    var output = document.querySelector('[data-cite-output="' + key + '"]');
    if (!panel || !output) return;
    if (!output.dataset.filled) {
      output.textContent = entryFor(key);
      output.dataset.filled = 'true';
    }
    var hidden = panel.hasAttribute('hidden');
    if (hidden) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
    button.setAttribute('aria-expanded', String(hidden));
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function copy(button) {
    var key = button.getAttribute('data-cite-copy');
    var output = document.querySelector('[data-cite-output="' + key + '"]');
    var text = output && output.textContent ? output.textContent : entryFor(key);
    var original = button.textContent;
    function done(ok) {
      button.textContent = ok ? 'Copied' : 'Copy failed';
      button.classList.toggle('cite-copy--done', ok);
      window.setTimeout(function () {
        button.textContent = original;
        button.classList.remove('cite-copy--done');
      }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        done(true);
      }, function () {
        done(fallbackCopy(text));
      });
    } else {
      done(fallbackCopy(text));
    }
  }

  function init() {
    var buttons = document.querySelectorAll('.cite-button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        toggle(this);
      });
    }
    var copies = document.querySelectorAll('.cite-copy');
    for (var j = 0; j < copies.length; j++) {
      copies[j].addEventListener('click', function () {
        copy(this);
      });
    }
  }

  if (typeof document !== 'undefined' && typeof module === 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseItem: parseItem, bibtex: bibtex };
  }
}());
