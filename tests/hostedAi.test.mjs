import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateHostedDiagram } from '../src/hostedAi.ts';

test('browser sends only the diagram request and accepts a hosted reply', async () => {
  const originalFetch = globalThis.fetch;
  let observed;
  globalThis.fetch = async (...args) => {
    observed = args;
    return Response.json({ reply: 'flowchart TD\n A --> B' });
  };
  try {
    const reply = await generateHostedDiagram('https://example.workers.dev', 'A then B', undefined, new AbortController().signal);
    assert.match(reply, /flowchart TD/);
    assert.equal(observed[0], 'https://example.workers.dev/generate');
    assert.deepEqual(JSON.parse(observed[1].body), { description: 'A then B' });
    assert.equal(observed[1].credentials, 'omit');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('browser displays a quota error from the Worker', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: 'Free allowance exhausted' }, { status: 503 });
  try {
    await assert.rejects(
      generateHostedDiagram('https://example.workers.dev', 'A then B', undefined, new AbortController().signal),
      /Free allowance exhausted/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
