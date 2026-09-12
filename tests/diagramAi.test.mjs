import assert from 'node:assert/strict';
import test from 'node:test';
import { extractMermaid, plainMermaidLabels } from '../src/diagramAi.ts';

test('extracts only Mermaid source from a fenced model answer', () => {
  assert.equal(
    extractMermaid('Here is your diagram:\n```mermaid\nflowchart TD\n    A["Apply"] --> B["Review"]\n```'),
    'flowchart TD\n    A["Apply"] --> B["Review"]',
  );
});

test('rejects non-diagram text and unsafe directives before modifying a draft', () => {
  assert.throws(() => extractMermaid('I cannot draw that.'), /did not return Mermaid/);
  assert.throws(() => extractMermaid('flowchart TD\n%%{init: {"securityLevel":"loose"}}%%\nA-->B'), /unsupported/);
  assert.throws(() => extractMermaid('flowchart TD\nA-->B\nclick A "https://example.com"'), /unsupported/);
  assert.throws(() => extractMermaid('flowchart TD\nA["<script>alert(1)</script>"]'), /unsupported/);
});

test('removes literal or encoded formatting tags while preserving label words', () => {
  const input = 'flowchart TD\n  A["<b>DELEGATION BOUNDARY</b><b>Not:</b> Can AI do this?"] --> B["&lt;strong&gt;Instead:&lt;/strong&gt; How much authority?"]';
  const source = extractMermaid(input);
  assert.equal(source, plainMermaidLabels(input));
  assert.doesNotMatch(source, /<\/?b>|&lt;\/?strong&gt;/i);
  assert.match(source, /DELEGATION BOUNDARY\s+Not:/);
  assert.match(source, /Instead:\s+How much authority\?/);
});
