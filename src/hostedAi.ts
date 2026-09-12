export const HOSTED_AI_URL = (import.meta.env?.VITE_DIAGRAM_AI_URL ?? '').trim().replace(/\/+$/, '');

export async function generateHostedDiagram(
  endpoint: string,
  description: string,
  repair: { previous: string; validationError: string } | undefined,
  signal: AbortSignal,
) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 60_000);
  let response: Response;
  try {
    response = await fetch(`${endpoint}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, ...repair }),
      signal: AbortSignal.any([signal, timeout.signal]),
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (error) {
    if (timeout.signal.aborted) throw new Error('Cloudflare AI timed out. Try again or use a template.');
    if (error instanceof TypeError) throw new Error('Cloudflare AI could not be reached. Check the Worker URL or use local AI.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') throw new Error('The AI service sent an unexpected response.');
  const result = data as { reply?: unknown; error?: unknown };
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The AI service is unavailable.');
  if (typeof result.reply !== 'string') throw new Error('The AI service did not return Mermaid text.');
  return result.reply;
}
