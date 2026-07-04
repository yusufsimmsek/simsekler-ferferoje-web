# Agent Registry

Use this registry to select and load the correct role files.

| Agent | File | Required For |
| --- | --- | --- |
| Orchestrator | `.agents/orchestrator.md` | Every task |
| CEO | `.agents/ceo.md` | Strategy, value, positioning, full audits |
| Product Manager | `.agents/product-manager.md` | Prioritization, user journeys, acceptance criteria |
| Knowledge Guardian | `.agents/knowledge-guardian.md` | Required before any implementation; documentation consistency, prior decisions, knowledge synchronization |
| Senior Architect | `.agents/senior-architect.md` | Architecture, data contracts, workflow models |
| Principal Product Designer | `.agents/principal-product-designer.md` | Visual language, typography, spacing, color, component consistency, hierarchy, premium appearance |
| Visual Asset Director | `.agents/visual-asset-director.md` | Premium architectural visuals, module hero assets, renders, previews, visual identity |
| Design Critic | `.agents/design-critic.md` | Independent critique only; release-quality challenge |
| Motion Designer | `.agents/motion-designer.md` | Animations, transitions, micro-interactions, feedback, motion timing |
| Frontend Engineer | `.agents/frontend-engineer.md` | Screens, components, responsive UI, interaction |
| Backend Engineer | `.agents/backend-engineer.md` | APIs, server logic, storage, validation |
| AI Engineer | `.agents/ai-engineer.md` | AI flows, prompts, schemas, automation |
| UX Researcher | `.agents/ux-researcher.md` | Journey clarity, terminology, trust |
| QA Lead | `.agents/qa-lead.md` | Test strategy, failure modes, regression risk |
| Security Engineer | `.agents/security-engineer.md` | Secrets, trust boundaries, file handling |
| Performance Engineer | `.agents/performance-engineer.md` | Bundle, render, data, responsiveness |
| Innovation Director | `.agents/innovation-director.md` | AI/product opportunities, differentiation, surprising architect value |

## Full Product Audit Routing

For a full ArchiFlow audit, load every canonical role, every relevant `.standards/*.md` file, and every relevant `.reviews/*.md` file. Produce a consolidated report in `.agents/reports/`, update `.agents/backlog.md`, implement the highest-value safe improvement, verify it, and request a second review.

## Standard Registry

| Standard | File | Required For |
| --- | --- | --- |
| UI | `.standards/ui.md` | User-facing components, screens, visual hierarchy |
| Visual Assets | `.standards/visual-assets.md` | Module hero artwork, architectural renders, previews, empty/loading/error visuals |
| UX | `.standards/ux.md` | Journeys, workflow clarity, blocked states, copy |
| Architecture | `.standards/architecture.md` | Domain, state, API, persistence, module boundaries |
| AI | `.standards/ai.md` | Prompts, model calls, automation, generated outputs |
| Testing | `.standards/testing.md` | Every implementation |
| Performance | `.standards/performance.md` | Data volume, rendering, dependencies, animation cost |
| Security | `.standards/security.md` | Auth, ownership, secrets, uploads, trust boundaries |
| Accessibility | `.standards/accessibility.md` | Interactive UI and user-facing flows |
| Animations | `.standards/animations.md` | Motion, transitions, micro-interactions |

## Review Registry

| Review | File | Required For |
| --- | --- | --- |
| Design Review | `.reviews/design-review.md` | UI, UX, visual, motion changes |
| Architecture Review | `.reviews/architecture-review.md` | Domain, API, persistence, AI pipeline, state boundary changes |
| QA Review | `.reviews/qa-review.md` | After every implementation |
| Release Checklist | `.reviews/release-checklist.md` | Before claiming completion |
