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

test('PNG SVG removes HTML labels without losing journey text or altering the preview', () => {
  const { window } = new JSDOM('<div id="preview"></div>');
  window.document.getElementById('preview').innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">' +
    '<switch><foreignObject x="0" y="0" width="100" height="30">' +
    '<div xmlns="http://www.w3.org/1999/xhtml">Journey</div></foreignObject>' +
    '<text x="50" y="15">Journey</text></switch>' +
    '<foreignObject x="110" y="0" width="120" height="40">' +
    '<div xmlns="http://www.w3.org/1999/xhtml"><span>Apply<br>Follow up</span></div>' +
    '</foreignObject></svg>';
  globalThis.XMLSerializer = window.XMLSerializer;
  globalThis.DOMParser = window.DOMParser;
  globalThis.window = window;
  globalThis.document = window.document;

  const preview = window.document.querySelector('svg');
  Object.defineProperty(preview.querySelectorAll('foreignObject > div')[1], 'innerText', { value: 'Apply\nFollow up' });
  const { serialized, root } = serializeDiagramSvg(preview, { rasterSafe: true });
  assert.equal(root.querySelectorAll('foreignObject').length, 0);
  assert.equal(root.querySelectorAll('text').length, 2);
  assert.equal(root.querySelectorAll('tspan').length, 2);
  assert.match(root.textContent, /Journey/);
  assert.match(root.textContent, /Follow up/);
  assert.equal(new window.DOMParser().parseFromString(serialized, 'image/svg+xml').querySelector('parsererror'), null);
  assert.equal(preview.querySelectorAll('foreignObject').length, 2);
});
