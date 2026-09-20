const SVG_NS = 'http://www.w3.org/2000/svg';

type TextRun = {
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  fontWeight: string;
};

export function pngScale(width: number, height: number) {
  // Keep enough resolution for broad diagrams while bounding canvas memory.
  return Math.min(2, 8192 / Math.max(width, height), Math.sqrt(24_000_000 / (width * height)) * 0.999);
}

function htmlLabelLines(content: Element) {
  const lines: TextRun[][] = [[]];
  const nextLine = () => {
    if (lines.at(-1)?.length) lines.push([]);
  };

  const visit = (node: Node) => {
    if (node.nodeType === 3) {
      const text = (node.textContent || '').replace(/\s+/g, ' ');
      if (!text) return;
      const parent = node.parentElement || content;
      const style = window.getComputedStyle(parent);
      lines.at(-1)?.push({
        text,
        color: style.color || '#222222',
        fontFamily: style.fontFamily || 'sans-serif',
        fontSize: parseFloat(style.fontSize) || 16,
        fontStyle: style.fontStyle || 'normal',
        fontWeight: style.fontWeight || 'normal',
      });
      return;
    }

    if (node.nodeType !== 1) return;
    const element = node as Element;
    if (element.localName.toLowerCase() === 'br') {
      nextLine();
      return;
    }
    for (const child of element.childNodes) visit(child);
  };

  visit(content);
  for (const line of lines) {
    if (line[0]) line[0].text = line[0].text.trimStart();
    if (line.at(-1)) line.at(-1)!.text = line.at(-1)!.text.trimEnd();
  }
  return lines.filter((line) => line.some((run) => run.text));
}

function replaceHtmlLabels(svg: SVGSVGElement, renderedSvg: SVGSVGElement) {
  const renderedLabels = renderedSvg.querySelectorAll('foreignObject');
  for (const [index, foreignObject] of Array.from(svg.querySelectorAll('foreignObject')).entries()) {
    const parent = foreignObject.parentElement;
    if (!parent) continue;

    // Journey diagrams already include SVG text next to the HTML label.
    if (!Array.from(parent.children).some((child) => child !== foreignObject && child.localName === 'text')) {
      const x = Number(foreignObject.getAttribute('x') || 0);
      const y = Number(foreignObject.getAttribute('y') || 0);
      const width = Number(foreignObject.getAttribute('width'));
      const height = Number(foreignObject.getAttribute('height'));
      if (![x, y, width, height].every(Number.isFinite)) {
        throw new Error('This HTML label has no usable SVG bounds');
      }

      const label = renderedLabels[index].querySelector('span, p') ||
        renderedLabels[index].querySelector('div') || renderedLabels[index];
      const content = renderedLabels[index].firstElementChild || renderedLabels[index];
      const style = window.getComputedStyle(label);
      const fontSize = parseFloat(style.fontSize) || 16;
      const lines = htmlLabelLines(content);
      const lineHeights = lines.map((line) => Math.max(...line.map((run) => run.fontSize * 1.5), fontSize * 1.5));
      const totalHeight = lineHeights.reduce((sum, value) => sum + value, 0);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', String(x + width / 2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', `${fontSize}px`);
      text.setAttribute('font-family', style.fontFamily || 'sans-serif');
      text.setAttribute('font-weight', style.fontWeight || 'normal');
      text.setAttribute('fill', style.color || '#222222');
      let baseline = y + height / 2 - totalHeight / 2;
      lines.forEach((line, index) => {
        baseline += lineHeights[index] * 0.8;
        const row = document.createElementNS(SVG_NS, 'tspan');
        row.setAttribute('x', String(x + width / 2));
        row.setAttribute('y', String(baseline));
        for (const run of line) {
          const span = document.createElementNS(SVG_NS, 'tspan');
          span.setAttribute('font-size', `${run.fontSize}px`);
          span.setAttribute('font-family', run.fontFamily);
          span.setAttribute('font-style', run.fontStyle);
          span.setAttribute('font-weight', run.fontWeight);
          span.setAttribute('fill', run.color);
          span.textContent = run.text;
          row.appendChild(span);
        }
        text.appendChild(row);
        baseline += lineHeights[index] * 0.2;
      });
      parent.insertBefore(text, foreignObject);
    }
    foreignObject.remove();
  }
}

export function serializeDiagramSvg(renderedSvg: SVGSVGElement, options: { rasterSafe?: boolean } = {}) {
  // Mermaid's SVG string may contain HTML labels such as <br> inside foreignObject.
  // The browser normalizes those labels in the preview DOM; XMLSerializer then
  // writes them as well-formed XHTML for standalone SVG and image exports.
  const copy = renderedSvg.cloneNode(true) as SVGSVGElement;
  if (options.rasterSafe) replaceHtmlLabels(copy, renderedSvg);
  // HTML parsing can leave explicit xmlns attributes alongside DOM namespaces.
  // Let XMLSerializer declare each element's namespace once on the exported copy.
  for (const element of [copy, ...copy.querySelectorAll('*')]) {
    element.removeAttribute('xmlns');
  }

  const serialized = new XMLSerializer().serializeToString(copy);
  const parsed = new DOMParser().parseFromString(serialized, 'image/svg+xml');
  if (parsed.querySelector('parsererror') || parsed.documentElement.namespaceURI !== SVG_NS) {
    throw new Error('The diagram could not be exported as a valid SVG');
  }

  return { serialized, root: parsed.documentElement };
}
