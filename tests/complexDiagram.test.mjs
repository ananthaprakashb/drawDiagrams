import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { prepareMermaidSource } from '../src/mermaidLabels.ts';
import { serializeDiagramSvg } from '../src/svgExport.ts';

test('BookNook flowchart renders all actors, subgraphs and links as exportable SVG', async () => {
  const source = await readFile(new URL('../src/examples/booknook.mmd', import.meta.url), 'utf8');
  const prepared = prepareMermaidSource(source);
  assert.match(prepared, /Admin -->\|is a\| Author/);
  assert.match(prepared, /👤 Guest User/);
  assert.doesNotMatch(prepared, /fa:fa-user|--\|>/);

  const { window } = new JSDOM('<!doctype html><body></body>');
  for (const name of ['window', 'document', 'CSSStyleSheet', 'Element', 'SVGElement', 'XMLSerializer', 'DOMParser']) {
    globalThis[name] = window[name];
  }
  // JSDOM does not lay out SVG text. Geometry is a stub; structure and labels
  // come from Mermaid's actual parser and renderer.
  window.SVGElement.prototype.getBBox = function () {
    return { x: 0, y: 0, width: Math.max(40, (this.textContent?.length ?? 1) * 8), height: 20 };
  };
  window.SVGElement.prototype.getComputedTextLength = function () {
    return (this.textContent?.length ?? 1) * 8;
  };
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', htmlLabels: false, theme: 'neutral' });
  const { svg } = await mermaid.render('booknook-regression', prepared);
  window.document.body.innerHTML = svg;
  const rendered = window.document.querySelector('svg');
  assert.equal(rendered.querySelectorAll('.node').length, 28);
  assert.equal(rendered.querySelectorAll('.cluster').length, 3);
  assert.equal(rendered.querySelectorAll('.flowchart-link').length, 27);
  const labels = [...rendered.querySelectorAll('.edgeLabel')].map((label) => label.textContent.trim());
  assert.ok(labels.includes('is a'));
  assert.equal(labels.filter((label) => label === '<<include>>').length, 4);
  assert.equal(labels.filter((label) => label === '<<extend>>').length, 5);
  assert.match(rendered.textContent, /👤 Guest User/);

  for (const options of [{}, { rasterSafe: true }]) {
    const { root } = serializeDiagramSvg(rendered, options);
    assert.equal(root.querySelectorAll('.node').length, 28);
    assert.equal(root.querySelectorAll('.flowchart-link').length, 27);
    assert.ok(root.getAttribute('viewBox'));
  }
});

test('incident reconstruction renders styled AI labels as readable exportable SVG', async () => {
  const source = await readFile(new URL('./fixtures/incident-reconstruction.mmd', import.meta.url), 'utf8');
  const prepared = prepareMermaidSource(source);
  assert.doesNotMatch(prepared, /style='/i);
  assert.match(prepared, /SYSTEM INCIDENT RECONSTRUCTION\s+<br\/><span style="font-size:24px">When Architecture/);
  assert.match(prepared, /missing idempotency guarantee.*<br\/>/);

  const { window } = new JSDOM('<!doctype html><body></body>');
  for (const name of ['window', 'document', 'CSSStyleSheet', 'Element', 'SVGElement', 'XMLSerializer', 'DOMParser']) {
    globalThis[name] = window[name];
  }
  window.SVGElement.prototype.getBBox = function () {
    return { x: 0, y: 0, width: Math.max(40, (this.textContent?.length ?? 1) * 8), height: 20 };
  };
  window.SVGElement.prototype.getComputedTextLength = function () {
    return (this.textContent?.length ?? 1) * 8;
  };

  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', htmlLabels: true, theme: 'dark' });
  const { svg } = await mermaid.render('incident-reconstruction-regression', prepared);
  window.document.body.innerHTML = svg;
  const rendered = window.document.querySelector('svg');

  assert.equal(rendered.querySelectorAll('.node').length, 12);
  assert.equal(rendered.querySelectorAll('.cluster').length, 2);
  assert.ok(rendered.querySelectorAll('foreignObject').length > 0);
  const labels = [...rendered.querySelectorAll('.node .label')].map((label) => label.textContent).join(' ');
  assert.doesNotMatch(labels, /<span|font-size:12px/);
  assert.match(labels, /When Architecture/);
  assert.match(labels, /Crime Scene/);
  const styledSubtext = [...rendered.querySelectorAll('span')]
    .find((span) => span.style.fontSize === '12px' && span.textContent.includes('Automated Tooling'));
  assert.ok(styledSubtext);

  const { serialized, root } = serializeDiagramSvg(rendered, { rasterSafe: true });
  assert.equal(root.querySelectorAll('.node').length, 12);
  assert.equal(root.querySelectorAll('foreignObject').length, 0);
  assert.equal(new window.DOMParser().parseFromString(serialized, 'image/svg+xml').querySelector('parsererror'), null);
});
