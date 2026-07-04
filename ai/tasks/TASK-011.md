# TASK-011: AI Observability and Evaluation Fixtures v1

## Status

Completed.

## Objective

Add AI observability, evaluation fixtures, and regression tests so prompt-to-plan and chat-edit behavior can be monitored and improved safely.

## Scope

- Add safe structured AI metadata logging.
- Add redaction helpers for secrets and prompt previews.
- Add deterministic mock-mode evaluation fixtures for prompt-to-plan and chat-edit behavior.
- Add evaluation runner helpers that use the production workflows.
- Add regression tests for invalid AI output, fallback behavior, and redaction.
- Do not add product UI redesign, database, auth, streaming, or real OpenAI calls in tests.

## Acceptance Criteria

- Provider metadata can capture provider, model, mode, request type, latency, schema version, validation status, and error code.
- Logs and snapshots never include API keys, bearer tokens, or raw secrets.
- Full prompts are not logged by default; only short redacted previews are supported.
- Prompt-to-plan evaluation fixtures cover 1+1, 2+1, 3+1, villa, office, unsupported CAD/BIM, and impossible or ambiguous requests.
- Chat-edit evaluation fixtures cover enlarging living room, shrinking kitchen, adding bathroom, adding balcony, renaming bedroom to office, unsupported 3D/render, and invalid destructive commands.
- Evaluation helpers run fixtures against mock mode only by default.
- Evaluation helpers validate schemas and final floor plans where applicable.
- Failure snapshots include issue summaries, provider metadata, and safe prompt previews only.
- Regression tests cover unsupported AI outputs, invalid structured output, missing required fields, invalid edit actions, provider fallback behavior, and metadata redaction.
- README explains how to run evaluations and what is never logged.

## Implementation Summary

- Added `lib/ai-planner/observability.ts` for metadata creation, redaction, prompt previews, failure snapshots, and opt-in logging.
- Added `lib/ai-planner/evaluation-fixtures.ts` for the deterministic prompt and chat-edit fixture corpus.
- Added `lib/ai-planner/evaluation.ts` for mock-mode evaluation runner helpers.
- Hooked generate and edit workflows into opt-in observability logging without changing API response contracts.
- Added a `test:ai` script for focused AI observability/evaluation regression tests.
- Added README notes for evaluations, logging, and fixture extension.

## Files Created or Changed

- `ai/tasks/TASK-011.md`
- `.env.example`
- `lib/ai-planner/observability.ts`
- `lib/ai-planner/evaluation-fixtures.ts`
- `lib/ai-planner/evaluation.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/ai-planner/edit-plan-workflow.ts`
- `lib/ai-planner/index.ts`
- `test/unit/ai-observability.test.ts`
- `test/unit/ai-evaluations.test.ts`
- `test/unit/ai-regressions.test.ts`
- `package.json`
- `README.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:ai`
- `npm test`
- `npm run build`

## Known Limitations

- Observability is local and opt-in; no external telemetry backend is configured.
- Evaluation fixtures currently run against mock mode only.
- Office and highly ambiguous prompts are monitored as current mock fallback behavior, not as final product policy.
- Latency is captured for workflow logging, but no percentile aggregation or trace correlation exists yet.

## Recommended Next Task

TASK-012 should harden the MVP for a production demo: add basic project persistence strategy, improve unsupported prompt classification, and prepare deployment-safe environment validation without adding auth yet.
