# DrawDiagrams

A free, browser-first Mermaid diagram studio designed for people who need to **explain something visually** — not only people who already know diagram syntax.

The public-service release is aimed at teachers, authors, nonprofit/civic teams, documentation writers, and developers. Users can describe a diagram in ordinary language or start from a template, edit Mermaid text, see a live preview, add accessible context, and export the result.

## Why this project

Mermaid is powerful, portable, and text-based, but a blank Mermaid editor still assumes that the user already knows which diagram to choose and how to write it. DrawDiagrams adds a human-facing layer:

**Describe an idea or choose a purpose → review Mermaid text → preview → describe for accessibility → export/share.**

## MVP features

- Purpose-driven starter templates for teachers, authors, public-service teams, and technical users
- Hosted Cloudflare Workers AI generation when configured, or optional on-device generation
- Live Mermaid preview
- Mermaid source remains visible and editable — no proprietary diagram format
- Local browser autosave
- No account and no application backend required for the core editor
- Share links that carry the diagram state in the URL fragment
- Accessible title and description embedded through Mermaid `accTitle` / `accDescr`
- SVG and PNG download
- Print / Save as PDF using the browser print flow
- Paper, Classic, Forest, and Dark Mermaid themes
- Responsive layout for desktop and mobile
- Mermaid rendered with `securityLevel: 'strict'`

## Included starter templates

| Audience | Templates | Mermaid type |
| --- | --- | --- |
| Teachers | Lesson flow, Concept map | Flowchart, Mind map |
| Authors | Story timeline, Article structure | Timeline, Flowchart |
| Public service | Public service path, Community journey | Flowchart, User journey |
| Technical | System request, System architecture, Project plan | Sequence diagram, Architecture, Gantt |

The template catalog is intentionally data-driven in `src/templates.ts` so community contributors can add useful patterns without changing the editor itself.

## Privacy model

The diagram editor is static and browser-only. Hosted AI is an optional separate Cloudflare Worker.

- Diagram editing and rendering happen in the browser.
- Drafts are stored in `localStorage` on the user's device.
- The core editor does not send diagram content to an application server.
- When **Cloudflare AI** is selected, the description is sent to Cloudflare Workers AI for generation. The generated Mermaid returns to the browser and is not stored by this application. For a failed diagram, a bounded previous answer and syntax error may also be sent for one repair attempt. Do not enter private student or resident data.
- When **On my device** is selected, AI generation runs in a browser Web Worker. Model files are downloaded from MLC/Hugging Face on first use; descriptions are not submitted to the hosted Worker.
- A share link stores the draft in the URL fragment. Users should still avoid putting sensitive information in URLs they plan to share.

## Free AI generation

When `VITE_DIAGRAM_AI_URL` is configured, hosted generation uses `@cf/qwen/qwen3-30b-a3b-fp8` through the `worker/` Cloudflare Worker. This is the default for faster generation without a browser model download. The Worker requires no client API key: it uses a Workers AI binding, allows the GitHub Pages origin, checks input lengths, and rate-limits requests per network and per Cloudflare location. Origin checks and CORS restrict browsers but do not authenticate non-browser callers. Workers AI's Free plan currently provides 10,000 Neurons/day, then requests fail until the quota resets; the app keeps local AI and templates available. Monitor the Workers AI dashboard for usage. All hosted results still pass Mermaid parsing in the browser before replacing the draft, with one hosted syntax repair attempt.

If the endpoint is not configured, the existing on-device AI remains available. Users can also explicitly choose it for descriptions they do not want sent to Cloudflare.

Click **Generate Mermaid diagram** after explaining what to show. The app lazily loads the open Qwen2.5-0.5B-Instruct model using WebLLM on a usable WebGPU device, or Transformers.js/ONNX Runtime on the browser CPU (WASM) when WebGPU is unavailable or fails. The model generates a flowchart, sequence diagram, timeline, or mind map. CPU generation streams the text into a separate read-only preview so progress is visible, and uses a shorter prompt and output limit to reduce waiting. Mermaid validates the finished syntax and the app makes one local repair attempt if needed. The diagram editor and drawing update after validation. If the CPU is slow, **Try using this partial diagram** validates and applies the text generated so far, then stops generation; check it for missing steps.

On-device generation does not require a subscription, account, API key, or per-request fee. The tradeoff is a large first download (the CPU q4 ONNX model alone is about 786 MB), browser storage and memory requirements, and slower inference on CPU (possibly several minutes). GPU inference needs a capable WebGPU device and roughly 1 GB of GPU memory. The CPU worker uses a single WASM thread so it works on static hosting without cross-origin isolation headers. Model availability and download speed depend on external model hosts; after caching, inference can run without sending the description to them. AI can still misunderstand the explanation, so verify the diagram before sharing it.

## Accessibility

DrawDiagrams exposes fields for an accessible title and description. At render time they are inserted into the Mermaid definition using `accTitle` and `accDescr`, allowing Mermaid to place corresponding accessibility metadata in the generated SVG.

The surrounding interface also uses native labels, focus styles, status announcements, and keyboard-accessible controls.

## Security

User-provided Mermaid text is rendered with Mermaid's `securityLevel: 'strict'`. The core MVP does not enable diagram click callbacks or arbitrary HTML behavior.

## Technology

- React
- TypeScript
- Vite
- Mermaid
- WebLLM / Transformers.js, loaded only when local AI is used
- Optional Cloudflare Worker with Workers AI and rate-limit bindings

The MVP pins Mermaid `11.17.2` while the major-version transition to Mermaid 12 is evaluated separately. This keeps the first public release on a known 11.x surface instead of taking a same-cycle major dependency change without a compatibility pass.

## Local development

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

## Deployment

The app is a static Vite build. `vite.config.ts` uses a relative base path so the generated `dist/` can be hosted from GitHub Pages or another static host.

CI in `.github/workflows/ci.yml` type-checks and builds every push and pull request.

### Enable Cloudflare Workers AI

The hosted endpoint has **two deployments**: `worker/` goes to Cloudflare, while the Vite site remains on GitHub Pages. No account identifier or API key belongs in frontend code.

1. From this repository, run `npm install`, `npx wrangler login`, then `npm run worker:deploy`. Wrangler prints the Worker URL, such as `https://drawdiagrams-ai.<your-subdomain>.workers.dev`. Run `npm run worker:check` first to validate the bundle without deploying. Cloudflare login is needed for deployment; local AI remains available without it.
2. In **GitHub repository → Settings → Secrets and variables → Actions → Variables**, create a repository variable named `DRAWDIAGRAMS_AI_URL` containing the Worker URL **without** `/generate` (this URL is public, not a secret).
3. In **Actions → Deploy to GitHub Pages → Run workflow**, rebuild the site so the Pages workflow passes that variable into `VITE_DIAGRAM_AI_URL`. On the deployed site, **Cloudflare AI · faster** then appears as the default choice. Test the Worker separately with `GET <Worker URL>/health` (returns `{"status":"ok"}`).

For local Vite development, set `VITE_DIAGRAM_AI_URL` in `.env.local` to the Worker URL, or leave it unset to use only local AI. The Worker accepts browser requests from `https://ananthaprakashb.github.io` and local Vite on port 5173; adjust `ALLOWED_ORIGINS` in `worker/src/index.ts` before deploying from another domain. Do not store credentials in the Git repository. A private preview using a different origin needs its own allowed origin.

## Public-service design principles

1. **Plain language first** — people choose what they want to explain before learning syntax.
2. **Low barrier** — no sign-in or backend is required for core use.
3. **Open output** — users can always keep the Mermaid source and SVG.
4. **Accessible meaning** — diagrams should carry text alternatives, not only pixels.
5. **Safe by default** — public input is rendered using Mermaid's strict security mode.
6. **Useful templates over feature overload** — grow the catalog from real teaching, writing, civic, and documentation needs.

## Suggested next phases

### Phase 2 — Guided builder

Add simple form-based builders for common tasks such as "steps in a process", "people and relationships", "events over time", and "who talks to whom". Users should be able to produce Mermaid without editing syntax at all.

### Phase 3 — Community/public template library

Add reviewed templates for lesson plans, research methods, government service navigation, emergency procedures, public meeting processes, book planning, nonprofit workflows, and software documentation.

## License

Add a project license before the first public release/contribution campaign.
