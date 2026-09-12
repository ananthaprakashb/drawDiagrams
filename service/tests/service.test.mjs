import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import worker from '../src/index.ts';
import { fingerprint, studioLink, validDiagram } from '../src/diagram.ts';
import { getQuota, reserveUse, resetAt, weekStart } from '../src/usage.ts';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_usage.sql', import.meta.url), 'utf8'));
  return {
    sqlite,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return sqlite.prepare(sql).get(...args) ?? null; },
            async all() { return { results: sqlite.prepare(sql).all(...args) }; },
          };
        },
      };
    },
  };
}

test('three distinct uses per account each UTC week; repeats and accounts are independent', async () => {
  const db = database();
  const now = new Date('2026-09-12T23:59:59Z');
  assert.equal(weekStart(now), '2026-09-07');
  assert.equal(resetAt(weekStart(now)), '2026-09-14T00:00:00.000Z');
  for (const key of ['one', 'two', 'three']) {
    const response = await reserveUse(db, 'issuer|alice', key, now);
    assert.equal(response.allowed, true);
  }
  assert.equal((await reserveUse(db, 'issuer|alice', 'four', now)).allowed, false);
  const retry = await reserveUse(db, 'issuer|alice', 'one', now);
  assert.equal(retry.allowed, true);
  assert.equal(retry.quota.remaining, 0);
  assert.equal((await reserveUse(db, 'issuer|bob', 'four', now)).quota.remaining, 2);
  assert.equal((await reserveUse(db, 'issuer|alice', 'four', new Date('2026-09-14T00:00:00Z'))).quota.remaining, 2);
});

test('simultaneous free requests cannot exceed the three-link cap', async () => {
  const db = database();
  const requests = await Promise.all(Array.from({ length: 8 }, (_, index) =>
    reserveUse(db, 'issuer|alice', `link-${index}`, new Date('2026-09-10T12:00:00Z'))));
  assert.equal(requests.filter((request) => request.allowed).length, 3);
  assert.equal((await getQuota(db, 'issuer|alice', new Date('2026-09-10T12:00:00Z'))).used, 3);
});

test('only an active server-side entitlement removes the free cap', async () => {
  const db = database();
  const now = new Date('2026-09-12T12:00:00Z');
  db.sqlite.prepare('INSERT INTO paid_entitlements VALUES (?, ?)').run('issuer|alice', Math.floor(now.getTime() / 1000) + 3600);
  for (let n = 0; n < 5; n++) assert.equal((await reserveUse(db, 'issuer|alice', String(n), now)).allowed, true);
  assert.equal((await getQuota(db, 'issuer|alice', now)).plan, 'paid');
  assert.equal((await getQuota(db, 'issuer|alice', new Date(now.getTime() + 3600_000))).plan, 'free');
});

test('Mermaid links load in the existing browser editor format without storing source', async () => {
  const source = 'flowchart LR\n  A[Start] --> B[End]';
  const url = new URL(studioLink('https://diagrams.engineeringstepstone.com/', source, 'Lesson'));
  assert.equal(JSON.parse(decodeURIComponent(url.hash.slice('#diagram='.length))).source, source);
  assert.equal(validDiagram(source), true);
  assert.equal(validDiagram('send me a diagram'), false);
  assert.equal(await fingerprint(source, 'Lesson'), await fingerprint(source, 'Lesson'));
  assert.notEqual(await fingerprint(source, 'Lesson'), await fingerprint(source, 'Other'));
});

test('MCP lists OAuth-protected tools and verifies signed account tokens before recording a use', async () => {
  const db = database();
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test', alg: 'ES256', use: 'sig' };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url) === 'https://auth.example/jwks') return Response.json({ keys: [jwk] });
    return originalFetch(url, init);
  };
  const env = { DB: db, MCP_PUBLIC_URL: 'https://mcp.example/mcp', OAUTH_ISSUER: 'https://auth.example/', OAUTH_JWKS_URL: 'https://auth.example/jwks', STUDIO_URL: 'https://diagrams.engineeringstepstone.com/' };
  const token = await new SignJWT({ scope: 'diagrams:use' }).setProtectedHeader({ alg: 'ES256', kid: 'test' })
    .setSubject('alice').setIssuer(env.OAUTH_ISSUER).setAudience(env.MCP_PUBLIC_URL).setIssuedAt().setExpirationTime('1h').sign(privateKey);
  const call = (method, params, bearer) => worker.fetch(new Request(env.MCP_PUBLIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }),
  }), env);
  try {
    const metadata = await worker.fetch(new Request('https://mcp.example/.well-known/oauth-protected-resource'), env);
    assert.equal((await metadata.json()).resource, env.MCP_PUBLIC_URL);
    const listed = await (await call('tools/list')).json();
    assert.equal(listed.result.tools.length, 2);
    assert.deepEqual(listed.result.tools[0].securitySchemes, [{ type: 'oauth2', scopes: ['diagrams:use'] }]);
    const params = { name: 'create_diagram_link', arguments: { source: 'flowchart LR\nA-->B', title: 'Example' } };
    const anonymous = await (await call('tools/call', params)).json();
    assert.equal(anonymous.result.isError, true);
    assert.ok(anonymous.result._meta['mcp/www_authenticate'][0].includes('resource_metadata='));
    assert.equal((await getQuota(db, 'https://auth.example/|alice')).used, 0);
    const wrongAudience = await new SignJWT({ scope: 'diagrams:use' }).setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setSubject('alice').setIssuer(env.OAUTH_ISSUER).setAudience('https://other.example/mcp').setIssuedAt().setExpirationTime('1h').sign(privateKey);
    assert.equal((await (await call('tools/call', params, wrongAudience)).json()).result.isError, true);
    const missingScope = await new SignJWT({ scope: 'unrelated:read' }).setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setSubject('alice').setIssuer(env.OAUTH_ISSUER).setAudience(env.MCP_PUBLIC_URL).setIssuedAt().setExpirationTime('1h').sign(privateKey);
    assert.equal((await (await call('tools/call', params, missingScope)).json()).result.isError, true);
    assert.equal((await getQuota(db, 'https://auth.example/|alice')).used, 0);
    const success = await (await call('tools/call', params, token)).json();
    assert.equal(success.result.isError, undefined);
    assert.ok(success.result.structuredContent.url.startsWith('https://diagrams.engineeringstepstone.com/#diagram='));
    assert.equal((await getQuota(db, 'https://auth.example/|alice')).used, 1);
    await call('tools/call', params, token);
    assert.equal((await getQuota(db, 'https://auth.example/|alice')).used, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
