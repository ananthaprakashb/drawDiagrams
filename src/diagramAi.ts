export const LOCAL_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

// Keep prompt prefill short on the single-threaded CPU fallback.
export const CPU_DIAGRAM_SYSTEM_PROMPT = `Return only one valid Mermaid diagram. Choose flowchart TD, sequenceDiagram, timeline, or mindmap. Use at most 10 nodes, simple IDs, short labels, and no Markdown, HTML, links, clicks, or directives. Keep spaces between words. Preserve the user's meaning.
Example:
flowchart TD
  A["Apply"] --> B{"Eligible?"}
  B -- "Yes" --> C["Approve"]
  B -- "No" --> D["Explain"]`;

export const DIAGRAM_SYSTEM_PROMPT = `Convert the user's explanation into ONE concise Mermaid diagram.
Output Mermaid syntax only. No Markdown, commentary, HTML, click commands, links, or init directives.
Choose sequenceDiagram for interactions between people or systems; timeline for dated or ordered events; mindmap for concepts and subtopics; otherwise use flowchart TD.
Use simple IDs (A, B, C) and quote readable labels. Keep spaces between words; never use HTML formatting tags. Keep it under 15 nodes. Preserve the user's meaning; do not invent facts.

Flowchart example:
flowchart TD
    A["Resident applies"] --> B{"Eligible?"}
    B -- "Yes" --> C["Receive service"]
    B -- "No" --> D["Show alternatives"]

Sequence example:
sequenceDiagram
    actor Reader
    participant Site
    Reader->>Site: Submit request
    Site-->>Reader: Show confirmation

Timeline example:
timeline
    title Project milestones
    Start : Agree on scope
    Review : Check the draft

Mindmap example:
mindmap
  root((Main idea))
    Topic one
      Example
    Topic two`;

const DIAGRAM_START = /^(flowchart\s+(?:TD|TB|BT|LR|RL)|sequenceDiagram|timeline|mindmap)\b/i;

// Mermaid's strict SVG text mode prints HTML formatting tags literally. Keep
// their words, including a separator where adjacent tags meet, without
// allowing arbitrary HTML through the AI response validator.
export function plainMermaidLabels(source: string) {
  return source
    .replace(/(?:<|&lt;)\s*\/?\s*(?:b|strong|i|em|br)\s*\/?\s*(?:>|&gt;)/gi, ' ')
    .replace(/&nbsp;/gi, ' ');
}

export function extractMermaid(reply: string) {
  const cleaned = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s*```(?:mermaid)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const lines = cleaned.split(/\r?\n/);
  const start = lines.findIndex((line) => DIAGRAM_START.test(line.trim()));
  if (start < 0) throw new Error('The model did not return Mermaid diagram text. Please try a shorter description.');
  const source = plainMermaidLabels(lines.slice(start).join('\n')).trim();
  if (source.length > 10000 || /%%\{|\bclick\s+\w+|<\/?[a-z]/i.test(source)) {
    throw new Error('The model included unsupported diagram content. Please try again.');
  }
  return source;
}
