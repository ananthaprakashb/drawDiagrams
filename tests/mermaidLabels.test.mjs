import assert from 'node:assert/strict';
import test from 'node:test';
import { plainMermaidLabels, prepareMermaidSource } from '../src/mermaidLabels.ts';

test('removes formatting tags while preserving label words and Mermaid indentation', () => {
  const input = 'flowchart TD\n  A["<b>DELEGATION BOUNDARY</b><b>Not:</b> Can AI do this?"] --> B["&lt;strong&gt;Instead:&lt;/strong&gt; How much authority?"]';
  const source = plainMermaidLabels(input);
  assert.match(source, /^flowchart TD\n  A\[/);
  assert.doesNotMatch(source, /<\/?b>|&lt;\/?strong&gt;/i);
  assert.match(source, /DELEGATION BOUNDARY\s+Not:/);
  assert.match(source, /Instead:\s+How much authority\?/);
  assert.equal(plainMermaidLabels('mindmap\n  root((Main idea))\n    Topic'), 'mindmap\n  root((Main idea))\n    Topic');
});

test('turns styled span subtext into wrapped, allowlisted rich label rows', () => {
  const input = `flowchart TD
    A["Main title \\<span onclick='bad()' style='color:#94A3B8; position:fixed; font-size:12px'>This description is deliberately long enough to need a safe second line without keeping unsafe inline HTML styling.\\</span>"]`;
  const source = prepareMermaidSource(input);

  assert.doesNotMatch(source, /\\<|onclick|position:fixed/i);
  assert.match(source, /Main title <br\/><span style="color:#94A3B8;font-size:12px">This description/);
  assert.match(source, /<\/span>/);
  assert.ok((source.match(/<br\/>/g) ?? []).length >= 2);
  assert.match(source, /inline HTML styling\./);
});
