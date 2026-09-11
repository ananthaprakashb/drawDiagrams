# DrawDiagrams

A free, browser-first Mermaid diagram studio designed for people who need to **explain something visually** — not only people who already know diagram syntax.

The initial public-service release is aimed at teachers, authors, nonprofit/civic teams, documentation writers, and developers. Users start from a purpose-driven template, edit plain text, see a live preview, add accessible context, and export the result.

## Why this project

Mermaid is powerful, portable, and text-based, but a blank Mermaid editor still assumes that the user already knows which diagram to choose and how to write it. DrawDiagrams adds a human-facing layer:

**Choose a purpose → change familiar words → preview → describe for accessibility → export/share.**

## MVP features

- Purpose-driven starter templates for teachers, authors, public-service teams, and technical users
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
| Technical | System request, Project plan | Sequence diagram, Gantt |

The template catalog is intentionally data-driven in `src/templates.ts` so community contributors can add useful patterns without changing the editor itself.

## Privacy model

The MVP is deliberately static and browser-only.

- Diagram editing and rendering happen in the browser.
- Drafts are stored in `localStorage` on the user's device.
- The core experience does not send diagram content to an application server.
- A share link stores the draft in the URL fragment. Users should still avoid putting sensitive information in URLs they plan to share.

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

1. **Plain language first** — people choose what they want to explain before learning syntax.
2. **Low barrier** — no sign-in or backend is required for core use.
3. **Open output** — users can always keep the Mermaid source and SVG.
4. **Accessible meaning** — diagrams should carry text alternatives, not only pixels.
5. **Safe by default** — public input is rendered using Mermaid's strict security mode.
6. **Useful templates over feature overload** — grow the catalog from real teaching, writing, civic, and documentation needs.

## Suggested next phases

### Phase 2 — Guided builder

Add simple form-based builders for common tasks such as "steps in a process", "people and relationships", "events over time", and "who talks to whom". Users should be able to produce Mermaid without editing syntax at all.

### Phase 3 — Explain-to-diagram assistance

Optionally let a user describe the idea in natural language and generate Mermaid, while keeping the browser editor and final Mermaid source as the source of truth. Any AI integration should be clearly separated from the private, local-only core editor.

### Phase 4 — Community/public template library

Add reviewed templates for lesson plans, research methods, government service navigation, emergency procedures, public meeting processes, book planning, nonprofit workflows, and software documentation.

## License

Add a project license before the first public release/contribution campaign.
