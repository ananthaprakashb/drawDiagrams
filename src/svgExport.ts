export function serializeDiagramSvg(renderedSvg: SVGSVGElement) {
  // Mermaid's SVG string may contain HTML labels such as <br> inside foreignObject.
  // The browser normalizes those labels in the preview DOM; XMLSerializer then
  // writes them as well-formed XHTML for standalone SVG and image exports.
  const copy = renderedSvg.cloneNode(true) as SVGSVGElement;
  // HTML parsing can leave explicit xmlns attributes alongside DOM namespaces.
  // Let XMLSerializer declare each element's namespace once on the exported copy.
  for (const element of [copy, ...copy.querySelectorAll('*')]) {
    element.removeAttribute('xmlns');
  }

  const serialized = new XMLSerializer().serializeToString(copy);
  const parsed = new DOMParser().parseFromString(serialized, 'image/svg+xml');
  if (parsed.querySelector('parsererror') || parsed.documentElement.namespaceURI !== 'http://www.w3.org/2000/svg') {
    throw new Error('The diagram could not be exported as a valid SVG');
  }

  return { serialized, root: parsed.documentElement };
}
