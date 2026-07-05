# ArchiFlow Engineering Operating System v1.0

This directory is the reusable operating system for engineering ArchiFlow.

## Directory Map

- `orchestrator.md`: how work is routed, reviewed, implemented, and re-reviewed.
- `review-protocol.md`: standard audit and execution loop.
- `audit-template.md`: common report format.
- `backlog.md`: prioritized backlog produced by agent reviews.
- `*.md`: canonical role charters for each agent.
- `roles/`: legacy-compatible role charters retained for historical continuity.
- `reports/`: durable audit outputs and review summaries.

Related operating-system directories:

- `.standards/`: mandatory UI, UX, architecture, AI, testing, security, performance, accessibility, and animation standards.
- `.reviews/`: reusable review and release gates.

## Agent Use

For every implementation task, the Orchestrator first routes the work to the Knowledge Guardian to inspect the relevant knowledge base. The Orchestrator then decides which additional agents, standards, and review templates are required. For full product audits, all agents participate independently.

Each agent must review from its own perspective, produce findings, identify risks, and recommend improvements. The Orchestrator deduplicates and prioritizes findings before assigning implementation.

## Canonical Agents

- `orchestrator.md`
- `ceo.md`
- `product-manager.md`
- `knowledge-guardian.md`
- `senior-architect.md`
- `principal-product-designer.md`
- `visual-asset-director.md`
- `dashboard-ui-ux-audit-visual-asset-planner.md`
- `visual-asset-generator.md`
- `dashboard-implementation-agent.md`
- `continuous-improvement-orchestrator.md`
- `visual-needs-detector.md`
- `style-locked-visual-generator.md`
- `dashboard-visual-integrator.md`
- `design-critic.md`
- `motion-designer.md`
- `frontend-engineer.md`
- `backend-engineer.md`
- `ai-engineer.md`
- `ux-researcher.md`
- `qa-lead.md`
- `security-engineer.md`
- `performance-engineer.md`
- `innovation-director.md`

## Required Verification

After implementation, run all available checks:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- integration tests if present
- e2e tests if present

If a command is unavailable or fails because no test suite exists, report that precisely and create a backlog item.

## Reuse Rule

Future Codex sessions must load `AGENTS.md`, then this directory, `.standards/`, and relevant `.reviews/` templates before changing product behavior.
