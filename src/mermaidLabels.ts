// Mermaid's strict SVG text mode prints HTML formatting tags literally. Keep
// their words, including a separator where adjacent tags meet.
export function plainMermaidLabels(source: string) {
  return source
    .replace(/(?:<|&lt;)\s*\/?\s*(?:b|strong|i|em|br)\s*\/?\s*(?:>|&gt;)/gi, ' ')
    .replace(/&nbsp;/gi, ' ');
}

// The SVG-text renderer has no Font Awesome font. Use a self-contained actor
// character, and turn UML-style inheritance into a valid labeled flowchart
// edge. Preserve all other Mermaid constructs, including subgraph directions.
export function prepareMermaidSource(source: string) {
  return plainMermaidLabels(source)
    .replace(/"fa:fa-user(?=\s)/gi, '"👤')
    .replace(/^(\s*[a-z_][\w-]*)\s+--\|>\s+([a-z_][\w-]*)(?=\s*(?:%%[^\n]*)?$)/gim,
      '$1 -->|is a| $2');
}
