import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { audiences, templates, type Audience, type DiagramTemplate } from './templates';
import { CPU_DIAGRAM_SYSTEM_PROMPT, DIAGRAM_SYSTEM_PROMPT, extractMermaid, LOCAL_MODEL } from './diagramAi';
import { generateHostedDiagram, HOSTED_AI_URL } from './hostedAi';
import { serializeDiagramSvg } from './svgExport';

type ThemeName = 'Paper' | 'Classic' | 'Forest' | 'Dark';
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type CpuReply = { id: number; type: 'progress' | 'partial' | 'result' | 'error'; message?: string; reply?: string; text?: string };

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

function exportedDiagramSvg(options: { rasterSafe?: boolean } = {}) {
  const renderedSvg = document.querySelector<SVGSVGElement>('.diagram-output svg');
  if (!renderedSvg) throw new Error('No rendered diagram is available');
  return serializeDiagramSvg(renderedSvg, options);
}

export default function App() {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [audience, setAudience] = useState<Audience>('Everyone');
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState('');
  const [status, setStatus] = useState('Ready');
  const [showCode, setShowCode] = useState(true);
  const [description, setDescription] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiBackend, setAiBackend] = useState<'hosted' | 'local'>(HOSTED_AI_URL ? 'hosted' : 'local');
  const [aiPreview, setAiPreview] = useState('');
  const [aiElapsed, setAiElapsed] = useState(0);
  const engineRef = useRef<MLCEngineInterface | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const cpuWorkerRef = useRef<Worker | null>(null);
  const hostedAbortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const generationActiveRef = useRef(false);
  const aiPreviewRef = useRef<HTMLTextAreaElement | null>(null);

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
    if (!aiBusy) return;
    const started = Date.now();
    const timer = window.setInterval(() => setAiElapsed(Math.floor((Date.now() - started) / 1000)), 5000);
    return () => window.clearInterval(timer);
  }, [aiBusy]);

  useEffect(() => {
    if (aiPreviewRef.current) aiPreviewRef.current.scrollTop = aiPreviewRef.current.scrollHeight;
  }, [aiPreview]);

  useEffect(() => () => {
    generationRef.current += 1;
    workerRef.current?.terminate();
    cpuWorkerRef.current?.terminate();
    hostedAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
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

  function cancelGeneration() {
    generationRef.current += 1;
    generationActiveRef.current = false;
    workerRef.current?.terminate();
    workerRef.current = null;
    engineRef.current = null;
    cpuWorkerRef.current?.terminate();
    cpuWorkerRef.current = null;
    hostedAbortRef.current?.abort();
    hostedAbortRef.current = null;
    setAiBusy(false);
    setAiProgress('Generation cancelled. Your current diagram is unchanged.');
  }

  async function usePartialDiagram() {
    const generation = generationRef.current;
    try {
      const candidate = extractMermaid(aiPreview);
      if (candidate.length < 40 || !candidate.includes('\n')) throw new Error('Diagram is incomplete');
      await mermaid.parse(candidate);
      if (generation !== generationRef.current || !generationActiveRef.current) return;
      cancelGeneration();
      setDraft((current) => ({ ...current, source: candidate }));
      setShowCode(true);
      setAiPreview('');
      setAiError('');
      setAiProgress('Partial diagram loaded. Check the editor and preview for missing steps.');
    } catch {
      if (generation === generationRef.current && generationActiveRef.current) {
        setAiError('The generated text is not yet a complete Mermaid diagram. Let it continue or try again.');
      }
    }
  }

  function generateOnCpu(messages: ChatMessage[], generation: number) {
    cpuWorkerRef.current ??= new Worker(new URL('./diagramAi.cpu.worker.ts', import.meta.url), { type: 'module' });
    const worker = cpuWorkerRef.current;
    return new Promise<string>((resolve, reject) => {
      const cleanup = () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };
      const onMessage = (event: MessageEvent<CpuReply>) => {
        const data = event.data;
        if (data.id !== generation) return;
        if (data.type === 'progress') {
          if (generation === generationRef.current) setAiProgress(data.message ?? 'Loading CPU model…');
          return;
        }
        if (data.type === 'partial') {
          if (generation === generationRef.current) setAiPreview(data.text?.slice(0, 10000) ?? '');
          return;
        }
        cleanup();
        if (data.type === 'error') reject(new Error(data.message ?? 'CPU model failed to run.'));
        else resolve(data.reply ?? '');
      };
      const onError = () => {
        cleanup();
        reject(new Error('The CPU model could not start. Check available memory and network access.'));
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ id: generation, messages });
    });
  }

  async function generateDiagram() {
    const request = description.trim();
    if (!request || aiBusy) return;
    const generation = ++generationRef.current;
    generationActiveRef.current = true;
    setAiBusy(true);
    setAiError('');
    setAiPreview('');
    setAiElapsed(0);
    setAiProgress(aiBackend === 'hosted' ? 'Contacting Cloudflare Workers AI…' : 'Checking on-device AI support…');

    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
      let useGpu = aiBackend === 'local' && Boolean(await gpu?.requestAdapter().catch(() => null));
      if (generation !== generationRef.current) return;

      const messages: ChatMessage[] = [
        { role: 'system', content: DIAGRAM_SYSTEM_PROMPT },
        { role: 'user', content: `Create a Mermaid diagram for: ${request}` },
      ];
      let repair: { previous: string; validationError: string } | undefined;
      if (aiBackend === 'hosted') hostedAbortRef.current = new AbortController();
      const generateReply = async () => {
        if (aiBackend === 'hosted') {
          setAiProgress(repair ? 'Asking Cloudflare AI to repair the diagram…' : 'Generating Mermaid with Cloudflare AI…');
          return generateHostedDiagram(HOSTED_AI_URL, request, repair, hostedAbortRef.current!.signal);
        }
        if (useGpu) {
          try {
            if (!engineRef.current) {
              setAiProgress('Loading the GPU model. The first download may take a few minutes…');
              const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
              if (generation !== generationRef.current) return '';
              const worker = new Worker(new URL('./diagramAi.worker.ts', import.meta.url), { type: 'module' });
              workerRef.current = worker;
              const engine = await CreateWebWorkerMLCEngine(worker, LOCAL_MODEL, {
                initProgressCallback: (progress) => {
                  if (generation === generationRef.current) setAiProgress(progress.text);
                },
              });
              if (generation !== generationRef.current) {
                worker.terminate();
                return '';
              }
              engineRef.current = engine;
            }
            if (generation !== generationRef.current) return '';
            setAiProgress('Writing Mermaid text with the GPU model…');
            const response = await engineRef.current.chat.completions.create({
              messages, temperature: 0.2, max_tokens: 700, stream: false,
            });
            return response.choices[0]?.message.content ?? '';
          } catch {
            if (generation !== generationRef.current) return '';
            workerRef.current?.terminate();
            workerRef.current = null;
            engineRef.current = null;
            useGpu = false;
            setAiProgress('GPU model unavailable. Switching to the CPU model…');
          }
        }
        return generateOnCpu([{ role: 'system', content: CPU_DIAGRAM_SYSTEM_PROMPT }, ...messages.slice(1)], generation);
      };

      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt) {
          setAiPreview('');
          setAiProgress(aiBackend === 'hosted' ? 'Repairing Mermaid syntax with Cloudflare AI…' : 'Repairing Mermaid syntax on this device…');
        }
        const reply = await generateReply();
        if (generation !== generationRef.current) return;

        try {
          const candidate = extractMermaid(reply);
          await mermaid.parse(candidate);
          if (generation !== generationRef.current) return;
          setDraft((current) => ({ ...current, source: candidate }));
          setShowCode(true);
          setAiPreview('');
          setAiProgress('Diagram generated. Check the text and preview before sharing.');
          setStatus(aiBackend === 'hosted' ? 'Mermaid diagram generated with Cloudflare AI' : 'Mermaid diagram generated locally');
          return;
        } catch (error) {
          if (attempt) throw error;
          const message = error instanceof Error ? error.message : 'Mermaid syntax is invalid';
          repair = { previous: reply.slice(0, 2500), validationError: message.slice(0, 400) };
          messages.push(
            { role: 'assistant', content: reply },
            { role: 'user', content: `Your diagram failed validation: ${message.slice(0, 400)}. Return only a corrected Mermaid diagram with the same meaning.` },
          );
        }
      }
    } catch (error) {
      if (generation === generationRef.current) {
        if (!engineRef.current) {
          workerRef.current?.terminate();
          workerRef.current = null;
        }
        cpuWorkerRef.current?.terminate();
        cpuWorkerRef.current = null;
        setAiError(error instanceof Error ? error.message : 'AI could not generate this diagram.');
        setAiProgress('Your existing diagram is unchanged.');
      }
    } finally {
      if (generation === generationRef.current) hostedAbortRef.current = null;
      if (generation === generationRef.current) {
        generationActiveRef.current = false;
        setAiBusy(false);
      }
    }
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
      const scale = Math.min(2, 4096 / Math.max(width, height));

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
            <span>No account</span><span>Local drafts</span><span>Local autosave</span><span>Accessible SVG</span>
          </div>
        </section>

        <section className="ai-section" aria-labelledby="ai-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">1 · Describe what you need</p>
              <h2 id="ai-heading">Turn your idea into a diagram</h2>
            </div>
            <span className="ai-badge">Free · {HOSTED_AI_URL ? 'Cloudflare or local' : 'On your device'}</span>
          </div>
          <div className="ai-panel">
            <label htmlFor="diagram-description">What should the diagram explain?</label>
            <textarea
              id="diagram-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: A resident applies for a library card. Staff check eligibility. If approved, they issue the card; otherwise, they explain what is missing."
              maxLength={3000}
            />
            {HOSTED_AI_URL && (
              <label className="ai-provider" htmlFor="ai-provider">
                Generate with
                <select id="ai-provider" value={aiBackend} onChange={(event) => setAiBackend(event.target.value as 'hosted' | 'local')} disabled={aiBusy}>
                  <option value="hosted">Cloudflare AI · faster</option>
                  <option value="local">On my device · private, slower</option>
                </select>
              </label>
            )}
            <div className="ai-controls">
              <button className="primary" type="button" onClick={generateDiagram} disabled={aiBusy || !description.trim()}>
                {aiBusy ? 'Generating…' : 'Generate Mermaid diagram'}
              </button>
              {aiBusy && <button type="button" onClick={cancelGeneration}>Cancel</button>}
              <span role="status" aria-live="polite">{aiProgress}</span>
              {aiBusy && aiElapsed >= 5 && <span>Elapsed: {Math.floor(aiElapsed / 60)}m {String(aiElapsed % 60).padStart(2, '0')}s</span>}
            </div>
            {aiBusy && !aiPreview && aiElapsed >= 30 && <p className="ai-note">Still working on your device. Generation may take several minutes; you can cancel at any time.</p>}
            {aiPreview && (
              <div className="ai-preview">
                <label htmlFor="ai-generated-text">{aiBusy ? 'Mermaid text being generated (not yet validated)' : 'Incomplete Mermaid text from the cancelled or failed run'}</label>
                <textarea id="ai-generated-text" ref={aiPreviewRef} value={aiPreview} readOnly rows={8} />
                {aiBusy && <p className="ai-note">The diagram editor and preview will update after the generated text passes Mermaid validation.</p>}
                {aiBusy && <button className="ai-use-partial" type="button" onClick={usePartialDiagram}>Try using this partial diagram</button>}
              </div>
            )}
            {aiError && <p className="ai-error" role="alert">{aiError}</p>}
            <p className="ai-note">
              {aiBackend === 'hosted'
                ? 'Your description is sent to Cloudflare to generate Mermaid text. No login is required. The free daily allowance is shared by all visitors; diagrams and drafts stay in your browser.'
                : `Your description is processed on your device. The first model download is large (about 786 MB on CPU), and CPU generation may take several minutes.${HOSTED_AI_URL ? '' : ' Cloudflare AI is not configured on this site yet.'}`}
            </p>
          </div>
        </section>

        <section className="template-section" aria-labelledby="templates-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">2 · Or choose what feels closest</p>
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
              <p className="eyebrow">3 · Change the words</p>
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
            <p className="eyebrow">4 · Make the meaning portable</p>
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
            <p className="eyebrow">5 · Publish it where people already work</p>
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
