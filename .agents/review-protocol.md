# Review Protocol

## Phase A: Route

1. Read the user request.
2. Identify scope: product, UI, backend, AI, data, security, performance, QA, or architecture.
3. Select Knowledge Guardian for every implementation task.
4. Select required `.standards/*.md` and `.reviews/*.md` files.
5. Select additional agents using `orchestrator.md`.
6. For full audits, select every canonical role.

## Phase B: Knowledge Inspect

The Knowledge Guardian inspects the relevant knowledge base before implementation:

- `AGENTS.md`
- `.agents/**`
- `.standards/**`
- `.reviews/**`
- relevant `*.md` files
- architecture and workflow documents
- planning, roadmap, feature, UX, design, AI, and research documents
- ADRs, technical notes, previous analysis reports, and backlog items

The Knowledge Guardian reports prior decisions and flags inconsistency before implementation begins.

## Phase B2: Standards Load

Load the standards and review templates that match the task. At minimum, every implementation loads:

- `.standards/testing.md`
- `.reviews/qa-review.md`
- `.reviews/release-checklist.md`

Add UI, UX, accessibility, animation, architecture, AI, performance, security, design-review, and architecture-review files when the task touches those areas.

## Phase C: Inspect

Inspect only with evidence:

- folders
- screens
- workflows
- API routes
- AI flows
- database or storage models
- components
- dependencies
- configuration
- tests
- documentation

Use fast commands first: `rg --files`, `rg`, targeted file reads, and existing test scripts.

## Phase D: Review

Each agent produces:

- findings
- impact
- evidence
- recommendation
- priority
- confidence

Every review also applies the external review bar: assume the changed work will be inspected by senior engineers from Autodesk, Apple, Linear, Figma, and OpenAI tomorrow. Any concern that would not meet that standard must be fixed before completion or added to the prioritized backlog with evidence.

## Phase E: Orchestrate

The Orchestrator:

- merges duplicate findings
- orders by value and risk
- updates `.agents/backlog.md`
- updates relevant docs when implementation changes product direction
- assigns the next implementation

## Phase F: Implement

Implementation must be scoped and consistent with the existing codebase. Avoid unrelated cleanup unless it directly reduces risk.

If implementation changes product direction, workflow behavior, architecture, AI behavior, or design standards, update the affected documentation in the same cycle.

Before considering implementation complete, perform a self-review against:

- architecture-office correctness and auditability;
- interaction polish, accessibility, and responsive behavior;
- product clarity and workflow ergonomics;
- design-system consistency and interface craft;
- AI/data safety, reliability, and test coverage.

## Phase G: Verify

Run:

```powershell
npm run lint
npm run typecheck
npm run build
npm test
```

Run integration and e2e tests if available. If not available, record the gap.

## Phase H: Re-Review

Relevant agents re-review the changed area. Include Knowledge Guardian when documentation or documented direction changed. If high-priority issues remain, repeat orchestration.

Re-review must explicitly pass or fail the external review bar.
