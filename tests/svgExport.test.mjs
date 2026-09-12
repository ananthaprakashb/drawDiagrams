import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { serializeDiagramSvg } from '../src/svgExport.ts';

test('HTML line breaks in Mermaid labels export as well-formed SVG', () => {
  const { window } = new JSDOM('<div id="preview"></div>');
  const raw = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" role="img">' +
    '<title>Service path</title><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">' +
    '<p>Apply<br>Get help &amp; follow up</p></div></foreignObject></svg>';
  const parser = new window.DOMParser();
  assert.ok(parser.parseFromString(raw, 'image/svg+xml').querySelector('parsererror'));

  window.document.getElementById('preview').innerHTML = raw;
  globalThis.XMLSerializer = window.XMLSerializer;
  globalThis.DOMParser = window.DOMParser;

  const { serialized, root } = serializeDiagramSvg(window.document.querySelector('svg'));
  assert.equal(root.localName, 'svg');
  assert.equal(root.getAttribute('viewBox'), '0 0 300 100');
  assert.equal(root.querySelector('title').textContent, 'Service path');
  assert.equal(root.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'br').length, 1);
  assert.equal(parser.parseFromString(serialized, 'image/svg+xml').querySelector('parsererror'), null);
});
