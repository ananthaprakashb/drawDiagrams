import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { fingerprint, studioLink, validDiagram } from './diagram.ts';
import { getQuota, reserveUse, type Database } from './usage.ts';

type Env = {
  DB: Database;
  MCP_PUBLIC_URL: string;
  OAUTH_ISSUER: string;
  OAUTH_JWKS_URL: string;
  STUDIO_URL: string;
};

const SCOPE = 'diagrams:use';
const SECURITY_SCHEMES = [{ type: 'oauth2', scopes: [SCOPE] }];
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function resourceMetadataUrl(env: Env): string {
  return `${new URL(env.MCP_PUBLIC_URL).origin}/.well-known/oauth-protected-resource`;
}

function challenge(env: Env, explanation: string) {
  const description = explanation.replace(/["\\]/g, '');
  return `Bearer resource_metadata="${resourceMetadataUrl(env)}", error="insufficient_scope", error_description="${description}"`;
}

function authError(env: Env) {
  return {
    content: [{ type: 'text' as const, text: 'Connect your DrawDiagrams account to use this tool.' }],
    isError: true,
    _meta: { 'mcp/www_authenticate': [challenge(env, 'Sign in to your DrawDiagrams account')] },
  };
}

async function authenticatedAccount(request: Request, env: Env): Promise<string | null> {
  const match = /^Bearer (\S+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) return null;
  try {
    let jwks = jwksCache.get(env.OAUTH_JWKS_URL);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(env.OAUTH_JWKS_URL));
      jwksCache.set(env.OAUTH_JWKS_URL, jwks);
    }
    const { payload } = await jwtVerify(match[1], jwks, {
      issuer: env.OAUTH_ISSUER,
      audience: env.MCP_PUBLIC_URL,
      algorithms: ['RS256', 'ES256'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub ||
        !(typeof payload.scope === 'string' && payload.scope.split(' ').includes(SCOPE))) return null;
    // Issuer + subject is stable across ChatGPT conversations; client-provided account IDs are ignored.
    return `${payload.iss}|${payload.sub}`;
  } catch {
    return null;
  }
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const raw = await request.text();
  if (raw.length > 20000) return new Response('Request too large', { status: 413 });
  let body: { method?: string };
  try { body = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const server = new McpServer({ name: 'drawdiagrams', version: '0.1.0' }, {
    instructions: 'Create a diagram link only when the user asks for a diagram. Ask ChatGPT to write Mermaid source, then call create_diagram_link. Three distinct diagram links per account each UTC week are free. Editing in the browser is available separately.',
  });

  server.registerTool('get_diagram_allowance', {
    title: 'Check weekly diagram allowance',
    description: 'Check the signed-in DrawDiagrams account’s remaining free diagram links this UTC week. Does not use an allowance slot.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const account = await authenticatedAccount(request, env);
    if (!account) return authError(env);
    const quota = await getQuota(env.DB, account);
    return { content: [{ type: 'text', text: JSON.stringify(quota) }], structuredContent: quota };
  });

  server.registerTool('create_diagram_link', {
    title: 'Create a Mermaid diagram link',
    description: 'Create a shareable link to the DrawDiagrams editor from Mermaid source written for the user. A new diagram consumes one of three free slots per account per UTC week; an identical retry does not. The Mermaid text is stored in the URL fragment, not on this service. This tool does not generate text with an AI model or charge money.',
    inputSchema: { source: z.string().min(4).max(6000), title: z.string().min(1).max(120) },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ source, title }) => {
    const account = await authenticatedAccount(request, env);
    if (!account) return authError(env);
    if (!validDiagram(source)) return { isError: true, content: [{ type: 'text', text: 'Start the source with a supported Mermaid diagram declaration (for example, flowchart LR).' }] };
    const key = await fingerprint(source, title);
    const reserved = await reserveUse(env.DB, account, key);
    if (!reserved.allowed) return {
      isError: true,
      content: [{ type: 'text', text: `Your three free diagram links for this UTC week are used. The allowance resets ${reserved.quota.resets_at}.` }],
      structuredContent: { quota: reserved.quota },
    };
    const url = studioLink(env.STUDIO_URL, source, title);
    return {
      content: [{ type: 'text', text: `Open ${title}: ${url}` }],
      structuredContent: { title, url, quota: reserved.quota },
    };
  });

  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request, { parsedBody: body });
  // The SDK version does not yet forward securitySchemes on registered tools. Add the
  // published per-tool OAuth metadata to tools/list until the SDK exposes this field.
  if (body.method !== 'tools/list' || !response.headers.get('content-type')?.includes('application/json')) return response;
  const listing = await response.json() as { result?: { tools?: Array<Record<string, unknown>> } };
  listing.result?.tools?.forEach((tool) => { tool.securitySchemes = SECURITY_SCHEMES; });
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return Response.json(listing, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.DB || !env.MCP_PUBLIC_URL || !env.OAUTH_ISSUER || !env.OAUTH_JWKS_URL || !env.STUDIO_URL) {
      return new Response('Service is not configured', { status: 503 });
    }
    try {
      if ([env.MCP_PUBLIC_URL, env.OAUTH_ISSUER, env.OAUTH_JWKS_URL, env.STUDIO_URL].some((value) => new URL(value).protocol !== 'https:')) {
        return new Response('Service requires HTTPS configuration', { status: 503 });
      }
    } catch {
      return new Response('Service is not configured', { status: 503 });
    }
    const path = new URL(request.url).pathname;
    if (path === '/.well-known/oauth-protected-resource' && request.method === 'GET') {
      return Response.json({
        resource: env.MCP_PUBLIC_URL,
        authorization_servers: [env.OAUTH_ISSUER],
        scopes_supported: [SCOPE],
        resource_documentation: 'https://github.com/ananthaprakashb/drawDiagrams/tree/main/service',
      });
    }
    if (path === '/mcp') return handleMcp(request, env);
    return new Response('Not found', { status: 404 });
  },
};
