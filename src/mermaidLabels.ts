// Mermaid's strict SVG text mode prints HTML formatting tags literally. Keep
// their words, including a separator where adjacent tags meet.
export function plainMermaidLabels(source: string) {
  return source
    .replace(/(?:<|&lt;)\s*\/?\s*(?:b|strong|i|em|br)\s*\/?\s*(?:>|&gt;)/gi, ' ')
    .replace(/&nbsp;/gi, ' ');
}
