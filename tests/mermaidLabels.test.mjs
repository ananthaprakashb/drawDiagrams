import assert from 'node:assert/strict';
import test from 'node:test';
import { plainMermaidLabels } from '../src/mermaidLabels.ts';

test('removes formatting tags while preserving label words and Mermaid indentation', () => {
  const input = 'flowchart TD\n  A["<b>DELEGATION BOUNDARY</b><b>Not:</b> Can AI do this?"] --> B["&lt;strong&gt;Instead:&lt;/strong&gt; How much authority?"]';
  const source = plainMermaidLabels(input);
  assert.match(source, /^flowchart TD\n  A\[/);
  assert.doesNotMatch(source, /<\/?b>|&lt;\/?strong&gt;/i);
  assert.match(source, /DELEGATION BOUNDARY\s+Not:/);
  assert.match(source, /Instead:\s+How much authority\?/);
  assert.equal(plainMermaidLabels('mindmap\n  root((Main idea))\n    Topic'), 'mindmap\n  root((Main idea))\n    Topic');
});
