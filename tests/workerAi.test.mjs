import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.ts';

const endpoint = 'https://drawdiagrams-ai.example.workers.dev/generate';
const origin = 'https://ananthaprakashb.github.io';

function fixture({ allowed = true, run = async () => ({ response: 'flowchart TD\n  A["Start"] --> B["Done"]' }) } = {}) {
  const calls = [];
  const env = {
    AI: { run: async (...args) => { calls.push(args); return run(...args); } },
    VISITOR_LIMIT: { limit: async () => ({ success: allowed }) },
    SITE_LIMIT: { limit: async () => ({ success: true }) },
  };
  const request = (body, headers = {}) => new Request(endpoint, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.7', ...headers },
    body: JSON.stringify(body),
  });
  return { env, calls, request };
}

test('Worker only allows the published site and handles its CORS preflight', async () => {
  const { env, request, calls } = fixture();
  const forbidden = await worker.fetch(request({ description: 'Apply for a card' }, { Origin: 'https://other.example' }), env);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('Access-Control-Allow-Origin'), null);
  const preflight = await worker.fetch(new Request(endpoint, { method: 'OPTIONS', headers: { Origin: origin } }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(calls.length, 0);
});

test('Worker bounds untrusted input and refuses inference when rate-limited', async () => {
  const { env, calls, request } = fixture({ allowed: false });
  assert.equal((await worker.fetch(request({ description: 'x'.repeat(3001) }), env)).status, 400);
  assert.equal((await worker.fetch(request({ description: 'é'.repeat(2500), previous: 'é'.repeat(2400) }), env)).status, 413);
  assert.equal((await worker.fetch(request({ description: 'Apply for a card' }), env)).status, 429);
  assert.equal(calls.length, 0);
});

test('Worker returns the model answer and gives the model bounded repair context', async () => {
  const { env, calls, request } = fixture();
  const response = await worker.fetch(request({
    description: 'Resident applies for a library card',
    previous: 'flowchart TD\n A -->',
    validationError: 'Unexpected end of source',
  }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match((await response.json()).reply, /flowchart TD/);
  assert.equal(calls[0][0], '@cf/qwen/qwen3-30b-a3b-fp8');
  assert.equal(calls[0][1].messages.length, 4);
  assert.match(calls[0][1].messages[3].content, /Unexpected end of source/);
  assert.equal(calls[0][1].max_tokens, 500);
});

test('Worker reports a failed AI call without changing any diagram', async () => {
  const { env, request } = fixture({ run: async () => { throw new Error('quota reached'); } });
  const response = await worker.fetch(request({ description: 'Apply for a card' }), env);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /allowance is exhausted/);
});
