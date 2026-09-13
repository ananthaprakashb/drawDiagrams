# DrawDiagrams

A free, browser-first Mermaid diagram and structured infographic studio designed for people who need to **explain something visually** — not only people who already know diagram syntax.

The public-service release is aimed at teachers, authors, nonprofit/civic teams, documentation writers, and developers. Users can start from a template or paste Mermaid text, see a live preview, add accessible context, and export the result.

## Why this project

Mermaid is powerful, portable, and text-based. DrawDiagrams pairs a direct Mermaid editor with practical examples for teachers, authors, public-service teams, and developers:

**Choose a template or write Mermaid text → preview → describe for accessibility → export/share.**

## MVP features

- Purpose-driven starter templates for teachers, authors, public-service teams, and technical users
- Structured infographic templates for software engineers, data engineers, AI engineers, project managers, and management
- Layered-stack, comparison, roadmap, and pyramid infographic layouts edited as portable JSON
- Advanced BookNook use-case example with actors, a system boundary, subgraphs, and labeled relationships
- Direct Mermaid text editing and paste
- Live Mermaid preview
- Fit, actual-size and zoom controls for large diagrams; expand the preview and scroll to inspect details
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
| Technical | System request, System architecture, Project plan, Bookstore use-case map | Sequence diagram, Architecture, Gantt, Flowchart |

The template catalogs are intentionally data-driven in `src/templates.ts` and `src/infographicTemplates.ts` so community contributors can add useful patterns without changing the editor itself. Structured infographic JSON is validated and rendered as self-contained native SVG; it does not depend on external logo requests.

## Included infographic templates

| Audience | Templates | Layouts |
| --- | --- | --- |
| Software engineers | Software platform stack, Engineering delivery roadmap, Cloud security landscape, Full-stack SRE toolchain | Layered stack, Roadmap |
| Data engineers | Modern data platform, Modern data and AI ecosystem, Data quality pyramid | Layered stack, Pyramid |
| AI engineers | AI agent stack, AI system readiness | Layered stack, Comparison |
| Project managers | Project lifecycle, Project trade-off canvas | Roadmap, Comparison |
| Management | Management operating model, Delegation boundaries, Engineering career map | Layered stack, Pyramid |

Infographic documents use a small JSON schema with a title, optional subtitle and column labels, palette, layout, and two to twelve sections. Section content is XML-escaped before rendering. Four palettes and the four layouts above are available without network calls or additional assets.

The research basis and interpretation boundaries for the Tech Stack Ecosystem & Career Maps collection are recorded in [the content validation notes](docs/INFOGRAPHIC_CONTENT_VALIDATION.md).

The BookNook example is in `src/examples/booknook.mmd`. For SVG and PNG compatibility, the editor shows a self-contained person symbol in place of `fa:fa-user`, and converts flowchart `Admin --|> Author` to the supported `Admin -->|is a| Author` relationship. Mermaid 11 ignores a subgraph's `direction TB` when its nodes link outside that subgraph; these connections still render, but Mermaid controls their final layout. Use **Fit** for an overview, **100%** to read labels and scroll through the diagram, or **Expand preview** for more space. SVG export retains vector detail regardless of preview zoom. PNG renders up to 8192 pixels on its longest side with a 24-megapixel memory cap.

## Privacy model

The site is static and browser-only. Editing, rendering, and draft autosave happen locally; no diagram or infographic is sent to an application server. Share links encode the draft in the URL fragment, so avoid sharing sensitive information through links.

Natural-language generation is deferred for a later release. This release does not download an AI model or contact a hosted AI service.

An independent, **undeployed** [ChatGPT MCP service foundation](service/README.md) can turn Mermaid text written in ChatGPT into a link to this editor. It includes OAuth account checks and three free links per user per UTC week; it does not change the browser editor or implement payments. Public listing and billing require additional account, policy, and deployment work.

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
