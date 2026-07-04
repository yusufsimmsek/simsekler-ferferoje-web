# TASK-012: MVP Demo Readiness Hardening v1

## Status

Completed.

## Objective

Harden the MVP for a reliable product demo by improving unsupported prompt handling, deployment-safe environment validation, and lightweight persistence strategy without adding auth or database.

## Scope

- No auth.
- No database.
- No payment.
- No complex project management.
- No 3D, BIM, CAD, legal, permit, or structural compliance features.
- No major UI redesign.

## Acceptance Criteria

- CAD/BIM requests are classified as unsupported.
- Permit, legal, zoning, and code-compliance requests are classified as unsupported.
- Structural engineering requests are classified as unsupported.
- 3D, render, visualization, and virtual tour requests are classified as unsupported.
- Multi-floor requests are classified as unsupported.
- Non-residential requests are classified as unsupported for this demo.
- Interior-only furniture/decor requests are classified as unsupported.
- Impossible or ambiguous prompts return a clarification request.
- Unsupported prompt errors include a plain-language explanation and supported prompt suggestion.
- `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `AI_OBSERVABILITY_LOGS` are validated without crashing mock mode.
- Missing OpenAI key falls back to mock mode when `AI_PROVIDER=openai`.
- Corrupted localStorage falls back to the demo plan.
- Storage schema mismatches fall back to the demo plan.
- Valid stored projects remain loadable when another stored project is invalid.
- README and docs include demo examples and persistence limitations.

## Implementation Summary

- Rebuilt the mock prompt classifier around explicit unsupported categories and clarification rules.
- Added more specific mock chat unsupported messages for 3D/CAD/BIM and destructive empty-plan requests.
- Added typed AI provider environment validation while keeping mock mode as the safest default.
- Added localStorage read-result diagnostics for corrupted JSON, store version mismatch, malformed projects, and floor plan schema mismatch.
- Added persistence strategy and demo guide documentation.
- Updated README with demo checklist, recommended prompts, unsupported scope, environment behavior, and localStorage limitations.
- Added demo-readiness regression tests.

## Files Created or Changed

- `ai/tasks/TASK-012.md`
- `docs/MVP_DEMO_GUIDE.md`
- `docs/PERSISTENCE_STRATEGY.md`
- `lib/ai-planner/config.ts`
- `lib/ai-planner/mock-chat-edit-classifier.ts`
- `lib/ai-planner/mock-prompt-classifier.ts`
- `lib/ai-planner/mock-provider.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/ai-planner/evaluation-fixtures.ts`
- `lib/projects/generated-plan-storage.ts`
- `test/unit/demo-readiness.test.ts`
- `README.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:ai`
- `npm test`
- `npm run build`

## Known Limitations

- Persistence is still browser-local only.
- No auth, ownership, teams, or database exists.
- Non-residential layouts are intentionally unsupported for the MVP demo.
- Ambiguous prompts are clarified in mock mode but not interactively repaired yet.
- No external telemetry backend is configured.

## Recommended Next Task

TASK-013 should prepare the MVP for deployment: add environment documentation for hosting, route-level health checks, production-safe error pages, and a smoke-test script without adding auth or database.
