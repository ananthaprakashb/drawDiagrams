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

function safeSpanStyle(tag: string) {
  const style = tag.match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '';
  const allowed: string[] = [];

  for (const declaration of style.split(';')) {
    const [rawName, rawValue] = declaration.split(':', 2);
    const name = rawName?.trim().toLowerCase();
    const value = rawValue?.trim();
    if (!name || !value) continue;

    if (name === 'color' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)) {
      allowed.push(`color:${value}`);
    }
    if (name === 'font-size' && /^\d+(?:\.\d+)?px$/i.test(value)) {
      const size = Math.min(32, Math.max(8, Number.parseFloat(value)));
      allowed.push(`font-size:${size}px`);
    }
  }

  return allowed.join(';');
}

// Mermaid's strict SVG text mode prints most HTML formatting tags literally.
// Keep their words, including a separator where adjacent tags meet.
export function plainMermaidLabels(source: string) {
  return removeInlineFormatting(source, true);
}

// Rich Mermaid pasted from Markdown may escape HTML as \<span>. Normalize it,
// allow only presentation-safe color/font-size declarations, and wrap long
// subtext. Mermaid's strict HTML-label renderer sanitizes the resulting markup
// again before it reaches the preview DOM.
function readableMermaidLabels(source: string) {
  const richLabels: string[] = [];
  const replaceSpan = (_match: string, openingTag: string, content: string) => {
    const text = plainMermaidLabels(content);
    if (!text.trim()) return '';
    const style = safeSpanStyle(openingTag);
    richLabels.push(`<br/><span${style ? ` style="${style}"` : ''}>${wrapLabelText(text)}</span>`);
    return `__DRAWDIAGRAMS_RICH_LABEL_${richLabels.length - 1}__`;
  };

  const cleaned = removeInlineFormatting(
    source
      .replace(/\\(?=<\/?span\b)/gi, '')
      .replace(/\\(?=&lt;\/?span\b)/gi, '')
      .replace(/(<span\b[^>]*>)([\s\S]*?)<\/span\s*>/gi, replaceSpan)
      .replace(/(&lt;span\b.*?&gt;)([\s\S]*?)&lt;\/span\s*&gt;/gi, replaceSpan)
      // Remove malformed or unclosed span tags without discarding their text.
      .replace(/<\/?span\b[^>]*>/gi, ' ')
      .replace(/&lt;\/?span\b.*?&gt;/gi, ' '),
    false,
  );
  return cleaned.replace(/__DRAWDIAGRAMS_RICH_LABEL_(\d+)__/g, (_match, index) => richLabels[Number(index)] ?? '');
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
