# ArchiFlow

ArchiFlow is a Turkish-first urban transformation proposal workspace for architecture offices.

The current product goal is:

```text
Mimar hesap oluşturur -> proje portföyünü açar -> yeni ada/parsel projesi başlatır
  -> 17 adımlı 8.3 iş akışını tamamlar
  -> teklif paketini üretir
  -> insan onayıyla versiyonu kilitler.
```

The application is being evolved from an earlier AI floor-plan generator into a full kentsel dönüşüm project and offer platform. The older floor-plan AI engine still exists as a supporting subsystem, but it is no longer the canonical product narrative.

## Core Product

ArchiFlow helps a mimar or architecture office coordinate the offer-preparation workflow for urban transformation projects:

- account creation and login-oriented entry;
- empty dashboard for first-time architects;
- project portfolio for old and active projects;
- new project wizard for client, ada/parsel, imar, files, apartment mix, and notes;
- 17-step 8.3 workflow from project intake through locked approval;
- source file tracking for e-imar, CAD, metraj, görsel, PDF, and offer files;
- offer preflight that blocks final package generation until required workflow steps are complete;
- version locking only after final offer readiness;
- Turkish interface copy and architecture-office visual language.

## Current Routes

- `/` - ArchiFlow entry surface.
- `/dashboard` - architect dashboard and empty state.
- `/projects` - project portfolio.
- `/projects/new` - new project wizard.
- `/projects/[projectId]` - project workflow workspace.
- `/site-analysis` - parsel analysis.
- `/zoning-rules` - imar rules.
- `/apartment-mix` - apartment mix.
- `/calculations` - calculations.
- `/files` - project files.
- `/reports` - reports and offer package.
- `/team` - team and approvals.
- `/archive` - locked versions and archive.

Legacy/supporting AI floor-plan routes and APIs remain available while the product is consolidated:

- `/ai-floor-plan`
- `/plans`
- `/models`
- `/comparisons`
- `/building-mass`
- `POST /api/plan/generate`
- `POST /api/plan/edit`
- `POST /api/plan/validate`
- `POST /api/export/png`
- `POST /api/export/pdf`

These supporting JSON APIs now use route-level request guards for content type, malformed JSON, body-size limits, request IDs, and public-safe error responses. Developer-only diagnostics stay inside workflow/service layers and are not returned by public plan/export route handlers.

## Engineering System

The repository includes ArchiFlow Engineering Operating System v1.0:

- `AGENTS.md`
- `.agents/orchestrator.md`
- `.agents/*.md`
- `.agents/review-protocol.md`
- `.agents/backlog.md`
- `.agents/reports/`
- `.standards/*.md`
- `.reviews/*.md`

Use this system in future Codex sessions before substantial implementation work. The Orchestrator decides which agents, standards, and review gates apply; the Knowledge Guardian inspects relevant documentation before implementation; the Orchestrator consolidates findings, prioritizes work, assigns implementation, runs verification, and requests follow-up review.

## Domain Modules

New ArchiFlow domain helpers live in `lib/domain`:

- `kentsel-workflow.ts` - canonical 17-step 8.3 workflow and offer readiness rules.
- `kentsel-project.ts` - project/file/activity contracts, project creation rules, file type detection, workflow mutations, and persisted project normalization.
- `archiflow-platform-state.ts` - versioned platform state serialization and restore normalization.
- `project-selection.ts` - route-safe active project selection without wrong-project fallback.
- `project-wizard.ts` - required-field validation for the new-project wizard.

These modules are covered by unit tests under `test/unit`.

Platform persistence adapters live outside UI components:

- `lib/platform/archiflow-local-storage-repository.ts` - localStorage-backed load/save/clear adapter for the Snow dashboard state.
- `lib/platform/kentsel-automation-api-repository.ts` - optional kentsel automation API reader for backend project cards and active-project automation readiness.

## Setup

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:3000/dashboard
```

Recommended local verification:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## AI Provider Configuration

The legacy AI floor-plan subsystem supports deterministic mock mode, local LLM modes, and optional OpenAI mode. It remains useful for concept-plan generation and future ArchiFlow automation, but production kentsel dönüşüm workflows must not depend on unreviewed AI output for legal, permit, structural, or code-compliance decisions.

Create `.env.local` from `.env.example` when using AI providers:

```powershell
AI_PROVIDER=mock
LOCAL_LLM_BASE_URL=
LOCAL_LLM_MODEL=
LOCAL_LLM_TIMEOUT_MS=120000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_OBSERVABILITY_LOGS=false
NEXT_PUBLIC_KENTSEL_AUTOMATION_API_BASE_URL=
```

Modes:

- `AI_PROVIDER=mock` uses deterministic fixtures.
- `AI_PROVIDER=ollama` uses local Ollama.
- `AI_PROVIDER=lmstudio` uses LM Studio's local OpenAI-compatible server.
- `AI_PROVIDER=openai-compatible-local` uses another local compatible endpoint.
- `AI_PROVIDER=openai` uses OpenAI only when `OPENAI_API_KEY` is set.

Every AI provider must produce structured JSON that passes runtime validation before rendering, persistence, export, or offer support.

## Optional Kentsel Backend Bridge

The Snow dashboard can read project cards and active-project automation readiness from the existing `kentsel_automation` prototype when the backend is running and this public browser env var is set:

```powershell
NEXT_PUBLIC_KENTSEL_AUTOMATION_API_BASE_URL=http://127.0.0.1:8765
```

Start the prototype backend separately:

```powershell
python kentsel_automation\backend\api_server.py --host 127.0.0.1 --port 8765
```

If the backend is unavailable or the env var is empty, ArchiFlow continues with the localStorage-backed repository.

The current bridge is read-only. It can surface open review task counts, warning counts, sharing/allocation counts, offer package status, offer score, and backend review blockers for the selected project. It does not call prototype backend write routes. Backend-derived cards are not persisted as local authoritative project state, and unreadable readiness data fails closed as review-required.

## Scripts

```powershell
npm run dev        # Start local Next.js dev server
npm run build      # Build the app
npm run start      # Start built app
npm run lint       # Run ESLint
npm run test       # Run Vitest contract tests
npm run test:ai    # Run focused AI regression tests
npm run typecheck  # Run TypeScript checks
```

## Current Limitations

- Snow dashboard persistence is still localStorage-backed, but now goes through a repository adapter and versioned state normalizer.
- The stronger `kentsel_automation` backend/data core is connected as an optional read bridge for project cards and active-project readiness; writes, auth, ownership, and durable audit storage are still not production-ready.
- Real authentication, project ownership, quotas, and durable audit storage are not yet implemented.
- Plan, validation, and export APIs have route-level JSON/body/error guards, but production auth, ownership, quota, rate-limit, and CSRF/same-origin controls are still required for provider-cost workflows.
- File upload currently records file metadata in the UI, not durable file content.
- Offer download is still a client-side prototype output.
- No e2e or integration test script exists yet.

The prioritized remediation list is maintained in `.agents/backlog.md`.

## Documentation

Start here:

- `docs/PRODUCT_VISION.md`
- `docs/USER_FLOW_SPECIFICATION.md`
- `AGENTS.md`
- `.agents/backlog.md`
- `.agents/reports/2026-07-03-full-product-audit.md`

Legacy AI floor-plan subsystem references are still relevant when working on the old generator, planning engine, renderer, and export APIs:

- `docs/PLANNING_ENGINE.md`
- `docs/LAYOUT_QUALITY_ENGINE.md`
- `docs/LAYOUT_OPTIMIZER.md`
- `docs/AI_CONTRACTS.md`
- `docs/FLOOR_PLAN_SCHEMA.md`
