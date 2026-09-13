import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { audiences as mermaidAudiences, templates, type DiagramTemplate } from './templates';
import { infographicAudiences, infographicTemplates, type InfographicTemplate } from './infographicTemplates';
import { renderInfographic } from './infographics';
import { plainMermaidLabels, prepareMermaidSource } from './mermaidLabels';
import { pngScale, serializeDiagramSvg } from './svgExport';

type ThemeName = 'Paper' | 'Classic' | 'Forest' | 'Dark';
type EditorMode = 'mermaid' | 'infographic';

type Draft = {
  mode: EditorMode;
  source: string;
  title: string;
  description: string;
  theme: ThemeName;
};

const STORAGE_KEY = 'drawDiagrams:draft:v1';
const HASH_PREFIX = '#diagram=';
const defaultTemplate = templates[0];

const themeMap: Record<ThemeName, 'neutral' | 'default' | 'forest' | 'dark'> = {
  Paper: 'neutral',
  Classic: 'default',
  Forest: 'forest',
  Dark: 'dark',
};

function cleanOneLine(value: string) {
  return plainMermaidLabels(value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function withAccessibility(source: string, title: string, description: string) {
  const lines = source.trim().split('\n');
  if (!lines.length) return source;

  const additions: string[] = [];
  const safeTitle = cleanOneLine(title);
  const safeDescription = cleanOneLine(description);

  if (safeTitle) additions.push(`    accTitle: ${safeTitle}`);
  if (safeDescription) additions.push(`    accDescr: ${safeDescription}`);

  if (!additions.length) return source;
  return [lines[0], ...additions, ...lines.slice(1)].join('\n');
}

function initialDraft(): Draft {
  try {
    if (window.location.hash.startsWith(HASH_PREFIX)) {
      const decoded = decodeURIComponent(window.location.hash.slice(HASH_PREFIX.length));
      const shared = JSON.parse(decoded) as Partial<Draft>;
      if (shared.source) {
        return {
          mode: shared.mode === 'infographic' ? 'infographic' : 'mermaid',
          source: shared.mode === 'infographic' ? shared.source : prepareMermaidSource(shared.source),
          title: shared.title ?? 'Shared diagram',
          description: shared.description ?? '',
          theme: shared.theme && shared.theme in themeMap ? shared.theme : 'Paper',
        };
      }
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const local = JSON.parse(saved) as Partial<Draft>;
      if (local.source) {
        return {
          mode: local.mode === 'infographic' ? 'infographic' : 'mermaid',
          source: local.mode === 'infographic' ? local.source : prepareMermaidSource(local.source),
          title: local.title ?? 'My diagram',
          description: local.description ?? '',
          theme: local.theme && local.theme in themeMap ? local.theme : 'Paper',
        };
      }
    }
  } catch {
    // A malformed local/share draft should never prevent the editor from opening.
  }

  return {
    mode: 'mermaid',
    source: defaultTemplate.source,
    title: defaultTemplate.name,
    description: defaultTemplate.purpose,
    theme: 'Paper',
  };
}

function filenameFrom(title: string, extension: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'diagram';
  return `${base}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportedDiagramSvg(options: { rasterSafe?: boolean } = {}) {
  const renderedSvg = document.querySelector<SVGSVGElement>('.diagram-output svg');
  if (!renderedSvg) throw new Error('No rendered diagram is available');
  return serializeDiagramSvg(renderedSvg, options);
}

export default function App() {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [audience, setAudience] = useState('Everyone');
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState('');
  const [status, setStatus] = useState('Ready');
  const [showCode, setShowCode] = useState(true);
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const stageRef = useRef<HTMLDivElement>(null);
  const renderSource = useMemo(
    () => draft.mode === 'mermaid'
      ? withAccessibility(prepareMermaidSource(draft.source), draft.title, draft.description)
      : draft.source,
    [draft.mode, draft.source, draft.title, draft.description],
  );
  const naturalWidth = useMemo(() => {
    const width = Number(svg.match(/viewBox="[^\"]*?\s+[^\"]*?\s+([\d.]+)\s+[-\d.]+"/)?.[1]);
    return Number.isFinite(width) && width > 0 ? width : 1200;
  }, [svg]);

  const visibleTemplates = useMemo(
    () => draft.mode === 'mermaid'
      ? templates.filter((template) => audience === 'Everyone' || template.audience === audience)
      : infographicTemplates.filter((template) => audience === 'Everyone' || template.audience === audience),
    [audience, draft.mode],
  );
  const availableAudiences = draft.mode === 'mermaid' ? mermaidAudiences : infographicAudiences;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (draft.mode === 'infographic') {
          const result = renderInfographic(draft.source, draft.title, draft.description);
          if (!cancelled) {
            setSvg(result.svg);
            setRenderError('');
            setStatus('Infographic updated');
          }
          return;
        }
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          // Native SVG text keeps PNG canvases readable across browsers.
          htmlLabels: false,
          theme: themeMap[draft.theme],
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        });

        await mermaid.parse(renderSource);
        const result = await mermaid.render(`draw-diagram-${Date.now()}`, renderSource);
        if (!cancelled) {
          setSvg(result.svg);
          setRenderError('');
          setStatus('Diagram updated');
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Mermaid could not read this diagram.';
          setRenderError(message);
          setStatus('Fix the highlighted diagram text');
        }
      }
    }, renderSource.length > 2500 ? 850 : 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [renderSource, draft.mode, draft.source, draft.title, draft.description, draft.theme]);

  function useTemplate(template: DiagramTemplate | InfographicTemplate) {
    setDraft((current) => ({
      ...current,
      source: current.mode === 'mermaid' ? prepareMermaidSource(template.source) : template.source,
      title: template.name,
      description: template.purpose,
    }));
    setStatus(`${template.name} loaded`);
  }

  function currentZoom() {
    if (zoom !== 'fit') return zoom;
    return Math.min(1, Math.max(1, (stageRef.current?.clientWidth ?? 800) - 60) / naturalWidth);
  }

  function changeZoom(direction: 1 | -1) {
    const next = currentZoom() * (direction > 0 ? 1.5 : 1 / 1.5);
    setZoom(Math.min(3, Math.max(direction > 0 ? 0.25 : 0.005, next)));
  }

  async function copySource() {
    try {
      await navigator.clipboard.writeText(renderSource);
      setStatus(draft.mode === 'mermaid' ? 'Mermaid text copied' : 'Infographic JSON copied');
    } catch {
      setStatus('Clipboard access was blocked by the browser');
    }
  }

  async function shareDiagram() {
    const payload = encodeURIComponent(JSON.stringify(draft));
    const url = `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, '', `${HASH_PREFIX}${payload}`);
      setStatus('Private share link copied — diagram data is stored in the URL');
    } catch {
      setStatus('Could not copy the share link');
    }
  }

  function exportSvg() {
    if (!svg) return;
    try {
      const { serialized } = exportedDiagramSvg();
      downloadBlob(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }), filenameFrom(draft.title, 'svg'));
      setStatus('SVG downloaded');
    } catch {
      setStatus('Could not export SVG');
    }
  }

  async function exportPng() {
    if (!svg) return;

    try {
      const { serialized, root: documentSvg } = exportedDiagramSvg({ rasterSafe: true });
      const viewBox = documentSvg.getAttribute('viewBox')?.split(/\s+/).map(Number);
      const width = Math.max(320, viewBox?.[2] || Number(documentSvg.getAttribute('width')) || 1200);
      const height = Math.max(240, viewBox?.[3] || Number(documentSvg.getAttribute('height')) || 800);
      const scale = pngScale(width, height);

      const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const context = canvas.getContext('2d');
          if (!context) {
            setStatus('PNG export is not supported by this browser');
            return;
          }

          if (draft.theme !== 'Dark') {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((png) => {
            if (png) {
              downloadBlob(png, filenameFrom(draft.title, 'png'));
              setStatus('PNG downloaded');
            } else {
              setStatus('Could not encode this diagram as PNG');
            }
          }, 'image/png');
        } catch {
          setStatus('Could not convert this diagram to PNG');
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus('Could not convert this SVG to PNG');
      };
      image.src = url;
    } catch {
      setStatus('Could not export PNG');
    }
  }

  function printDiagram() {
    if (!svg) return;
    window.print();
    setStatus('Print dialog opened — choose Save as PDF to create a PDF');
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./" aria-label="DrawDiagrams home">
          <img className="brand-mark" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" aria-hidden="true" />
          <span>DrawDiagrams</span>
        </a>
        <div className="header-actions">
          <span className="privacy-note">Runs in your browser</span>
          <a href="https://mermaid.js.org/intro/syntax-reference.html" target="_blank" rel="noreferrer">Mermaid reference ↗</a>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Free visual explanation tool</p>
          <h1>Make your ideas clear. <span>As diagrams or infographics.</span></h1>
          <p className="hero-copy">
            Start from Mermaid or structured infographic templates, then edit, preview, and export
            for engineering, delivery, teaching, writing, or management.
          </p>
          <a className="editor-link" href="#studio-heading">Open the visual studio →</a>
          <div className="trust-row" aria-label="Product principles">
            <span>No account</span><span>Local drafts</span><span>Local autosave</span><span>Accessible SVG</span>
          </div>
        </section>

        <section className="template-section" aria-labelledby="templates-heading">
          <div className="mode-tabs" role="group" aria-label="Visual format">
            <button type="button" className={draft.mode === 'mermaid' ? 'active' : ''} onClick={() => { setDraft((current) => current.mode === 'mermaid' ? current : ({ ...current, mode: 'mermaid', source: defaultTemplate.source, title: defaultTemplate.name, description: defaultTemplate.purpose })); setAudience('Everyone'); }}>Mermaid diagrams</button>
            <button type="button" className={draft.mode === 'infographic' ? 'active' : ''} onClick={() => { setDraft((current) => current.mode === 'infographic' ? current : ({ ...current, mode: 'infographic', source: infographicTemplates[0].source, title: infographicTemplates[0].name, description: infographicTemplates[0].purpose })); setAudience('Everyone'); }}>Visual infographics</button>
          </div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">1 · Choose a starting point</p>
              <h2 id="templates-heading">{draft.mode === 'mermaid' ? 'Start from a diagram template' : 'Start from an infographic template'}</h2>
            </div>
            <div className="audience-tabs" aria-label="Filter templates by audience">
              {availableAudiences.map((item) => (
                <button
                  key={item}
                  className={audience === item ? 'active' : ''}
                  onClick={() => setAudience(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="template-grid">
            {visibleTemplates.map((template) => (
              <button className="template-card" key={template.id} onClick={() => useTemplate(template)} type="button">
                <span className="template-meta"><b>{template.audience}</b> · {template.type}</span>
                <strong>{template.name}</strong>
                <span>{template.purpose}</span>
                <em>Use this template →</em>
              </button>
            ))}
          </div>
        </section>

        <section className="studio" aria-labelledby="studio-heading">
          <div className="section-heading studio-heading">
            <div>
              <p className="eyebrow">2 · Edit structured source</p>
              <h2 id="studio-heading">{draft.mode === 'mermaid' ? 'Mermaid editor and live preview' : 'Infographic JSON and live preview'}</h2>
            </div>
            <div className="studio-actions">
              <button type="button" onClick={() => setShowCode((value) => !value)}>{showCode ? 'Expand preview' : 'Show editor'}</button>
              <button type="button" onClick={copySource}>{draft.mode === 'mermaid' ? 'Copy Mermaid' : 'Copy JSON'}</button>
              <button type="button" onClick={shareDiagram}>Copy share link</button>
            </div>
          </div>

          <div className={`workspace ${showCode ? '' : 'preview-only'}`}>
            {showCode && (
              <div className="editor-panel">
                <div className="panel-title">
                  <span>Diagram text</span>
                  <span className="muted">{draft.mode === 'mermaid' ? 'Mermaid' : 'JSON'}</span>
                </div>
                <textarea
                  aria-label={draft.mode === 'mermaid' ? 'Mermaid diagram text' : 'Infographic JSON'}
                  spellCheck={false}
                  value={draft.source}
                  onChange={(event) => setDraft((current) => ({ ...current, source: current.mode === 'mermaid' ? prepareMermaidSource(event.target.value) : event.target.value }))}
                />
                {draft.mode === 'mermaid' ? (
                  <details className="syntax-help">
                    <summary>New to Mermaid? Three useful patterns</summary>
                    <code>A["Idea"] --&gt; B["Next step"]</code>
                    <code>C{"Decision?"} -- "Yes" --&gt; D["Action"]</code>
                    <p>Start from a template and usually you only need to replace the words inside quotes.</p>
                  </details>
                ) : (
                  <details className="syntax-help">
                    <summary>How infographic JSON works</summary>
                    <p>Choose layered-stack, comparison, roadmap, or pyramid. Edit the title and section labels while preserving quotes, commas, and brackets.</p>
                    <code>{'"layout": "layered-stack"'}</code>
                  </details>
                )}
              </div>
            )}

            <div className="preview-panel">
              <div className="panel-title preview-title">
                <span>Live preview</span>
                <div className="preview-controls">
                  <div className="zoom-controls" role="group" aria-label="Diagram zoom">
                    <button type="button" onClick={() => changeZoom(-1)} aria-label="Zoom out" disabled={!svg || !!renderError}>−</button>
                    <button type="button" onClick={() => setZoom('fit')} aria-label="Fit diagram" aria-pressed={zoom === 'fit'} disabled={!svg || !!renderError}>Fit</button>
                    <button type="button" onClick={() => setZoom(1)} aria-label="Actual size" aria-pressed={zoom === 1} disabled={!svg || !!renderError}>100%</button>
                    <button type="button" onClick={() => changeZoom(1)} aria-label="Zoom in" disabled={!svg || !!renderError}>+</button>
                  </div>
                  {draft.mode === 'mermaid' && <label>
                    <span className="sr-only">Diagram theme</span>
                    <select
                      value={draft.theme}
                      onChange={(event) => setDraft((current) => ({ ...current, theme: event.target.value as ThemeName }))}
                    >
                      {Object.keys(themeMap).map((name) => <option key={name}>{name}</option>)}
                    </select>
                  </label>}
                </div>
              </div>

              <div className="diagram-stage" ref={stageRef} aria-live="polite">
                {renderError ? (
                  <div className="error-card" role="alert">
                    <strong>{draft.mode === 'mermaid' ? 'Mermaid needs a small fix.' : 'Infographic JSON needs a small fix.'}</strong>
                    <p>{renderError}</p>
                    <p>Tip: reload one of the templates above, then change only its quoted labels first.</p>
                  </div>
                ) : (
                  <div className="diagram-output" style={zoom === 'fit'
                    ? { width: '100%', maxWidth: `${naturalWidth}px` }
                    : { width: `${Math.round(naturalWidth * zoom)}px` }} dangerouslySetInnerHTML={{ __html: svg }} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="accessibility-section" aria-labelledby="accessibility-heading">
          <div>
              <p className="eyebrow">3 · Make the meaning portable</p>
            <h2 id="accessibility-heading">Describe the diagram for everyone</h2>
            <p>
              The title and description are embedded into the rendered SVG,
              so screen readers and search tools have context beyond the picture.
            </p>
          </div>
          <div className="a11y-fields">
            <label>
              <span>Accessible title</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Example: How residents apply for a library card"
              />
            </label>
            <label>
              <span>Accessible description</span>
              <textarea
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe the point of the diagram in one or two sentences."
              />
            </label>
          </div>
        </section>

        <section className="export-section" aria-labelledby="export-heading">
          <div>
            <p className="eyebrow">4 · Publish it where people already work</p>
            <h2 id="export-heading">Export and reuse</h2>
            <p>SVG stays sharp in documents and websites. PNG is convenient for slides and social posts. Print can be saved as PDF.</p>
          </div>
          <div className="export-actions">
            <button className="primary" type="button" onClick={exportSvg} disabled={!svg || !!renderError}>Download SVG</button>
            <button type="button" onClick={exportPng} disabled={!svg || !!renderError}>Download PNG</button>
            <button type="button" onClick={printDiagram} disabled={!svg || !!renderError}>Print / Save PDF</button>
          </div>
        </section>

        <section className="principles">
          <article><span>01</span><h3>Start from a template</h3><p>Choose a useful example, paste Mermaid, or edit structured infographic JSON.</p></article>
          <article><span>02</span><h3>Public by design</h3><p>No sign-in or backend is required for the core editor; drafts remain in the browser.</p></article>
          <article><span>03</span><h3>Open format</h3><p>The source remains Mermaid text or readable JSON, so visuals can live beside documentation.</p></article>
          <article><span>04</span><h3>Accessible output</h3><p>Every diagram can carry an accessible title and description, not just visual labels.</p></article>
        </section>
      </main>

      <footer>
        <span>DrawDiagrams · Built for explaining, teaching, documenting, and serving.</span>
        <span className="status" role="status" aria-live="polite">{status}</span>
      </footer>
    </div>
  );
}
