# ArchiFlow Agent Backlog

This backlog is maintained by the Orchestrator after agent reviews.

## Priority Scale

- P0: Blocks product correctness, security, data integrity, or core user flow.
- P1: High product value or serious reliability/usability risk.
- P2: Meaningful improvement with moderate risk or value.
- P3: Polish, cleanup, or future hardening.

## Active Backlog

1. P0: Connect the Snow dashboard/workspace to the kentsel backend/data core.
   - Evidence: Snow now has optional read bridges for backend project cards and active-project automation readiness, but backend writes, auth, ownership, CSRF/rate limits, and durable audit semantics are still not integrated.
   - Current phase note: user explicitly paused the P0 security/write gateway during the product/design phase; keep this item visible but do not prioritize it until product experience work yields.
   - Owner: Backend Engineer + Senior Architect.
   - Acceptance: create/update project, review decision, warning update, and engine-run actions are available only through authenticated, owner-scoped, auditable, rate-limited backend paths.

2. P1: Build one real auditable offer package path.
   - Evidence: current download creates a client-side text blob; backend schema already models offer package JSON and scores.
   - Owner: Backend Engineer + QA Lead.
   - Acceptance: generated package includes evidence references, calculation/share summary, approval note, immutable version metadata, and downloadable artifact.

3. P1: Fix route registry/navigation consistency.
   - Evidence: every route renders `SnowArchitectPlatform` with `initialView`; in-app navigation mutates state without URL changes and omits some routes.
   - Owner: Frontend Engineer.
   - Acceptance: one route registry includes all screens; sidebar/mobile nav use route-aware navigation or explicit URL sync.

4. P1: Add production trust boundaries for cost-bearing AI/API routes.
   - Evidence: `/api/plan/generate`, `/api/plan/edit`, `/api/plan/validate`, `/api/export/png`, and `/api/export/pdf` now have JSON/content-type/body-size guards and public-safe error envelopes, but provider-cost routes still lack auth/session, ownership, quota/rate limits, and CSRF/same-origin policy.
   - Current phase note: paused by user while product system design, UX architecture, visual design, motion, and full workspace experience are prioritized.
   - Owner: Security Engineer + Backend Engineer.
   - Acceptance: production mode has auth/session checks, owner scope, rate limits/quotas, and CSRF/same-origin controls for provider-cost routes.

5. P1: Derive dashboard trend and portfolio rhythm from real activity.
   - Evidence: the trend chart is now labeled as representative, but it still does not derive from project activity, progress history, backend runs, or offer events.
   - Owner: Frontend Engineer + Performance Engineer.
   - Acceptance: dashboard trends are computed from auditable project/activity events or remain explicitly representative in non-production/demo contexts.

6. P1: Turn premium module visuals into interactive architectural tools.
   - Evidence: projects and the main workflow module routes now open with premium raster architectural hero visuals instead of SVG placeholders, but the next pass should deepen the actual interaction model behind those visuals: map pan/zoom, 3D mass controls, OCR compare mode, heatmap toggles, apartment stack selection, allocation drag/review, and proposal presentation mode.
   - Owner: Visual Asset Director + Principal Product Designer + Frontend Engineer + UX Researcher.
   - Acceptance: every major module has a memorable opening experience plus working visual controls, not only a static hero, while preserving workflow gates, provenance, performance, accessibility, and no-AI-overclaim posture.

7. P1: Improve accessibility semantics and focus states in Snow UI.
   - Evidence: Snow buttons/nav controls lack the stronger focus/ARIA pattern used by shared UI primitives.
   - Owner: Frontend Engineer + UX Researcher.
   - Acceptance: primary controls have focus-visible states, selected nav state, and accessible labels.

8. P1: Split `SnowArchitectPlatform` into route/module chunks.
   - Evidence: every route imports one large `use client` component and existing diagnostics show high shared first-load JS.
   - Owner: Performance Engineer + Frontend Engineer.
   - Acceptance: shell, auth, dashboard, wizard, workspace, and module screens are lazily or route-split, with bundle diagnostics tracked.

9. P1: Add CI/release automation for the Engineering Operating System gates.
    - Evidence: `.github` automation is absent while `.reviews/release-checklist.md` requires lint, typecheck, build, tests, and relevant integration/e2e checks before release.
    - Owner: QA Lead + Orchestrator.
    - Acceptance: one CI or local `verify` command runs the release gate and blocks failing lint, typecheck, unit, build, backend smoke, and e2e checks when available.

10. P2: Make PDF/export paths Turkish-safe.
    - Evidence: PDF export currently strips non-ASCII characters.
    - Owner: Backend Engineer.
    - Acceptance: Turkish text fixtures pass PDF/export tests with preserved characters.

11. P2: Add route/integration/e2e tests for ArchiFlow workflow.
    - Evidence: current tests cover floor-plan/AI prototype; no tests cover Snow account -> project -> workflow -> offer -> lock.
    - Owner: QA Lead.
    - Acceptance: repeatable tests verify the core workflow and offer gate behavior.

12. P2: Add AI provider provenance and stricter production config behavior.
    - Evidence: local-provider edits can use deterministic mock classification while metadata may not make that clear; OpenAI misconfiguration falls back to mock.
    - Owner: AI Engineer.
    - Acceptance: metadata exposes deterministic fallback and production mode fails closed for missing provider credentials.

13. P2: Canonicalize remaining legacy architecture and design documents.
   - Evidence: primary product docs are now ArchiFlow-first, but older architecture/design reports still contain AI-floor-plan-first assumptions that can mislead future work.
   - Owner: Knowledge Guardian + Product Manager.
   - Acceptance: legacy docs are either updated, clearly labeled as subsystem-only, or linked to canonical ArchiFlow product decisions.

14. P2: Remove or isolate unused legacy `.af-*` global CSS.
    - Evidence: `app/globals.css` still ships old landing styles to every route.
    - Owner: Performance Engineer + Frontend Engineer.
    - Acceptance: global CSS contains only active global styles, or legacy styles are route-scoped.

15. P2: Add route-level visual/e2e coverage for intentional empty states.
    - Evidence: browser verification confirms dashboard, portfolio, module, and workspace empty states, but there is no automated e2e suite guarding these UX contracts.
    - Owner: QA Lead + Frontend Engineer.
    - Acceptance: e2e or component-level tests verify account creation, empty dashboard, empty portfolio, no-active-project workspace, module empty states, demo source labels, and no AI overclaim copy.

16. P2: Replace remaining secondary schematic surfaces with data-backed previews.
    - Evidence: primary module heroes and project cards now use raster architectural assets, but some lower supporting surfaces still use CSS/SVG-style schematic charts or mock operational previews.
    - Owner: Visual Asset Director + Frontend Engineer + Performance Engineer.
    - Acceptance: secondary visuals either become real previews from project data/files or are clearly treated as supporting diagrams, never as final placeholder artwork.

## Completed

1. P0: Add permanent multi-agent engineering system.
   - Files: `AGENTS.md`, `.agents/**`.
   - Verification: expected agent files and required sections present.

2. P0: Prevent final offer generation and version locking before required 8.3 prerequisites.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed after implementation.

3. P0: Extract canonical 8.3 workflow and offer readiness rules into a reusable domain module.
   - Files: `lib/domain/kentsel-workflow.ts`, `test/unit/kentsel-workflow.test.ts`, `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: unit tests cover the 17-step sequence, offer prerequisites, and final readiness.

4. P1: Prevent wrong-project deep links from opening another project and tighten new-project wizard validation.
   - Files: `lib/domain/project-selection.ts`, `lib/domain/project-wizard.ts`, `test/unit/project-selection.test.ts`, `test/unit/project-wizard.test.ts`, `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` passed; browser check confirmed missing project ID shows a not-found state and wizard blocks empty required fields.

5. P0: Canonicalize product strategy around ArchiFlow Kentsel Dönüşüm Teklif Platformu.
   - Files: `README.md`, `docs/PRODUCT_VISION.md`, `docs/USER_FLOW_SPECIFICATION.md`, `package.json`.
   - Verification: product docs now describe account creation, empty dashboard, project portfolio, 17-step workflow, offer package, and locked approval as the canonical product; legacy AI floor-plan capability is labeled as a supporting subsystem.

6. P0: Extract project/file/activity contracts and workflow mutation rules into the domain layer.
   - Files: `lib/domain/kentsel-project.ts`, `test/unit/kentsel-project.test.ts`, `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` passed; tests cover workflow step completion, offer-ready mutation, non-regressing offer package step, and locked approval mutation.

7. P1: Add premium design and motion standard and upgrade the Snow workspace interaction layer.
   - Files: `docs/PREMIUM_DESIGN_AND_MOTION.md`, `AGENTS.md`, `.agents/roles/senior-frontend-engineer.md`, `app/globals.css`, `tailwind.config.ts`, `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` passed; browser check confirmed dashboard/workspace render premium shell, card, button, stat, progress, loading, and workflow-step classes with no horizontal overflow or console errors.

8. P0: Add permanent Knowledge Guardian agent for project memory and decision consistency.
   - Files: `.agents/knowledge-guardian.md`, `.agents/roles/knowledge-guardian.md`, `AGENTS.md`, `.agents/README.md`, `.agents/registry.md`, `.agents/orchestrator.md`, `.agents/review-protocol.md`, `.agents/audit-template.md`.
   - Verification: role file includes mission, responsibilities, authority, review checklist, quality standards, decision rules, escalation rules, success criteria, and report format; Orchestrator and review protocol now require Knowledge Guardian before implementation.

9. P0: Complete persistence/repository extraction for platform state.
   - Files: `lib/domain/archiflow-platform-state.ts`, `lib/domain/kentsel-project.ts`, `lib/platform/archiflow-local-storage-repository.ts`, `components/workspace/SnowArchitectPlatform.tsx`, `test/unit/archiflow-platform-state.test.ts`, `test/unit/archiflow-local-storage-repository.test.ts`, `test/unit/kentsel-project.test.ts`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (25 files / 189 tests), and `npm run build` passed; project creation, file type detection, storage loading/saving/clearing, stale offer/lock normalization, and corrupted localStorage cleanup are covered by unit tests.

10. P0: Add first optional kentsel backend/data-core read bridge for project cards.
   - Files: `lib/platform/kentsel-automation-api-repository.ts`, `components/workspace/SnowArchitectPlatform.tsx`, `test/unit/kentsel-automation-api-repository.test.ts`, `.env.example`, `README.md`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (26 files / 193 tests), and `npm run build` passed; adapter maps backend `input_projects` into ArchiFlow project cards and dashboard sync is opt-in through `NEXT_PUBLIC_KENTSEL_AUTOMATION_API_BASE_URL`.

11. P0: Add read-only active-project automation readiness bridge.
   - Files: `lib/platform/kentsel-automation-api-repository.ts`, `components/workspace/SnowArchitectPlatform.tsx`, `test/unit/kentsel-automation-api-repository.test.ts`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (26 files / 198 tests), `npm run build`, and safe kentsel temp-DB import smoke passed; active project insight fetches project detail, open review tasks, warnings, sharing/allocation counts, package status, and offer score without POST/PATCH writes or localStorage persistence; missing parcel scope and failed readiness reads now fail closed.

12. P0: Expand the permanent agent system into ArchiFlow Engineering Operating System v1.0.
   - Files: `AGENTS.md`, `.agents/*.md`, `.standards/*.md`, `.reviews/*.md`, `.agents/registry.md`, `.agents/review-protocol.md`, `.agents/audit-template.md`.
   - Verification: canonical agent files exist for Orchestrator, CEO, Product Manager, Knowledge Guardian, Senior Architect, Principal Product Designer, Design Critic, Motion Designer, Frontend Engineer, Backend Engineer, AI Engineer, UX Researcher, QA Lead, Security Engineer, Performance Engineer, and Innovation Director; every canonical agent file includes mission, responsibilities, authority, review checklist, quality standards, decision rules, escalation rules, success criteria, and report format.

13. P1: Add public-safe JSON route guards for plan, validation, and export APIs.
   - Files: `lib/api/json-route-guard.ts`, `lib/api/ai-plan-route-guard.ts`, `app/api/plan/generate/route.ts`, `app/api/plan/edit/route.ts`, `app/api/plan/validate/route.ts`, `app/api/export/png/route.ts`, `app/api/export/pdf/route.ts`, `lib/projects/create-project-client.ts`, `lib/projects/edit-project-client.ts`, `lib/export/client-export.ts`, `lib/export/service.ts`, `test/unit/ai-plan-route-guard.test.ts`, `test/unit/api-route-guard.test.ts`, `package.json`.
   - Verification: `npm run typecheck`, focused route/export/AI tests (5 files / 34 tests), `npm run test:ai` (14 files / 122 tests), `npm run lint`, `npm test` (28 files / 207 tests), `npm run build`, and `python kentsel_automation\tests\smoke_test.py` passed; public route errors now return code/message/requestId without `developerMessage`, and guarded routes reject non-JSON, malformed JSON, and oversized bodies before workflow execution.

14. P1: Complete the first product/design empty-state and project-reality pass.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `lib/domain/kentsel-project.ts`, `lib/domain/project-selection.ts`, `lib/platform/kentsel-automation-api-repository.ts`, `test/unit/kentsel-project.test.ts`, `test/unit/project-selection.test.ts`, `test/unit/archiflow-platform-state.test.ts`, `test/unit/kentsel-automation-api-repository.test.ts`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (28 files / 209 tests), and `npm run build` passed; browser verification confirmed empty dashboard, empty portfolio, no-active-project workspace, and module empty states answer what/why/next action/AI help, no longer show static fake module rows without an active project, avoid AI overclaim CTAs, label demo/source state explicitly, and make wizard apartment-mix preference buttons update selected state plus architect notes.

15. P1: Build the first AI-ready, kural-tabanlı project intake experience with provenance.
   - Files: `lib/domain/project-intake.ts`, `lib/domain/kentsel-project.ts`, `components/workspace/SnowArchitectPlatform.tsx`, `test/unit/project-intake.test.ts`, `test/unit/kentsel-project.test.ts`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed; browser verification confirmed the wizard shows kentsel stage path, project brief, missing data checklist, source/provenance rows, human approval requirement, architect notes, daire karması preference, next module recommendation, persisted workspace intake snapshot, and no AI overclaim copy.

16. P1: Rebuild the ArchiFlow visual-system foundation into an original light architectural operating-system skin.
   - Files: `app/globals.css`, `tailwind.config.ts`, `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed; browser verification confirmed `/projects/new`, `/dashboard`, `/projects`, `/reports`, and `/files` have no console errors, no horizontal overflow, no mojibake, the wizard validation/step transition still works, dashboard now has a visible H1, and the new shell/card/chart/plan surfaces use the original ArchiFlow Light Atelier language rather than copying reference screens.

17. P1: Start direct reference-screen reconstruction for the core workspace shell, dashboard, and project portfolio.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed; browser verification confirmed `/dashboard` and `/projects` have the reference-like sidebar, topbar, hero, process guide, project-card grid, architectural building previews, no horizontal overflow, and no mojibake. This supersedes the earlier "original only" visual direction because the user explicitly requested direct copies of the provided pages.

18. P1: Add reference-like architectural work surfaces to the main module routes.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed; browser verification confirmed `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, `/files`, and `/plans` render module-specific reference layouts with headings, metric cards, tables, no horizontal overflow, and no mojibake.

19. P1: Convert project and module pages from dashboard-first layouts to experience-first architectural workspaces.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed; browser verification confirmed `/plans`, `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, and `/files` begin with unique architectural experience heroes before stats/tables. `/projects` route returned HTTP 200 and passed build; in-app browser navigation to `/projects` timed out twice after the browser automation session reset, so visual browser confirmation for `/projects` remains a follow-up check.

20. P1: Add Visual Asset Director and replace primary SVG hero placeholders with premium raster assets.
   - Files: `.agents/visual-asset-director.md`, `.standards/visual-assets.md`, `AGENTS.md`, `.agents/README.md`, `.agents/registry.md`, `.agents/orchestrator.md`, `.standards/ui.md`, `public/visual-assets/archiflow/**`, `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed; browser verification confirmed `/projects` hero, project cards, and `/plans`, `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, and `/files` load `.af-premium-asset-*` backgrounds from `/visual-assets/archiflow/*.jpg` with visible dimensions.

21. P1: Complete the first Design Critic foundation polish pass.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed; browser QA confirmed `/projects`, `/dashboard`, `/projects/new`, `/plans`, `/site-analysis`, `/regulation-analysis`, `/zoning-rules`, `/calculations`, `/models`, `/apartment-mix`, `/comparisons`, `/reports`, `/files`, and `/projects/PRJ-4300-02` have no horizontal page overflow, no stat-value clipping, calmer metric cards, a non-stretched project wizard, mobile module cards constrained to the viewport, and a project workflow layout that keeps selected-step detail visible on desktop and mobile.

22. P1: Fix 100% zoom dashboard/workspace responsive density.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: Playwright confirmed `/dashboard` at 1366x768, 1440x900, and 1920x1080 on 100% browser zoom has no horizontal overflow, no console warnings, compact hero/process/card proportions, and stable shell/content scroll; `/projects` workspace grids now use container-aware layout so workflow checklist and notes do not overlap at 100% zoom. `npm run lint`, `npm run typecheck`, `npm test` (29 files / 216 tests), and `npm run build` passed.

23. P1: Raise dashboard visual professionalism with operational hero, readable process assets, and mobile polish.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: 18 Playwright visual checks passed across desktop 1440x900, tablet 1024x768, mobile 390x844, and reduced-motion mode; checks covered mobile auth CTA reachability, horizontal overflow, six process cards, visible image loading, text overflow, hero signal containment, tablet/mobile signal dock flow, process-card navigation, and reduced-motion transitions. `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` (29 files / 216 tests) passed.

24. P1: Generate dashboard hero v2 assets and record the complete visual asset need set.
   - Files: `public/visual-assets/archiflow/dashboard/archiflow-01-dashboard-hero-building-v2.webp`, `public/visual-assets/archiflow/dashboard/archiflow-02-dashboard-hero-dark-v2.webp`, `public/visual-assets/archiflow/asset-manifest.json`, `docs/ARCHIFLOW_VISUAL_ASSET_NEEDS_AUDIT.md`, `components/workspace/SnowArchitectPlatform.tsx`.
   - Verification: generated assets were inspected visually, converted to WebP, saved non-destructively beside existing v1 files, active dashboard mapping now points to v2 hero assets, `asset-manifest.json` parses successfully, and `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` (29 files / 216 tests) passed.

25. P1: Add permanent visual detection, style-locked generation, and dashboard integration agents.
   - Files: `.agents/visual-needs-detector.md`, `.agents/style-locked-visual-generator.md`, `.agents/dashboard-visual-integrator.md`, `.agents/registry.md`, `.agents/README.md`, `.agents/orchestrator.md`, `AGENTS.md`, `docs/ARCHIFLOW_VISUAL_MASTER_PROMPTS.md`, `docs/ARCHIFLOW_VISUAL_ASSET_NEEDS_AUDIT.md`, `public/visual-assets/archiflow/asset-manifest.json`.
   - Verification: visual workflow now requires detect -> generate -> integrate, documents 0 physical missing required assets, identifies 43 locked-style v2 regeneration needs, and links the manifest to the master prompt document.

26. P1: Complete five-pass visual QA polish for pages, buttons, CTAs, and module surfaces.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: five visual audit passes covered 17 routes across desktop/tablet/mobile after seeded demo state; final Playwright pass checked 51 route/viewport combinations with 0 issues. `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` (29 files / 216 tests) passed.

27. P1: Add permanent dashboard audit, visual generation, implementation, and continuous-improvement agent loop.
   - Files: `.agents/dashboard-ui-ux-audit-visual-asset-planner.md`, `.agents/visual-asset-generator.md`, `.agents/dashboard-implementation-agent.md`, `.agents/continuous-improvement-orchestrator.md`, `docs/ARCHIFLOW_DASHBOARD_AGENT_SYSTEM.md`, `AGENTS.md`, `.agents/README.md`, `.agents/registry.md`, `.agents/orchestrator.md`, `docs/ARCHIFLOW_VISUAL_MASTER_PROMPTS.md`, `docs/ARCHIFLOW_VISUAL_ASSET_GENERATION_BRIEF.md`.
   - Verification: new agent charters include required operating-system sections; `git diff --check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` (29 files / 216 tests) passed.

28. P1: Upgrade the auth entry screen into a premium architectural command-desk composition.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`.
   - Verification: Playwright visual QA passed at 1440x900, 1024x768, and 390x844 with 0 horizontal overflow, 0 broken images, visible auth CTAs, and no button/text overflow. `npm run typecheck`, `npm run lint`, `npm test` (29 files / 216 tests), and `npm run build` passed.

29. P1: Complete dashboard continuous-improvement iteration 02 for utility feedback, tabs, table options, and text clipping.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`, `.agents/reports/2026-07-05-dashboard-continuous-improvement-iteration-02.md`.
   - Verification: 39-scenario audit informed the change; post-change browser smoke confirmed dashboard, module, and project-detail desktop/mobile views have 0 page overflow, 0 broken images, 0 sidebar label overflow, 0 workflow title overflow, working module tab selection, visible table options menu, and header utility feedback. `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` (29 files / 216 tests) passed.

30. P1: Complete dashboard continuous-improvement iteration 03 for mobile evidence-card records.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`, `.agents/reports/2026-07-05-dashboard-continuous-improvement-iteration-03.md`.
   - Verification: 46-scenario audit informed the change; mobile `/site-analysis`, `/reports`, `/files`, `/plans`, and `/calculations` now show responsive evidence cards with visible tables `0`, page overflow `0`, broken images `0`, and console events `0`; desktop/tablet/laptop table views remain visible with overflow `0`. `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` (29 files / 216 tests) passed.

31. P1: Complete dashboard continuous-improvement iteration 04 for generated document/report v2 assets.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `app/globals.css`, `public/visual-assets/archiflow/asset-manifest.json`, `docs/ARCHIFLOW_VISUAL_ASSET_NEEDS_AUDIT.md`, `.agents/reports/2026-07-05-dashboard-continuous-improvement-iteration-04.md`, `public/visual-assets/archiflow/documents/archiflow-21-document-pdf-report-preview-v2.webp`, `public/visual-assets/archiflow/documents/archiflow-22-document-architectural-plan-preview-v2.webp`, `public/visual-assets/archiflow/documents/archiflow-23-document-cad-dwg-preview-v2.webp`, `public/visual-assets/archiflow/modules/archiflow-31-module-proposal-presentation-v2.webp`.
   - Verification: generated assets passed visual QA and were applied non-destructively; focused browser QA confirmed reports/files/plans load v2 visuals on desktop and mobile with overflow `0` and broken images `0`; 36-scenario route audit reported overflow issues `0`, broken image issues `0`, console issue scenarios `0`, and mobile visible table scenarios `0`. `asset-manifest.json` parses successfully. `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` (29 files / 216 tests) passed.

32. P1: Extract dashboard configuration and flow into a dedicated ArchiFlow workspace layer.
   - Files: `components/workspace/SnowArchitectPlatform.tsx`, `components/workspace/archiflow/**`, `docs/ARCHIFLOW_VISUAL_ASSET_NEEDS_AUDIT.md`, `.agents/reports/2026-07-05-dashboard-structure-flow-refactor.md`.
   - Verification: `SnowArchitectPlatform.tsx` now imports typed route/view contracts, visual asset registry, navigation flow, wizard flow, module definitions, demo portfolio data, and empty draft defaults from `components/workspace/archiflow/`; browser smoke covered 12 desktop/mobile scenarios with overflow `0`, broken images `0`, console issue scenarios `0`, and mobile visible table scenarios `0`; `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` (29 files / 216 tests) passed.
