export type InfographicLayout = 'layered-stack' | 'comparison' | 'roadmap' | 'pyramid';
export type InfographicPalette = 'sage' | 'ocean' | 'sunset' | 'slate';

export type InfographicSection = {
  name: string;
  description?: string;
  left?: string[];
  right?: string[];
};

export type InfographicDocument = {
  type: 'infographic';
  layout: InfographicLayout;
  title: string;
  subtitle?: string;
  palette?: InfographicPalette;
  columns?: { left: string; right: string };
  sections: InfographicSection[];
};

const palettes: Record<InfographicPalette, {
  background: string;
  ink: string;
  primary: string;
  primaryText: string;
  surfaces: [string, string];
  border: string;
}> = {
  sage: { background: '#f7f3e8', ink: '#17211d', primary: '#076856', primaryText: '#ffffff', surfaces: ['#e8d0a2', '#b9d99c'], border: '#4d624f' },
  ocean: { background: '#f2f7fa', ink: '#14252e', primary: '#075d78', primaryText: '#ffffff', surfaces: ['#cce5ec', '#e4eef5'], border: '#49727e' },
  sunset: { background: '#fff8f2', ink: '#342019', primary: '#a4412d', primaryText: '#ffffff', surfaces: ['#f5c7aa', '#f5dfac'], border: '#8a5c49' },
  slate: { background: '#f5f6f8', ink: '#17202b', primary: '#2f4858', primaryText: '#ffffff', surfaces: ['#d8e0e7', '#eef1f4'], border: '#667783' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string, max = 120) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be non-empty text.`);
  return value.trim().slice(0, max);
}

function optionalText(value: unknown, label: string, max = 240) {
  if (value === undefined) return undefined;
  return requiredText(value, label, max);
}

function textList(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 6) throw new Error(`${label} must be a list of up to six labels.`);
  return value.map((item, index) => requiredText(item, `${label} item ${index + 1}`, 72));
}

export function parseInfographic(source: string): InfographicDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    throw new Error('Infographic text must be valid JSON. Start from a template and edit the quoted values.');
  }
  if (!isRecord(raw) || raw.type !== 'infographic') throw new Error('The root "type" must be "infographic".');
  const layouts: InfographicLayout[] = ['layered-stack', 'comparison', 'roadmap', 'pyramid'];
  if (!layouts.includes(raw.layout as InfographicLayout)) throw new Error('Choose layout: layered-stack, comparison, roadmap, or pyramid.');
  if (!Array.isArray(raw.sections) || raw.sections.length < 2 || raw.sections.length > 12) {
    throw new Error('"sections" must contain between 2 and 12 sections.');
  }
  const palette = raw.palette === undefined ? 'sage' : raw.palette as InfographicPalette;
  if (!(palette in palettes)) throw new Error('Choose palette: sage, ocean, sunset, or slate.');
  let columns: InfographicDocument['columns'];
  if (raw.columns !== undefined) {
    if (!isRecord(raw.columns)) throw new Error('"columns" must contain left and right labels.');
    columns = {
      left: requiredText(raw.columns.left, 'Left column', 40),
      right: requiredText(raw.columns.right, 'Right column', 40),
    };
  }
  return {
    type: 'infographic',
    layout: raw.layout as InfographicLayout,
    title: requiredText(raw.title, 'Title'),
    subtitle: optionalText(raw.subtitle, 'Subtitle'),
    palette,
    columns,
    sections: raw.sections.map((section, index) => {
      if (!isRecord(section)) throw new Error(`Section ${index + 1} must be an object.`);
      return {
        name: requiredText(section.name, `Section ${index + 1} name`, 64),
        description: optionalText(section.description, `Section ${index + 1} description`),
        left: textList(section.left, `Section ${index + 1} left`),
        right: textList(section.right, `Section ${index + 1} right`),
      };
    }),
  };
}

function escapeXml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;',
  })[character] as string);
}

function lines(value: string, limit: number, maxLines = 2) {
  const words = value.trim().split(/\s+/);
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= limit || !line) line = next;
    else {
      result.push(line);
      line = word;
    }
  }
  if (line) result.push(line);
  if (result.length > maxLines) {
    const clipped = result.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1].slice(0, Math.max(1, limit - 1))}…`;
    return clipped;
  }
  return result;
}

function textBlock(value: string, x: number, y: number, options: {
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
  weight?: number;
  fill?: string;
  width?: number;
  maxLines?: number;
  lineHeight?: number;
} = {}) {
  const size = options.size ?? 18;
  const lineHeight = options.lineHeight ?? size * 1.18;
  const wrapped = lines(value, options.width ?? 24, options.maxLines ?? 2);
  const startY = y - ((wrapped.length - 1) * lineHeight) / 2;
  return `<text x="${x}" y="${startY}" text-anchor="${options.anchor ?? 'start'}" dominant-baseline="middle" font-size="${size}" font-weight="${options.weight ?? 500}" fill="${options.fill ?? '#17211d'}">${wrapped.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}

function itemStrip(items: string[], x: number, y: number, width: number, ink: string) {
  if (!items.length) return '';
  const slot = width / items.length;
  return items.map((item, index) => {
    const center = x + slot * index + slot / 2;
    const initials = item.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    return `<g><circle cx="${center}" cy="${y - 15}" r="17" fill="#ffffff" stroke="#a6aaa7"/>${textBlock(initials, center, y - 14, { anchor: 'middle', size: 10, weight: 800, fill: ink, width: 4, maxLines: 1 })}${textBlock(item, center, y + 18, { anchor: 'middle', size: 13, weight: 600, fill: ink, width: Math.max(10, Math.floor(slot / 8)), maxLines: 2 })}</g>`;
  }).join('');
}

function layeredStack(document: InfographicDocument, top: number, palette: typeof palettes.sage) {
  const rowHeight = 112;
  const leftX = 52;
  const fullWidth = 1096;
  const centerX = 600;
  const centerWidth = 230;
  return document.sections.map((section, index) => {
    const y = top + index * rowHeight;
    const fill = palette.surfaces[index % 2];
    const notch = y + rowHeight - 12;
    const polygon = `${leftX},${y} ${leftX + fullWidth},${y} ${leftX + fullWidth - 8},${notch - 13} ${centerX},${notch + 13} ${leftX + 8},${notch - 13}`;
    const left = section.left ?? [];
    const right = section.right ?? [];
    return `<g><polygon points="${polygon}" fill="${fill}" stroke="${palette.border}" stroke-width="1.5"/>${itemStrip(left, 68, y + 52, 390, palette.ink)}${itemStrip(right, 742, y + 52, 390, palette.ink)}<rect x="${centerX - centerWidth / 2}" y="${y + 23}" width="${centerWidth}" height="66" rx="7" fill="${palette.primary}"/>${textBlock(`Layer ${String(document.sections.length - index).padStart(2, '0')}`, centerX, y + 34, { anchor: 'middle', size: 12, weight: 800, fill: palette.primaryText, width: 16, maxLines: 1 })}${textBlock(section.name, centerX, y + 65, { anchor: 'middle', size: 20, weight: 750, fill: palette.primaryText, width: 19, maxLines: 2 })}</g>`;
  }).join('');
}

function comparison(document: InfographicDocument, top: number, palette: typeof palettes.sage) {
  const rowHeight = 112;
  return document.sections.map((section, index) => {
    const y = top + index * rowHeight;
    const fill = palette.surfaces[index % 2];
    const left = (section.left ?? []).join(' • ') || section.description || '';
    const right = (section.right ?? []).join(' • ');
    return `<g><rect x="52" y="${y}" width="1096" height="96" rx="16" fill="${fill}" stroke="${palette.border}"/><rect x="492" y="${y + 16}" width="216" height="64" rx="9" fill="${palette.primary}"/>${textBlock(section.name, 600, y + 48, { anchor: 'middle', size: 18, weight: 750, fill: palette.primaryText, width: 19 })}${textBlock(left, 74, y + 48, { size: 16, weight: 600, fill: palette.ink, width: 42, maxLines: 3 })}${textBlock(right, 1126, y + 48, { anchor: 'end', size: 16, weight: 600, fill: palette.ink, width: 42, maxLines: 3 })}</g>`;
  }).join('');
}

function roadmap(document: InfographicDocument, top: number, palette: typeof palettes.sage) {
  const cardHeight = 142;
  return document.sections.map((section, index) => {
    const y = top + index * cardHeight;
    const side = index % 2 === 0 ? 104 : 646;
    const markerY = y + 58;
    const details = [...(section.left ?? []), ...(section.right ?? [])].join(' • ') || section.description || '';
    return `<g><line x1="600" y1="${y}" x2="600" y2="${y + cardHeight}" stroke="${palette.border}" stroke-width="4"/><circle cx="600" cy="${markerY}" r="22" fill="${palette.primary}"/>${textBlock(String(index + 1), 600, markerY, { anchor: 'middle', size: 14, weight: 800, fill: palette.primaryText, width: 3, maxLines: 1 })}<rect x="${side}" y="${y + 6}" width="450" height="104" rx="16" fill="${palette.surfaces[index % 2]}" stroke="${palette.border}"/>${textBlock(section.name, side + 24, y + 35, { size: 19, weight: 800, fill: palette.ink, width: 35, maxLines: 1 })}${textBlock(details, side + 24, y + 75, { size: 15, fill: palette.ink, width: 48, maxLines: 2 })}</g>`;
  }).join('');
}

function pyramid(document: InfographicDocument, top: number, palette: typeof palettes.sage) {
  const rowHeight = 112;
  const count = document.sections.length;
  return document.sections.map((section, index) => {
    const y = top + index * rowHeight;
    const width = 360 + index * ((980 - 360) / Math.max(1, count - 1));
    const x = 600 - width / 2;
    const fill = index === 0 ? palette.primary : palette.surfaces[index % 2];
    const ink = index === 0 ? palette.primaryText : palette.ink;
    const details = [...(section.left ?? []), ...(section.right ?? [])].join(' • ') || section.description || '';
    return `<g><polygon points="${x + 28},${y} ${x + width - 28},${y} ${x + width},${y + 96} ${x},${y + 96}" fill="${fill}" stroke="${palette.border}"/>${textBlock(section.name, 600, y + 34, { anchor: 'middle', size: 20, weight: 800, fill: ink, width: 34, maxLines: 1 })}${textBlock(details, 600, y + 69, { anchor: 'middle', size: 14, fill: ink, width: Math.max(28, Math.floor(width / 10)), maxLines: 2 })}</g>`;
  }).join('');
}

export function renderInfographic(source: string, accessibleTitle?: string, accessibleDescription?: string) {
  const document = parseInfographic(source);
  const palette = palettes[document.palette ?? 'sage'];
  const top = document.columns && ['layered-stack', 'comparison'].includes(document.layout) ? 188 : 150;
  const rowHeight = document.layout === 'roadmap' ? 142 : 112;
  const height = top + document.sections.length * rowHeight + 36;
  const body = document.layout === 'layered-stack'
    ? layeredStack(document, top, palette)
    : document.layout === 'comparison'
      ? comparison(document, top, palette)
      : document.layout === 'roadmap'
        ? roadmap(document, top, palette)
        : pyramid(document, top, palette);
  const columnHeaders = document.columns && ['layered-stack', 'comparison'].includes(document.layout)
    ? `<rect x="52" y="138" width="438" height="34" rx="17" fill="#111"/><rect x="710" y="138" width="438" height="34" rx="17" fill="#111"/>${textBlock(document.columns.left, 271, 155, { anchor: 'middle', size: 16, weight: 700, fill: '#fff', width: 34, maxLines: 1 })}${textBlock(document.columns.right, 929, 155, { anchor: 'middle', size: 16, weight: 700, fill: '#fff', width: 34, maxLines: 1 })}`
    : '';
  const title = accessibleTitle?.trim() || document.title;
  const description = accessibleDescription?.trim() || document.subtitle || `${document.title}, a ${document.layout} infographic with ${document.sections.length} sections.`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 ${height}" width="1200" height="${height}" role="img" aria-labelledby="infographic-title infographic-description"><title id="infographic-title">${escapeXml(title)}</title><desc id="infographic-description">${escapeXml(description)}</desc><rect width="1200" height="${height}" fill="${palette.background}"/><g font-family="Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${textBlock(document.title, 600, 58, { anchor: 'middle', size: 42, weight: 850, fill: palette.ink, width: 46, maxLines: 1 })}${document.subtitle ? textBlock(document.subtitle, 600, 104, { anchor: 'middle', size: 19, weight: 600, fill: palette.primary, width: 78, maxLines: 2 }) : ''}${columnHeaders}${body}</g></svg>`;
  return { svg, width: 1200, height, document };
}
