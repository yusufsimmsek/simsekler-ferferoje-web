# ArchiFlow Full Product Audit - 2026-07-03

## Scope

This audit began immediately after creating the permanent agent system. The repository contains 663 files excluding `node_modules`, `.next`, and `project_analysis`; active product source areas inspected include `app`, `components`, `lib`, `test`, `docs`, `kentsel_automation`, and `.agents`.

## Agents Consulted

- CEO
- Product Manager
- UX Researcher
- Senior Software Architect
- Senior Frontend Engineer
- Senior Backend Engineer
- AI Engineer
- QA Lead
- Security Engineer
- Performance Engineer
- Knowledge Guardian

All requested agents completed an independent review. The Orchestrator consolidated duplicate findings and prioritized the backlog in `.agents/backlog.md`.

## First Multi-Agent Refresh

After the Knowledge Guardian agent was added, the Orchestrator ran the first refreshed multi-agent audit with four review lanes:

- Knowledge Guardian / Product Historian
- Senior Software Architect + Senior Backend Engineer + AI Engineer
- Senior Frontend Engineer + UX Researcher + Performance Engineer
- QA Lead + Security Engineer

The lanes agreed that the highest-impact next implementation was completing the platform state and persistence boundary before connecting the dashboard to the backend/data core.

## Verification Baseline

Commands run after the latest implementation pass:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm test`: passed, 26 files / 198 tests
- `npm run build`: passed, 26 app routes generated
- `python kentsel_automation\tests\smoke_test.py`: passed for safe temp-DB import path

No e2e test suite or e2e script was found.

Browser verification also passed for:

- Missing project deep link shows a `Proje bulunamadı` state and does not show the first available project.
- New-project wizard blocks an empty project name.
- New-project wizard blocks missing district/neighborhood/ada/parsel before moving beyond the parcel step.

## Consolidated Findings

1. P0: Product strategy and docs still point to the legacy AI Floor Plan Generator.
   - Evidence: `README.md`, `docs/PRODUCT_VISION.md`, `docs/USER_FLOW_SPECIFICATION.md`.
   - Impact: future sessions and buyer demos may optimize the wrong product.

2. P0: The 8.3 workflow is implemented as UI-local client state rather than a domain model.
   - Evidence: `Project`, `ProjectDraft`, `WorkflowStep`, `PlatformState`, and `workflowSteps` are declared inside `components/workspace/SnowArchitectPlatform.tsx`.
   - Impact: audit trail, backend integration, approvals, and tests are harder to make reliable.

3. P0: The polished Snow UI and the stronger kentsel automation backend are not connected.
   - Evidence: Snow UI uses local storage; `kentsel_automation` has project, engine run, warning, sharing, and offer package structures.
   - Impact: the main demo can look strong but cannot prove durable automation value.

4. P1: Offer generation and locking were able to bypass workflow prerequisites.
   - Evidence: previous `generateOffer` set `offerReady` without checking steps; previous lock mutated local state.
   - Resolution in this cycle: added offer-readiness gate and visible preflight blockers.

5. P1: Route state, deep links, and navigation are inconsistent.
   - Evidence: routes pass only `initialView`; in-app nav calls `setView`.
   - Resolution in this cycle: missing project IDs no longer fall back to the first project.

6. P1: Demo/old projects are not clearly distinguished from real user-created records.
   - Evidence: sample projects are loaded into the same array without a source label.

7. P1: Cost-bearing AI/API routes need production trust boundaries.
   - Evidence: plan generate/edit routes initially did not enforce route-level body limits or public-safe errors.
   - Resolution in this cycle: plan, validation, and export routes now share JSON/content-type/body-size guards and public-safe error envelopes.
   - Remaining risk: auth/session, owner scope, quota/rate limits, and CSRF/same-origin controls are still required before production provider-cost use.

8. P1: Editable notes appear accepted but are not persisted.
   - Evidence: textareas use `defaultValue`, while output reads `project.notes`.

9. P1: Accessibility/focus semantics need a pass.
   - Evidence: Snow controls lack focus-visible and selected-state patterns present in shared UI primitives.

10. P1: Performance risk is concentrated in one large client component imported by every route.
    - Evidence: all route pages mount `SnowArchitectPlatform`; existing diagnostics show high shared first-load JS.

11. P2: Public API responses expose developer diagnostics.
    - Evidence: workflow/export route responses previously exposed `developerMessage`.
    - Resolution in this cycle: plan and export route handlers now strip `developerMessage` from public error responses and include `requestId`.

12. P2: Export/PDF path is not Turkish-safe.
    - Evidence: PDF export strips non-ASCII characters.

13. P2: Test coverage does not yet cover the ArchiFlow Snow workflow.
    - Evidence: current Vitest suite focuses on AI floor-plan prototype and planning/export internals.

14. P1: Prototype backend/security boundaries are too permissive for deployment.
    - Evidence: the Python kentsel prototype exposes wildcard CORS and unauthenticated write/destructive routes; Next AI routes lack quota/rate-limit ownership checks.

15. P2: Upload UX currently records file names rather than durable file content.
    - Evidence: Snow UI file inputs store file name/type/status only.

## Implementation Completed In This Cycle

### Offer Gate Guardrail

Changed `components/workspace/SnowArchitectPlatform.tsx` so final offer generation requires completion through the quality-control step of the 8.3 workflow.

New behavior:

- Projects before required prerequisites no longer become `offerReady`.
- Clicking offer generation early opens the offer tab and shows missing workflow steps.
- Download and lock buttons require a final-ready offer.
- Lock operation has a defensive guard even if UI state is stale.
- Existing stale local storage cannot make an incomplete project appear final-ready unless workflow prerequisites are also met.

### Domain Extraction

Added `lib/domain/kentsel-workflow.ts` with the canonical 17-step workflow, offer prerequisite indexes, and offer readiness rules. Added unit tests for step order, blocked early offers, package generation readiness, and final readiness.

Added `lib/domain/project-selection.ts` so direct project routes cannot silently fall back to an unrelated project. Added tests that assert missing IDs return a missing state.

Added `lib/domain/project-wizard.ts` so new-project navigation and creation share the same required-field validation. Added tests for project name, district/neighborhood, ada/parsel, step jumping, and final creation.

Added `lib/domain/kentsel-project.ts` so project/file/activity contracts and workflow mutation rules are reusable outside the Snow UI. Added tests for step completion, offer package readiness mutation, non-regressing offer step behavior, and locked approval mutation.

### UI Reliability

Changed the Snow workspace so a missing deep-linked project shows a dedicated `Proje bulunamadı` screen with actions to open the project portfolio or create a new project.

Changed the new-project wizard so the sidebar cannot jump past missing required data and final project creation validates the same required fields.

### Product Canonicalization

Rewrote `README.md`, `docs/PRODUCT_VISION.md`, and `docs/USER_FLOW_SPECIFICATION.md` so ArchiFlow is described as the canonical kentsel dönüşüm proposal platform. Updated `package.json` description. The legacy AI floor-plan generator is now documented as a supporting subsystem rather than the main product.

### Premium Design And Motion

Added `docs/PREMIUM_DESIGN_AND_MOTION.md` and linked it from `AGENTS.md` and the Senior Frontend Engineer agent. Upgraded the Snow workspace with a premium architectural shell, refined card surfaces, responsive button feedback, focus rings, workflow-step micro-interactions, animated loading/progress/stat states, and a subtle drawing-grid motion layer.

Browser verification confirmed dashboard/workspace rendering with no horizontal overflow and no console errors.

### Knowledge Guardian

Added the permanent Knowledge Guardian agent as ArchiFlow's project historian and decision auditor. Updated `AGENTS.md`, `.agents/orchestrator.md`, `.agents/review-protocol.md`, `.agents/registry.md`, `.agents/audit-template.md`, and `.agents/README.md` so every implementation task must inspect relevant project knowledge before work begins and synchronize documentation when direction changes.

### Platform Persistence Boundary

Completed the P0 persistence/repository extraction recommended by the refreshed multi-agent audit.

New behavior:

- Platform state has a schema version and normalizes persisted projects before they reach UI state.
- Invalid persisted projects are filtered out.
- Stale `offerReady`, `locked`, and `status` values are derived from workflow progress instead of trusted from localStorage.
- Corrupted localStorage is removed by the repository adapter.
- `SnowArchitectPlatform` now delegates platform load/save behavior to `lib/platform/archiflow-local-storage-repository.ts`.
- Project creation and file type detection now live in `lib/domain/kentsel-project.ts`.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 25 files / 189 tests
- `npm run build`: passed

### Kentsel Backend Read Bridge

Started the next P0 by adding the first safe, optional read bridge from the Snow dashboard to the `kentsel_automation` data core.

New behavior:

- `lib/platform/kentsel-automation-api-repository.ts` fetches `GET /api/input-projects` and maps backend input project rows into `KentselProject` cards.
- The Snow dashboard attempts backend sync only when `NEXT_PUBLIC_KENTSEL_AUTOMATION_API_BASE_URL` is configured.
- If the backend is unavailable or not configured, the localStorage-backed repository remains the default behavior.
- Backend-derived projects merge by id without deleting local-only projects.
- Unit tests cover backend payload mapping, ready offer package mapping, fetch URL construction, and backend error behavior.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 26 files / 193 tests
- `npm run build`: passed

### Active Project Automation Readiness

Extended the P0 read bridge into the active Snow workspace without turning backend prototype data into local authoritative state.

New behavior:

- `fetchKentselAutomationProjectInsight` reads `GET /api/input-projects/{project_key}`, `GET /api/review-tasks?status=open`, and `GET /api/warnings?status=open` for the selected backend-backed project.
- Insight data remains sidecar UI state keyed by project id; it is not stored in `KentselProject` and is not persisted to localStorage.
- Backend-derived project cards are stripped from the localStorage payload so stale backend readiness cannot become authoritative when the backend is unavailable.
- Workspace and offer views now show backend run status, open review tasks, open warnings, sharing/allocation counts, package status, offer score, warning codes, and the highest-priority review task.
- Offer generation and version locking remain blocked when backend review tasks, warnings, or `review_required` flags are present.
- Missing parcel scope and unreadable readiness endpoints fail closed with `reviewRequired: true`.
- Final download/lock readiness now requires the offer package step, not only the prerequisite quality-control step.
- No backend POST/PATCH/write action was added.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 26 files / 198 tests
- `npm run build`: passed
- `python kentsel_automation\tests\smoke_test.py`: passed for temp-DB import smoke only; the running API smoke path intentionally was not executed because it performs prototype backend writes.

### Engineering Operating System v1.0

Expanded the permanent agent system into the requested ArchiFlow Engineering Operating System v1.0.

New durable structure:

- `AGENTS.md` now names the Engineering Operating System as the permanent development methodology.
- `.agents/*.md` now includes canonical role files for Orchestrator, CEO, Product Manager, Knowledge Guardian, Senior Architect, Principal Product Designer, Design Critic, Motion Designer, Frontend Engineer, Backend Engineer, AI Engineer, UX Researcher, QA Lead, Security Engineer, Performance Engineer, and Innovation Director.
- `.standards/*.md` now defines UI, UX, architecture, AI, testing, performance, security, accessibility, and animation standards.
- `.reviews/*.md` now defines design, architecture, QA, and release gates.
- `.agents/registry.md`, `.agents/orchestrator.md`, `.agents/review-protocol.md`, and `.agents/audit-template.md` route future work through the v1.0 operating model.

Verification:

- Every canonical agent file contains mission, responsibilities, authority, review checklist, quality standards, decision rules, escalation rules, success criteria, and report format.
- Required `.standards` and `.reviews` files are present.

### Multi-Agent Audit v1.0

Activated the new operating system and ran the first v1.0 multi-agent audit lanes:

- CEO, Product Manager, Knowledge Guardian, Innovation Director
- Senior Architect, Backend Engineer, Security Engineer, AI Engineer
- Principal Product Designer, Design Critic, Motion Designer, Frontend Engineer, UX Researcher, Performance Engineer
- QA Lead and release-readiness review

Deduped findings added or reaffirmed:

- P0: guarded kentsel backend write/auth/ownership/audit boundary remains the highest-value platform unlock.
- P1: route-aware Snow navigation and module splitting remain important for product correctness, accessibility, and performance.
- P1: project notes must be persisted or rendered read-only.
- P1: demo/archive/real/backend project source semantics must be explicit.
- P1: CI/release automation is missing for the Engineering Operating System gates.
- P2: legacy architecture docs and `.af-*` global CSS still need canonicalization or isolation.

### Public-Safe API Route Guards

Implemented the highest-value narrow security improvement identified during the audit before attempting larger backend write work.

New behavior:

- `lib/api/json-route-guard.ts` provides shared JSON route guards for content type, body-size limit, malformed JSON, request IDs, and public-safe error envelopes.
- `lib/api/ai-plan-route-guard.ts` now builds on the shared guard and strips AI workflow `developerMessage` details from public responses.
- `/api/plan/generate`, `/api/plan/edit`, `/api/plan/validate`, `/api/export/png`, and `/api/export/pdf` reject non-JSON, malformed JSON, and oversized request bodies before workflow execution.
- Plan and export errors now return public `code`, `message`, `requestId`, `retryable`, `validation`, `issues`, and `warnings` without `developerMessage`.
- Client-side plan/export error types now tolerate public-safe responses and preserve `requestId` in local diagnostics.
- `npm run test:ai` now includes the AI plan route guard tests.

Verification:

- `npm run typecheck`: passed
- Focused route/export/AI tests: passed, 5 files / 34 tests
- `npm run test:ai`: passed, 14 files / 122 tests
- `npm run lint`: passed
- `npm test`: passed, 28 files / 207 tests
- `npm run build`: passed
- `python kentsel_automation\tests\smoke_test.py`: passed for temp-DB import smoke

### Product/Design Phase: Intentional Empty States And Project Reality

After the user paused the P0 security/write gateway, the Orchestrator shifted the active phase to product architecture, architect workflow, information architecture, dashboard structure, workspace experience, premium visual design, design-system consistency, motion/micro-interactions, AI-assisted architectural workflows, and empty/loading/error states.

Lead review roles:

- Product Manager
- Principal Product Designer
- Design Critic
- Motion Designer
- UX Researcher
- Frontend Engineer
- Innovation Director
- Knowledge Guardian
- Passive Security Engineer

Key findings:

- P1: ArchiFlow was still at risk of showing demo/static-looking module rows when no active project was selected.
- P1: Some demo entry points used language that made sample data feel like old real projects.
- P1: Some AI empty-state copy overpromised help before a real AI-assisted intake/provenance flow exists.
- P2: A missing active project could collapse into the first available project, making modules/workspace feel real before the architect selected a project.
- P2: The dashboard trend chart was operational-looking static data without a representative label.
- P3: Some secondary empty states explained absence but did not name the next action.

Implementation completed:

- Added explicit project source semantics: `Demo`, `Taslak`, `Gerçek`, `Backend`, and `Arşiv`.
- Labeled project cards/tables and workspace headers with source badges.
- Backend-mapped projects now carry `Backend` source, user-created drafts carry `Taslak`, locked versions carry `Arşiv`, and sample records carry `Demo`.
- Persisted editable workflow/offer notes through project state so offer output reads the latest architect note.
- Changed active-project selection so no active id means no active project, not the first project in the portfolio.
- Replaced module table placeholder rows with project-connected rows when an active project exists and a premium module empty state when it does not.
- Removed static module row data from module definitions so fake rows cannot accidentally return.
- Added intentional empty states for dashboard, portfolio, search results, no-active-project workspace, missing project, project files, project activity, and module screens.
- Updated every main empty state to answer: what is happening, why there is no data, what the architect should do next, and how AI can help once project data exists.
- Replaced overclaiming AI CTAs with `Proje sihirbazını aç` and softer AI copy tied to project data/provenance readiness.
- Replaced old/demo language with explicit `Demo portföyü` language.
- Labeled the dashboard line chart as a representative rhythm until real activity-derived trend data exists.
- Updated right-rail notification/activity/start-guide states so empty accounts feel intentional instead of unfinished.
- Made project-wizard apartment-mix preference buttons interactive with selected state and persisted architect-note output.
- Kept the P0 security gateway visible in `.agents/backlog.md` but paused for this phase per user direction.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 28 files / 209 tests
- `npm run build`: passed, 26 app routes generated
- Browser verification passed for empty dashboard, empty portfolio, no-active-project workspace, module empty state, demo/source labeling, no AI overclaim CTA, representative trend labeling, and wizard apartment-mix preference selection/notes.

### Product/Design Phase: AI-Ready Project Intake

The next product/design priority transformed the new-project wizard from a simple form into an architect-focused intake flow while preserving the documented AI safety posture.

Lead review roles:

- Product Manager
- Knowledge Guardian
- UX Researcher
- Principal Product Designer
- Design Critic
- Motion Designer
- Frontend Engineer
- AI Engineer

Knowledge Guardian decision:

- The intake must follow the documented kentsel dönüşüm sequence: parcel -> zoning/imar -> depth/hmax -> old plans/metraj -> core/apartment mix -> share allocation -> proposal.
- It may show deterministic brief, missing data, provenance, next module, architect notes, daire preference, and human approval because those are derived from user input and domain rules.
- It must not claim that AI has designed, extracted, or approved anything without a real provider run, timestamp, confidence, and evidence metadata.
- Intake readiness must not drive offer readiness; the canonical 17-step workflow gate remains the source of truth.

Implementation completed:

- Added `lib/domain/project-intake.ts` as the deterministic intake analyzer.
- The analyzer produces project brief, missing-data checklist, suggested next steps, provenance/source tracking, human approval requirement, architect notes, daire karması preference, readiness score, and next module recommendation.
- Added safe normalization for persisted intake snapshots.
- Extended `KentselProject` so created projects can carry an optional intake summary snapshot.
- Updated the wizard to show a premium live intake side panel with readiness score and kentsel stage path.
- Added review-step panels for brief, checklist, provenance, suggested next steps, human approval, architect notes, and daire preference.
- Changed file intake copy and provenance to state that only file name/type are recorded until backend extraction exists.
- Replaced AI-risky copy with `Kural tabanlı intake ön kontrolü` and no-overclaim language.
- Improved accessibility with progressbar semantics, alert role for validation, and radio-group semantics for daire karması preference.
- Added workspace `Intake izi` snapshot with an actionable next-module CTA.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 29 files / 216 tests
- `npm run build`: passed, 26 app routes generated
- Browser verification passed for wizard intake header, kentsel stage path, project brief, missing-data checklist, source/provenance tracking, human approval requirement, daire karması radio selection, persisted workspace intake snapshot, next-module CTA, and no AI overclaim copy.

### Product/Design Phase: Original Light Architectural Visual Rebuild

The user provided reference images only as a maturity bar and explicitly prohibited reproduction. The Orchestrator treated this as a product/design-system reconstruction task, not as a screen-copy task.

Lead review roles:

- Product Manager
- Knowledge Guardian
- UX Researcher
- Principal Product Designer
- Design Critic
- Motion Designer
- Frontend Engineer
- Innovation Director

Knowledge Guardian decision:

- The implementation must keep the documented 8.3 workflow, AI no-overclaim posture, provenance requirements, and human approval gates intact.
- The reference images may inform quality, spacing, hierarchy, and maturity only; ArchiFlow needs its own recognizable product language.
- The safest highest-impact move is a shared visual-system foundation before rewriting individual module screens.

Implementation completed:

- Recast the `snow` Tailwind tokens from dark dashboard tokens into light architectural operating-system tokens.
- Added an original `ArchiFlow Light Atelier` global skin: white paper surfaces, technical grid texture, precise borders, calmer shadows, semantic ink hierarchy, and restrained electric blue/purple/cyan/emerald accents.
- Added scoped compatibility overrides for legacy `text-white/*`, `bg-white/*`, and `border-white/*` utilities so the existing 3k-line workspace can move safely into the light system without a risky one-shot rewrite.
- Removed nonfunctional-looking header chrome (`Sun`, `Settings`, `Bell`, decorative panel/star icons) and replaced it with a clearer ArchiFlow OS header and `Kural tabanlı destek` status.
- Retoned the representative dashboard chart and schematic plan preview so they read as architectural work surfaces rather than dark SaaS widgets.
- Added a visible dashboard H1 and product-context copy so `/dashboard` opens as a mimari operasyon paneli instead of a generic date filter.
- Reduced decorative grid intensity after browser review so the technical drawing texture sits behind the work instead of competing with text.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 29 files / 216 tests
- `npm run build`: passed, 26 app routes generated
- Browser verification passed for `/projects/new`, `/dashboard`, `/projects`, `/reports`, and `/files` with no console errors, no horizontal overflow, and no Turkish mojibake.
- Browser interaction check passed: the wizard blocks an empty project with `Proje adı zorunlu.`, then moves to `Parsel` after required first-step fields are filled.

### Product/Design Phase: Direct Reference-Screen Reconstruction

The user rejected the previous original-only interpretation and explicitly requested direct copies of the provided pages. The Orchestrator treated the newest instruction as the current product decision.

Lead review roles:

- Product Manager
- Knowledge Guardian
- UX Researcher
- Principal Product Designer
- Design Critic
- Motion Designer
- Frontend Engineer

Knowledge Guardian decision:

- The earlier report section said the references were only a maturity bar because that was the prior user instruction.
- The latest user instruction supersedes that direction for the product/design phase.
- Implementation may now closely reconstruct the provided dashboard/project-page composition while preserving the documented kentsel workflow, Turkish UI, human approval gates, provenance posture, and no-AI-overclaim rules.
- Documentation/backlog must record this direction change so future sessions do not continue optimizing for an original-only skin.

Implementation completed:

- Reworked the workspace shell toward the provided reference: full white app surface, fixed left navigation, top search/action bar, profile cluster, grouped work/tool navigation, and reference-like sidebar CTA.
- Rebuilt `/dashboard` around the reference layout: greeting hero, stat tiles, architectural building visualization, floating analysis badges, process guide, six workflow cards, portfolio donut, apartment-type bar chart, area summary, and dark metric rail.
- Rebuilt `/projects` around the reference layout: page header, filter chips, action controls, six stat tiles, and image-led project cards with status badges, mini metrics, progress, team avatars, and architectural preview renders.
- Strengthened the ArchiFlow logo lockup, hero building illustration, floating badge contrast, card density, and responsive behavior.
- Moved the right rail to a wider breakpoint so 1440px workspace layouts do not collapse the main content.
- Kept empty/project-source/no-overclaim behavior from previous product phase intact.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 29 files / 216 tests
- `npm run build`: passed, 26 app routes generated
- Browser verification passed for `/dashboard` and `/projects`: dashboard H1 present, project H1 present, reference hero present, building preview present, project cards present, logo text present, no horizontal overflow, and no Turkish mojibake.

### Product/Design Phase: Reference Module Work Surfaces

After the core shell/dashboard/project portfolio pass, the Orchestrator continued into the remaining workflow modules instead of stopping at one screen.

Implementation completed:

- Added a reusable reference-module rendering system for active-project module routes.
- Rebuilt module headers around the provided reference pattern: breadcrumb, large Turkish page title, status badge, project location line, report/export/new-action controls, and horizontal tabs.
- Added six-card metric bands for the major reference modules.
- Added module-specific primary work surfaces:
  - Parseller and Imar Analizi: map-like parcel analysis surface.
  - Derinlik & Hmax: 3D building/depth analysis surface.
  - Metraj: area-distribution surface.
  - Cekirdek Kutuphanesi: core-library card surface.
  - Daire Karmasi: apartment-mix distribution surface.
  - Paylasim & Hesap: financial/share distribution surface.
  - Teklif & Raporlar: offer/report status surface.
  - Dosyalar and Eski Planlar: evidence/file and plan-reading surfaces.
- Added reference-like detail tables, side summaries, quick actions, and related documents for the module family.
- Preserved the no-active-project empty-state behavior so modules still do not fabricate project data when no active project exists.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 29 files / 216 tests
- `npm run build`: passed, 26 app routes generated
- Browser verification passed for `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, `/files`, and `/plans`: expected H1 present, reference table present, cards rendered, no horizontal overflow, and no mojibake.

### Product/Design Phase: Experience-First Architectural Workspaces

The user rejected the remaining dashboard-first mindset and set a higher bar: every page should begin with an architectural experience, not cards, tables, lists, or statistics.

Lead review roles:

- Product Manager
- Knowledge Guardian
- UX Researcher
- Principal Product Designer
- Design Critic
- Motion Designer
- Frontend Engineer
- Innovation Director

Knowledge Guardian decision:

- This does not change the 8.3 workflow, offer gates, provenance posture, or no-AI-overclaim rules.
- It changes the product-experience standard: major modules must open with unique visual context before data appears.
- The documentation/backlog must record that ArchiFlow is no longer optimizing for dashboard composition; it is optimizing for professional architectural workspace experiences.

Implementation completed:

- Added an experience-first module hero system with large architectural visualization, blueprint grid, contextual AI panel, visual story steps, subtle scan/glint motion, and reduced-motion support.
- Added unique experience identities:
  - Projects: project portfolio gallery, building preview, visual progress timeline.
  - Parcels: GIS parcel surface with zoning overlays.
  - Zoning analysis: blueprint/regulation overlay surface.
  - Depth & Hmax: building mass and height/setback visualization.
  - Existing plans: scanned drawing/OCR visualization.
  - Metraj: area heatmap visualization.
  - Core library: 3D core/floorplate preview.
  - Apartment mix: stacked apartment distribution visualization.
  - Share allocation: ownership/apartment allocation graphic.
  - Proposal: booklet/report presentation preview.
  - Files: source/evidence vault visualization.
- Moved statistics, tables, and cards below the opening visual experience for project/module pages.
- Reduced the page-title dominance inside module pages and added calmer hierarchy, more whitespace, and more deliberate story rhythm.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 29 files / 216 tests
- `npm run build`: passed, 26 app routes generated
- Browser verification passed for `/plans`, `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, and `/files`: each route starts with `.af-experience-hero`, includes scene SVG, AI panel, story steps, no horizontal overflow, and no mojibake; stat cards appear after the hero.
- `/projects` returned HTTP 200 and passed production build. The in-app browser automation timed out twice while navigating to `/projects` after a session reset, so visual browser confirmation for that route remains a residual QA follow-up even though code and build checks passed.

### Product/Design Phase: Premium Raster Visual Asset Pass

The user rejected SVG placeholder artwork and required premium visual content as the primary identity of every module.

Lead review roles:

- Orchestrator
- Knowledge Guardian
- Visual Asset Director
- Principal Product Designer
- Design Critic
- Motion Designer
- Frontend Engineer
- Performance Engineer

Knowledge Guardian decision:

- This does not change the 8.3 workflow, offer gates, provenance posture, or no-AI-overclaim rules.
- It adds a stronger visual asset standard: simple SVG drawings, wireframe-like blueprints, and generic placeholder graphics are not acceptable as final hero artwork.
- Visual asset provenance must be documented so future sessions understand which assets are intentional product visuals and which surfaces remain secondary diagrams.

Implementation completed:

- Added the permanent Visual Asset Director agent and a mandatory visual-asset standard.
- Generated an original premium architectural raster asset sheet and derived module-specific hero covers under `public/visual-assets/archiflow/`.
- Added `public/visual-assets/archiflow/README.md` with provenance and module mapping.
- Replaced the project portfolio hero and every module experience hero with `.af-premium-asset-*` raster backgrounds instead of SVG scene renderers.
- Removed the legacy SVG hero scene renderer block from `SnowArchitectPlatform`.
- Replaced project card SVG-style render illustrations with raster architectural asset cards.
- Preserved the AI panel, story steps, glint/scan motion, reduced-motion behavior, and the data-after-experience page structure.

Verification:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 29 files / 216 tests
- `npm run build`: passed, 26 app routes generated
- Browser verification passed for `/projects`: hero uses `projects.jpg`; visible project cards use `projects.jpg`, `hmax-mass.jpg`, `apartment-stack.jpg`, and `zoning-blueprint.jpg`.
- Browser verification passed for `/plans`, `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, and `/files`: each route has a visible `.af-premium-asset-*` hero loading from `/visual-assets/archiflow/*.jpg`.

Residual visual debt:

- Some lower supporting surfaces remain schematic diagrams or chart-like previews. They are no longer the primary visual identity, but the next Visual Asset Director pass should convert them into real interactive previews or clearly supporting diagrams.

### Product/Design Phase: Design Critic Foundation Polish

The user paused feature/page creation and redirected the phase to Design QA. The Design Critic became the primary reviewer and rejected the existing V0 foundation wherever it still felt cramped, generic, oversized, clipped, or unfinished.

Lead review roles:

- Design Critic
- Principal Product Designer
- UX Researcher
- Motion Designer
- Frontend Engineer
- QA Lead
- Knowledge Guardian

Ten-pass Design QA lenses applied:

- Visual hierarchy
- Spacing
- Typography
- Grid system
- Component consistency
- Color balance
- Animation quality
- Architect experience
- Premium feel
- Overall product quality

Knowledge Guardian decision:

- This pass does not introduce new product features, new pages, new workflow gates, or new AI claims.
- It aligns implementation with the documented premium UI, UX, accessibility, and no-template design standards.
- The audit report and backlog must record the polish pass because it changes the quality baseline future work must preserve.

Findings:

- Metric cards on six-card module rows were too narrow at common desktop widths and clipped currency or area values.
- Some metric cards used full-surface purple fills, making secondary numbers compete with primary visual experiences.
- The project wizard grid stretched panels to the height of the assistant rail and made the first step feel unfinished.
- The project detail workflow used cramped side-by-side layout at 1440px, causing the selected-step detail to feel squeezed and previously allowing screenshot-level overlap.
- The dashboard dark metric rail used truncation on a label where wrapping was the more premium choice.
- Mobile module content used hidden 760px/810px minimum widths inside grid children, producing horizontal scroll surfaces instead of responsive cards.
- Mobile project detail kept the workflow list at 720px before showing selected-step context, delaying the architect's next action.

Implementation completed:

- Replaced fixed six-column metric bands with a reusable `af-stat-grid`.
- Rebuilt `StatCard` visual priority: white card surface, subtle accent line, compact tabular values, calmer labels, and large Turkish currency compaction into `Mn` units with full value preserved in the `title`.
- Added mobile stat-card sizing rules so values no longer overflow at narrow widths.
- Changed the project wizard to `items-start`, made setup steps sticky only on desktop, and capped the assistant rail height with internal scroll.
- Reworked project detail breakpoints so the main workflow gets full width until 2XL and the selected-step detail is visible at 1440px.
- Reduced mobile workflow-list maximum height so selected-step context appears sooner.
- Removed truncation from the dashboard dark metric rail label.
- Added `min-w-0` discipline to module grids and cards so mobile module cards fit the viewport while tables keep their own internal scroll.

Browser verification:

- Desktop 1440px: `/projects`, `/dashboard`, `/projects/new`, `/plans`, `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, `/files`, and `/projects/PRJ-4300-02` show no horizontal page overflow and no detected stat-card clipping.
- Desktop project detail: selected workflow detail is visible in the first viewport; the selected heading expanded from a cramped 360px area to a 691px area at 1440px.
- Mobile 506px: module cards on `/site-analysis`, `/apartment-mix`, `/comparisons`, `/reports`, `/files`, and `/plans` now fit the 451px content column instead of expanding to 810px.
- Mobile project detail: workflow list is capped at 420px, selected detail appears around the first extended viewport, and horizontal overflow remains 0.
- Dashboard: dark metric rail no longer reports truncated label overflow.

Command verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 29 files / 216 tests.
- `npm run build`: passed, 26 app routes generated.
- Final browser regression passed for `/projects`, `/dashboard`, `/projects/new`, `/site-analysis`, `/apartment-mix`, `/comparisons`, `/reports`, and `/projects/PRJ-4300-02` at 1440px, plus `/site-analysis`, `/apartment-mix`, `/comparisons`, `/reports`, and `/projects/PRJ-4300-02` at 506px: overflow 0, stat issues 0, detected text issues 0.

## Next Recommended Implementation

The Orchestrator recommends the next highest-value product/design item while the P0 security/write gateway remains paused:

P1: turn the new premium raster experience heroes into interactive architectural tools.

The pages now begin with visual experience. The next product/design implementation should make those scenes interactive: GIS layer toggles, 3D mass controls, OCR comparison mode, heatmap filters, core selection, apartment stack hover/selection, allocation review flow, and proposal presentation navigation.

Parallel P1 design/engineering candidates:

- Add route-level visual/e2e coverage for empty dashboard, empty portfolio, no-active-project workspace, module empty states, and no AI overclaim copy.
- Continue route-aware Snow navigation consistency and eventual component splitting.
