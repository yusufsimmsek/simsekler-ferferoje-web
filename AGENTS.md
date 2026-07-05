# ArchiFlow Engineering Operating System v1.0

This repository uses a permanent multi-agent engineering operating system. Every future Codex session must treat this file as the entry point before planning, reviewing, designing, implementing, testing, or releasing work.

## Prime Directive

ArchiFlow is a professional architectural automation platform for urban transformation workflows. The objective is not to complete isolated tickets. The objective is to continuously improve product value, reliability, usability, automation depth, security, performance, and maintainability.

Do not start feature implementation until the Orchestrator has routed the task to the required agent reviews and the Knowledge Guardian has checked the relevant project knowledge base.

This operating system is not passive documentation. It is the permanent engineering organization for ArchiFlow.

## External Review Bar

Treat every code review as if it will be reviewed the next day by senior engineers from Autodesk, Apple, Linear, Figma, and OpenAI. Do not leave any implementation, UX detail, data contract, security boundary, test gap, or documentation inconsistency that would fail that level of scrutiny.

Every review must ask:

- Would Autodesk trust this for a professional architecture workflow?
- Would Apple accept the interaction polish, accessibility, and visual consistency?
- Would Linear accept the product clarity, speed, and workflow ergonomics?
- Would Figma accept the design-system discipline and interface craft?
- Would OpenAI accept the AI/data safety, evaluation, and reliability posture?

If the answer is no, the issue must be fixed immediately or recorded as a prioritized backlog item with evidence and owner.

## Agent Directory

Reusable operating-system assets live in these directories:

- `.agents/`: permanent agent charters and operating model
- `.standards/`: mandatory product, engineering, design, testing, security, performance, AI, accessibility, and motion standards
- `.reviews/`: reusable review templates and release gates

Core files:

- `.agents/README.md`: operating model and directory map
- `.agents/orchestrator.md`: coordination rules for every task
- `.agents/review-protocol.md`: review, implementation, test, and re-review loop
- `.agents/audit-template.md`: report format for audits
- `.agents/backlog.md`: prioritized improvement backlog
- `.agents/*.md`: canonical individual agent charters
- `.agents/roles/*.md`: legacy-compatible role charters retained for continuity

## Required Agents

The active agent council is:

- Orchestrator
- CEO
- Product Manager
- Knowledge Guardian
- Senior Architect
- Principal Product Designer
- Visual Asset Director
- Dashboard UI/UX Audit And Visual Asset Planner
- Visual Asset Generator
- Dashboard Implementation Agent
- Continuous Improvement Orchestrator
- Visual Needs Detector
- Style-Locked Visual Generator
- Dashboard Visual Integrator
- Design Critic
- Motion Designer
- Frontend Engineer
- Backend Engineer
- AI Engineer
- UX Researcher
- QA Lead
- Security Engineer
- Performance Engineer
- Innovation Director

Each role definition includes mission, responsibilities, authority, review checklist, quality standards, decision rules, escalation rules, success criteria, and report format.

## Mandatory Workflow

1. Read `.agents/orchestrator.md`.
2. Read `.agents/knowledge-guardian.md` before any implementation.
3. Read all relevant `.standards/*.md` and `.reviews/*.md` files for the task.
4. Have the Knowledge Guardian inspect the relevant knowledge base and report prior decisions.
5. Route the task to the smallest set of additional required agents.
6. For broad product work, include all agents.
7. Collect findings using `.agents/audit-template.md`.
8. Remove duplicate recommendations.
9. Prioritize by product value, user risk, technical risk, implementation cost, and reversibility.
10. Implement the highest-value safe improvement.
11. Run the available verification suite:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - `npm test`
   - integration tests when available
   - e2e tests when available
12. Fix every issue caused or exposed by the change.
13. Request another review from the relevant agents, including Knowledge Guardian when documentation or product direction changed.
14. Continue with the next highest-priority improvement until execution limits require stopping.

## Architecture Product Principles

- The product must feel like a serious architectural office tool, not a generic SaaS template.
- Every implementation and review must meet the external review bar defined above.
- Premium visual quality and purposeful motion are mandatory; use `docs/PREMIUM_DESIGN_AND_MOTION.md` as the design bar for UI work.
- Major module screens must include premium production-ready visual assets; simple SVG placeholders, generic line art, and empty gradient boxes are not acceptable as final hero artwork.
- Visual quality must compete with Apple, Figma, Linear, Notion, Stripe, Framer, Raycast, Arc Browser, Cursor, Autodesk, TestFit, and Hypar.
- Turkish user-facing copy is required unless a task explicitly targets another locale.
- Workflow screens must preserve the 8.3 urban transformation flow from project creation through locked offer package.
- UI must be premium, dense, calm, and operational.
- Automation should reduce architectural office labor without hiding critical human approval points.
- Outputs must be auditable: source files, calculations, decisions, and approvals must remain traceable.
- Documentation is ArchiFlow's long-term memory; no significant implementation may diverge from it without updating the affected documentation.

## Worktree Safety

- Preserve user changes.
- Do not reset or revert unrelated work.
- Keep changes scoped to the routed task.
- Prefer incremental, reviewable improvements.
- Update `.agents/backlog.md` when an audit identifies or resolves meaningful work.
