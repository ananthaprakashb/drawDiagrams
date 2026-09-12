const SVG_NS = 'http://www.w3.org/2000/svg';

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
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
      const lines = ((content as HTMLElement).innerText || content.textContent || '').trim().split(/\r?\n/);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', String(x + width / 2));
      text.setAttribute('y', String(y + height / 2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', `${fontSize}px`);
      text.setAttribute('font-family', style.fontFamily || 'sans-serif');
      text.setAttribute('font-weight', style.fontWeight || 'normal');
      text.setAttribute('fill', style.color || '#222222');
      lines.forEach((line, index) => {
        const tspan = document.createElementNS(SVG_NS, 'tspan');
        tspan.setAttribute('x', String(x + width / 2));
        tspan.setAttribute('dy', String(index ? lineHeight : -(lines.length - 1) * lineHeight / 2));
        tspan.textContent = line;
        text.appendChild(tspan);
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
