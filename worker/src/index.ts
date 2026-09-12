import { DIAGRAM_SYSTEM_PROMPT } from '../../src/diagramAi.ts';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };
type AiBinding = { run: (model: string, options: { messages: Message[]; max_tokens: number; temperature: number }) => Promise<unknown> };
type RateLimitBinding = { limit: (options: { key: string }) => Promise<{ success: boolean }> };
type Env = { AI: AiBinding; VISITOR_LIMIT: RateLimitBinding; SITE_LIMIT: RateLimitBinding };

const MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const ALLOWED_ORIGINS = new Set([
  'https://ananthaprakashb.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const MAX_BODY_BYTES = 8000;

function json(body: object, status: number, origin?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      ...(origin ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      } : {}),
    },
  });
}

async function readBoundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) throw new Error('Request too large');
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function generatedText(result: unknown) {
  if (!result || typeof result !== 'object') return '';
  const data = result as { response?: unknown; choices?: Array<{ message?: { content?: unknown } }> };
  const text = data.response ?? data.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text : '';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/health' && request.method === 'GET') return json({ status: 'ok' }, 200);
    if (pathname !== '/generate') return json({ error: 'Not found' }, 404);

    const origin = request.headers.get('Origin') ?? '';
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600',
        'Vary': 'Origin',
      },
    });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
      return json({ error: 'Expected JSON' }, 415, origin);
    }
    if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) {
      return json({ error: 'Request too large' }, 413, origin);
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(await readBoundedBody(request));
    } catch (error) {
      return json({ error: error instanceof Error && error.message === 'Request too large' ? 'Request too large' : 'Invalid JSON' },
        error instanceof Error && error.message === 'Request too large' ? 413 : 400, origin);
    }

    const description = data && typeof data.description === 'string' ? data.description.trim() : '';
    const previous = data && typeof data.previous === 'string' ? data.previous : '';
    const validationError = data && typeof data.validationError === 'string' ? data.validationError : '';
    if (!description || description.length > 3000 || previous.length > 2500 || validationError.length > 400) {
      return json({ error: 'Description or repair request is outside the allowed length' }, 400, origin);
    }

    // Anonymous traffic is bounded per visitor and per location before an AI call spends free quota.
    const visitor = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const [visitorCheck, siteCheck] = await Promise.all([
      env.VISITOR_LIMIT.limit({ key: visitor }),
      env.SITE_LIMIT.limit({ key: 'generate' }),
    ]);
    if (!visitorCheck.success || !siteCheck.success) {
      return json({ error: 'Too many requests. Try again in a minute or use a template.' }, 429, origin);
    }

    const messages: Message[] = [
      { role: 'system', content: `${DIAGRAM_SYSTEM_PROMPT}\n/no_think` },
      { role: 'user', content: `Create a Mermaid diagram for: ${description}\n/no_think` },
    ];
    if (previous && validationError) {
      messages.push(
        { role: 'assistant', content: previous },
        { role: 'user', content: `The previous diagram failed Mermaid validation: ${validationError}. Return only a corrected diagram with the same meaning. /no_think` },
      );
    }

    try {
      const output = await env.AI.run(MODEL, { messages, max_tokens: 500, temperature: 0.1 });
      return json({ reply: generatedText(output).slice(0, 4000) }, 200, origin);
    } catch {
      return json({ error: 'Hosted generation is unavailable or its free allowance is exhausted. Try a template or local AI.' }, 503, origin);
    }
  },
};
