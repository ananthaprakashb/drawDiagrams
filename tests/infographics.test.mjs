import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { parseInfographic, renderInfographic } from '../src/infographics.ts';
import { infographicTemplates } from '../src/infographicTemplates.ts';

test('all infographic templates parse and render as standalone SVG', () => {
  const window = new JSDOM('').window;
  for (const template of infographicTemplates) {
    const document = parseInfographic(template.source);
    const rendered = renderInfographic(template.source);
    const parsed = new window.DOMParser().parseFromString(rendered.svg, 'image/svg+xml');
    assert.equal(parsed.querySelector('parsererror'), null, template.name);
    assert.equal(parsed.documentElement.getAttribute('role'), 'img');
    assert.equal(document.type, 'infographic');
    assert.ok(rendered.height > 300);
  }
});

test('infographic content is escaped and validation rejects unsafe shapes', () => {
  const source = JSON.stringify({
    type: 'infographic',
    layout: 'comparison',
    title: 'A < B & C',
    columns: { left: 'Before', right: 'After' },
    sections: [
      { name: 'Input', left: ['<script>alert(1)</script>'], right: ['Validated'] },
      { name: 'Output', left: ['Raw'], right: ['Safe'] },
    ],
  });
  const rendered = renderInfographic(source);
  assert.doesNotMatch(rendered.svg, /<script>/);
  assert.match(rendered.svg, /&lt;/);
  assert.throws(() => parseInfographic('{"type":"infographic","layout":"unknown","sections":[]}'), /layout/);
});
