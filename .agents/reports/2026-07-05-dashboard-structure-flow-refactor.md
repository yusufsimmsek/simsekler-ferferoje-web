# Dashboard Structure And Flow Refactor

Date: 2026-07-05

## Orchestrator Report

Task: Clean the dashboard into a meaningful file structure and flow, then prepare meaningful commits before push.

Agents consulted:
- Orchestrator
- Knowledge Guardian
- Senior Architect
- Frontend Engineer
- Principal Product Designer
- QA Lead

Standards loaded:
- `.standards/architecture.md`
- `.standards/ui.md`
- `.standards/testing.md`
- `.reviews/design-review.md`

Knowledge sources inspected:
- `AGENTS.md`
- `.agents/orchestrator.md`
- `.agents/knowledge-guardian.md`
- `docs/ARCHIFLOW_VISUAL_ASSET_NEEDS_AUDIT.md`
- `public/visual-assets/archiflow/asset-manifest.json`

## Finding

`components/workspace/SnowArchitectPlatform.tsx` had grown into a mixed ownership file containing route types, visual asset paths, navigation flow, wizard flow, module definitions, sample data, and UI implementation. This made future dashboard iterations harder to reason about and raised the risk of accidental copy/asset drift.

## Implementation

Added `components/workspace/archiflow/` as the dashboard configuration layer:

- `types.ts`: route/view and module definition contracts.
- `visual-assets.ts`: active visual asset registry.
- `navigation-flow.ts`: sidebar navigation, tone maps, wizard steps, and intake workflow phases.
- `module-definitions.ts`: module labels, icons, and metric defaults.
- `sample-projects.ts`: demo portfolio data.
- `project-draft.ts`: empty project wizard draft defaults.
- `index.ts`: stable barrel exports.
- `README.md`: folder ownership guide.

`SnowArchitectPlatform.tsx` now imports the configuration layer and focuses more tightly on screen composition, state, and interaction behavior. No user-facing workflow behavior was intentionally changed.

Updated `docs/ARCHIFLOW_VISUAL_ASSET_NEEDS_AUDIT.md` so visual registry ownership points to `components/workspace/archiflow/visual-assets.ts` instead of the former inline map.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Browser smoke: 12 scenarios across desktop `1440x900` and mobile `390x844` for `/dashboard`, `/projects`, `/reports`, `/files`, `/plans`, and `/site-analysis`; overflow issues `0`, broken images `0`, console issue scenarios `0`, mobile visible table scenarios `0`.
- `npm run build`: passed.
- `npm test`: passed, 29 files / 216 tests.

## Residual Risk

The UI component file remains large. Next safe extraction target is to move module surface rendering and project portfolio presentation into separate view files after commits are pushed.
