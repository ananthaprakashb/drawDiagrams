export const LOCAL_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

export const DIAGRAM_SYSTEM_PROMPT = `Convert the user's explanation into ONE concise Mermaid diagram.
Output Mermaid syntax only. No Markdown, commentary, HTML, click commands, links, or init directives.
Choose sequenceDiagram for interactions between people or systems; timeline for dated or ordered events; mindmap for concepts and subtopics; otherwise use flowchart TD.
Use simple IDs (A, B, C) and quote readable labels. Keep it under 15 nodes. Preserve the user's meaning; do not invent facts.

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

export function extractMermaid(reply: string) {
  const cleaned = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s*```(?:mermaid)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const lines = cleaned.split(/\r?\n/);
  const start = lines.findIndex((line) => DIAGRAM_START.test(line.trim()));
  if (start < 0) throw new Error('The model did not return Mermaid diagram text. Please try a shorter description.');
  const source = lines.slice(start).join('\n').trim();
  if (source.length > 10000 || /%%\{|\bclick\s+\w+|<\/?[a-z]/i.test(source)) {
    throw new Error('The model included unsupported diagram content. Please try again.');
  }
  return source;
}
