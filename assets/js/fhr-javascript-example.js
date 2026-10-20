/* FHR JavaScript teaching example; MPL-2.0.
 * Reads only the explicit typed span/container layout shown in the guide.
 * This is not a general HTML microdata parser or a schema validator.
 */
(function () {
  'use strict';
  function readMicrodata(root) {
    const itemtype = 'https://raw.githubusercontent.com/FAIR-bioHeaders/FHR-Specification/main/fhr.json';
    if (!root || !root.hasAttribute('itemscope') || root.getAttribute('itemtype') !== itemtype) {
      throw new Error('Choose the FHR example scope.');
    }
    let count = 0;
    let chars = 0;
    function read(node, depth) {
      if (++count > 3000 || depth > 12) throw new Error('Example is too complex.');
      if (node.hasAttribute('itemref')) throw new Error('itemref is outside this example.');
      const kind = node === root ? 'object' : node.dataset.fhrType;
      if (kind === 'object' || kind === 'array') {
        const result = kind === 'array' ? [] : Object.create(null);
        for (const child of node.children) {
          const key = child.getAttribute('itemprop');
          if (!key || /\s/.test(key)) throw new Error('Use one itemprop per direct child.');
          if (kind === 'array') {
            if (key !== 'item') throw new Error('Array children must use itemprop="item".');
            result.push(read(child, depth + 1));
          } else {
            if (Object.hasOwn(result, key)) throw new Error('Repeated scalar/object property: ' + key);
            result[key] = read(child, depth + 1);
          }
        }
        return result;
      }
      if (node.tagName !== 'SPAN' || node.children.length) throw new Error('Use leaf spans for example values.');
      const text = node.textContent;
      chars += text.length;
      if (chars > 262144) throw new Error('Example values are too large.');
      if (kind === 'string') return text;
      if (kind === 'number' || kind === 'integer') {
        if (!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(text)) throw new Error('Invalid example number.');
        const value = Number(text);
        if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
            (value === 0 && /[1-9]/.test(text.split(/[eE]/)[0])) ||
            (kind === 'integer' && !Number.isInteger(value))) throw new Error('Unsafe example number.');
        return value;
      }
      if (kind === 'boolean' && (text === 'true' || text === 'false')) return text === 'true';
      if (kind === 'null' && text === 'null') return null;
      throw new Error('Unsupported example value type.');
    }
    // The record scope is an object; read its own properties, not every descendant.
    return read(root, 0);
  }
  window.FhrExamples = Object.freeze({ readMicrodata });
}());
