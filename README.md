# DrawDiagrams

A free, browser-first Mermaid diagram studio designed for people who need to **explain something visually** — not only people who already know diagram syntax.

The public-service release is aimed at teachers, authors, nonprofit/civic teams, documentation writers, and developers. Users can start from a template or paste Mermaid text, see a live preview, add accessible context, and export the result.

## Why this project

Mermaid is powerful, portable, and text-based. DrawDiagrams pairs a direct Mermaid editor with practical examples for teachers, authors, public-service teams, and developers:

**Choose a template or write Mermaid text → preview → describe for accessibility → export/share.**

## MVP features

- Purpose-driven starter templates for teachers, authors, public-service teams, and technical users
- Direct Mermaid text editing and paste
- Live Mermaid preview
- Mermaid source remains visible and editable — no proprietary diagram format
- Local browser autosave
- No account or application backend required
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

The site is static and browser-only. Editing, rendering, and draft autosave happen locally; no diagram is sent to an application server. Share links encode the draft in the URL fragment, so avoid sharing sensitive information through links.

Natural-language generation is deferred for a later release. This release does not download an AI model or contact a hosted AI service.

## Accessibility

DrawDiagrams exposes fields for an accessible title and description. At render time they are inserted into the Mermaid definition using `accTitle` and `accDescr`, allowing Mermaid to place corresponding accessibility metadata in the generated SVG.

The surrounding interface also uses native labels, focus styles, status announcements, and keyboard-accessible controls.

## Security

User-provided Mermaid text is rendered with Mermaid's `securityLevel: 'strict'`. The editor does not enable diagram click callbacks or arbitrary HTML behavior. Basic formatting tags in labels are converted to plain text so they do not display literally.

## Technology

- React
- TypeScript
- Vite
- Mermaid

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

## Public-service design principles

1. **Useful examples first** — people can start from a relevant template or paste their own Mermaid text.
2. **Low barrier** — no sign-in or backend is required.
3. **Open output** — users can always keep the Mermaid source and SVG.
4. **Accessible meaning** — diagrams should carry text alternatives, not only pixels.
5. **Safe by default** — public input is rendered using Mermaid's strict security mode.
6. **Useful templates over feature overload** — grow the catalog from real teaching, writing, civic, and documentation needs.

## Suggested next phases

### Phase 2 — Guided builder

Add simple form-based builders for common tasks such as "steps in a process", "people and relationships", "events over time", and "who talks to whom". Users should be able to produce Mermaid without editing syntax at all.

### Later — Natural-language generation

Explore a responsive and affordable way to generate Mermaid from a written description before reintroducing this feature. The template library and editor work independently of it.

### Phase 3 — Community/public template library

Add reviewed templates for lesson plans, research methods, government service navigation, emergency procedures, public meeting processes, book planning, nonprofit workflows, and software documentation.

## License

Add a project license before the first public release/contribution campaign.
