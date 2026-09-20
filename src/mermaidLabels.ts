const LABEL_LINE_LENGTH = 64;

function wrapLabelText(value: string, maxLength = LABEL_LINE_LENGTH) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return '';

  const lines: string[] = [];
  let line = words[0];
  for (const word of words.slice(1)) {
    if (`${line} ${word}`.length <= maxLength) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines.join('<br/>');
}

function removeInlineFormatting(source: string, removeBreaks: boolean) {
  const tags = removeBreaks ? 'b|strong|i|em|br|span' : 'b|strong|i|em';
  return source
    .replace(new RegExp(`(?:<|&lt;)\\s*\\/?\\s*(?:${tags})\\b[^>]*?(?:>|&gt;)`, 'gi'), ' ')
    .replace(/&nbsp;/gi, ' ');
}

// Mermaid's strict SVG text mode prints most HTML formatting tags literally.
// Keep their words, including a separator where adjacent tags meet.
export function plainMermaidLabels(source: string) {
  return removeInlineFormatting(source, true);
}

// Rich Mermaid pasted from an AI often uses styled spans as visual subtext.
// Inline styles are not dependable in strict/native SVG mode, so retain the
// content as wrapped SVG text rows. Mermaid understands <br/> in this mode and
// renders it as tspans, which remain portable in SVG and PNG exports.
function readableMermaidLabels(source: string) {
  const replaceSpan = (_match: string, content: string) => {
    const text = plainMermaidLabels(content);
    return text.trim() ? `<br/>${wrapLabelText(text)}` : '';
  };

  return removeInlineFormatting(
    source
      .replace(/<span\b[^>]*>([\s\S]*?)<\/span\s*>/gi, replaceSpan)
      .replace(/&lt;span\b.*?&gt;([\s\S]*?)&lt;\/span\s*&gt;/gi, replaceSpan)
      // Remove malformed or unclosed span tags without discarding their text.
      .replace(/<\/?span\b[^>]*>/gi, ' ')
      .replace(/&lt;\/?span\b.*?&gt;/gi, ' '),
    false,
  );
}

// The SVG-text renderer has no Font Awesome font. Use a self-contained actor
// character, and turn UML-style inheritance into a valid labeled flowchart
// edge. Preserve all other Mermaid constructs, including subgraph directions.
export function prepareMermaidSource(source: string) {
  return readableMermaidLabels(source)
    .replace(/"fa:fa-user(?=\s)/gi, '"👤')
    .replace(/^(\s*[a-z_][\w-]*)\s+--\|>\s+([a-z_][\w-]*)(?=\s*(?:%%[^\n]*)?$)/gim,
      '$1 -->|is a| $2');
}
