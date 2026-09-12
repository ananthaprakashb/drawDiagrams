export function validDiagram(source: string): boolean {
  // The browser runs Mermaid.parse and renders with securityLevel: strict.
  // The service only rejects obviously unrelated text; it does not claim to render SVG.
  const firstLine = source.trimStart().split(/\r?\n/, 1)[0].trim();
  return /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|architecture-beta|gitGraph|quadrantChart|kanban|block-beta)(?:\s|$)/.test(firstLine);
}

export async function fingerprint(source: string, title: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([source, title]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function studioLink(studioUrl: string, source: string, title: string): string {
  const url = new URL(studioUrl);
  if (url.protocol !== 'https:') throw new Error('STUDIO_URL must use HTTPS');
  url.hash = `diagram=${encodeURIComponent(JSON.stringify({ source, title, description: '', theme: 'Paper' }))}`;
  return url.toString();
}
