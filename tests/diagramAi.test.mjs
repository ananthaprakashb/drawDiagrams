import assert from 'node:assert/strict';
import test from 'node:test';
import { extractMermaid } from '../src/diagramAi.ts';

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
});
