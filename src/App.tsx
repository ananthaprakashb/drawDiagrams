import { useEffect, useMemo, useState } from 'react';
import mermaid from 'mermaid';
import { audiences, templates, type Audience, type DiagramTemplate } from './templates';

type ThemeName = 'Paper' | 'Classic' | 'Forest' | 'Dark';

type Draft = {
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
  return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
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
          source: shared.source,
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
          source: local.source,
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

export default function App() {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [audience, setAudience] = useState<Audience>('Everyone');
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState('');
  const [status, setStatus] = useState('Ready');
  const [showCode, setShowCode] = useState(true);

  const renderSource = useMemo(
    () => withAccessibility(draft.source, draft.title, draft.description),
    [draft.source, draft.title, draft.description],
  );

  const visibleTemplates = useMemo(
    () => templates.filter((template) => audience === 'Everyone' || template.audience === audience),
    [audience],
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
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
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [renderSource, draft.theme]);

  function useTemplate(template: DiagramTemplate) {
    setDraft((current) => ({
      ...current,
      source: template.source,
      title: template.name,
      description: template.purpose,
    }));
    setStatus(`${template.name} loaded`);
  }

  async function copyMermaid() {
    try {
      await navigator.clipboard.writeText(renderSource);
      setStatus('Mermaid text copied');
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
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filenameFrom(draft.title, 'svg'));
    setStatus('SVG downloaded');
  }

  async function exportPng() {
    if (!svg) return;

    try {
      const documentSvg = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
      const viewBox = documentSvg.getAttribute('viewBox')?.split(/\s+/).map(Number);
      const width = Math.max(320, viewBox?.[2] || Number(documentSvg.getAttribute('width')) || 1200);
      const height = Math.max(240, viewBox?.[3] || Number(documentSvg.getAttribute('height')) || 800);
      const scale = Math.min(2, 4096 / Math.max(width, height));

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(url);
          setStatus('PNG export is not supported by this browser');
          return;
        }

        if (draft.theme !== 'Dark') {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((png) => {
          if (png) {
            downloadBlob(png, filenameFrom(draft.title, 'png'));
            setStatus('PNG downloaded');
          }
        }, 'image/png');
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
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
      setStatus('Allow pop-ups to print or save as PDF');
      return;
    }

    popup.document.write(`<!doctype html><html><head><title>${cleanOneLine(draft.title)}</title><style>body{font-family:system-ui;margin:32px}main{max-width:1200px;margin:auto}svg{max-width:100%;height:auto}</style></head><body><main>${svg}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
    setStatus('Print view opened');
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./" aria-label="DrawDiagrams home">
          <span className="brand-mark" aria-hidden="true">◇</span>
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
          <h1>Explain an idea. <span>Not diagram syntax.</span></h1>
          <p className="hero-copy">
            Start with a familiar example, change the words, and export a clear diagram for a lesson,
            article, public-service guide, presentation, or technical document.
          </p>
          <div className="trust-row" aria-label="Product principles">
            <span>No account</span><span>No upload</span><span>Local autosave</span><span>Accessible SVG</span>
          </div>
        </section>

        <section className="template-section" aria-labelledby="templates-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">1 · Choose what feels closest</p>
              <h2 id="templates-heading">Start from a purpose</h2>
            </div>
            <div className="audience-tabs" aria-label="Filter templates by audience">
              {audiences.map((item) => (
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
              <p className="eyebrow">2 · Change the words</p>
              <h2 id="studio-heading">Diagram studio</h2>
            </div>
            <div className="studio-actions">
              <button type="button" onClick={() => setShowCode((value) => !value)}>{showCode ? 'Hide text' : 'Edit text'}</button>
              <button type="button" onClick={copyMermaid}>Copy Mermaid</button>
              <button type="button" onClick={shareDiagram}>Copy share link</button>
            </div>
          </div>

          <div className={`workspace ${showCode ? '' : 'preview-only'}`}>
            {showCode && (
              <div className="editor-panel">
                <div className="panel-title">
                  <span>Diagram text</span>
                  <span className="muted">Mermaid</span>
                </div>
                <textarea
                  aria-label="Mermaid diagram text"
                  spellCheck={false}
                  value={draft.source}
                  onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
                />
                <details className="syntax-help">
                  <summary>New to Mermaid? Three useful patterns</summary>
                  <code>A["Idea"] --&gt; B["Next step"]</code>
                  <code>C{"Decision?"} -- "Yes" --&gt; D["Action"]</code>
                  <p>Start from a template and usually you only need to replace the words inside quotes.</p>
                </details>
              </div>
            )}

            <div className="preview-panel">
              <div className="panel-title">
                <span>Live preview</span>
                <label>
                  <span className="sr-only">Diagram theme</span>
                  <select
                    value={draft.theme}
                    onChange={(event) => setDraft((current) => ({ ...current, theme: event.target.value as ThemeName }))}
                  >
                    {Object.keys(themeMap).map((name) => <option key={name}>{name}</option>)}
                  </select>
                </label>
              </div>

              <div className="diagram-stage" aria-live="polite">
                {renderError ? (
                  <div className="error-card" role="alert">
                    <strong>Mermaid needs a small fix.</strong>
                    <p>{renderError}</p>
                    <p>Tip: reload one of the templates above, then change only its labels first.</p>
                  </div>
                ) : (
                  <div className="diagram-output" dangerouslySetInnerHTML={{ __html: svg }} />
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
              The title and description are embedded into the rendered SVG using Mermaid accessibility metadata,
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
            <button className="primary" type="button" onClick={exportSvg} disabled={!svg}>Download SVG</button>
            <button type="button" onClick={exportPng} disabled={!svg}>Download PNG</button>
            <button type="button" onClick={printDiagram} disabled={!svg}>Print / Save PDF</button>
          </div>
        </section>

        <section className="principles">
          <article><span>01</span><h3>Plain language first</h3><p>People choose a purpose and example before seeing Mermaid syntax.</p></article>
          <article><span>02</span><h3>Public by design</h3><p>No sign-in or backend is required for the core editor; drafts remain in the browser.</p></article>
          <article><span>03</span><h3>Open format</h3><p>The source remains Mermaid text, so a diagram is portable and can live beside documentation.</p></article>
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
