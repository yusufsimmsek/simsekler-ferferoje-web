# TASK-010: OpenAI Structured Outputs Integration v1

## Status

Completed.

## Objective

Add real OpenAI Structured Outputs integration behind the existing AI provider abstraction while preserving mock mode and strict validation.

## Scope

- Add OpenAI provider for prompt-to-plan generation.
- Add OpenAI provider for chat edit action extraction.
- Preserve deterministic mock provider.
- Do not change layout engine behavior.
- Do not change canvas rendering.
- Do not change export behavior.
- Do not add database or auth.

## Acceptance Criteria

- Environment configuration supports `OPENAI_API_KEY`, `AI_PROVIDER=mock|openai`, and optional `OPENAI_MODEL`.
- Mock mode remains the default.
- OpenAI mode is used only when `AI_PROVIDER=openai` and `OPENAI_API_KEY` is present.
- OpenAI prompt-to-plan calls require strict structured JSON output matching the AI contract.
- OpenAI chat edit calls require strict structured JSON output matching the edit action contract.
- AI responses are validated with existing Zod schemas before layout, edit application, persistence, rendering, or export.
- OpenAI plan drafts do not include layout coordinates.
- Chat edits are applied transactionally through deterministic edit logic.
- API responses include provider metadata.
- Tests mock the OpenAI client boundary and do not call the real API.
- README documents environment setup, mock mode, OpenAI mode, and safety limitations.

## Implementation Summary

- Added environment-driven AI provider selection with safe mock fallback.
- Added an OpenAI planner provider using server-side `fetch` and strict structured-output request construction.
- Added safe system prompts for prompt-to-plan generation and chat edit action extraction.
- Added JSON Schema definitions derived from the existing AI contracts.
- Preserved mock mode and deterministic layout/edit/export behavior.
- Updated generate and edit API routes to select the provider server-side.
- Generalized generate and edit workflow metadata for `mock` and `openai`.
- Added tests for provider selection, OpenAI request construction, valid parsing, invalid output rejection, edit action parsing, and missing-key fallback.
- Added `.env.example` and README setup notes.

## Files Created or Changed

- `.env.example`
- `ai/tasks/TASK-010.md`
- `app/api/plan/edit/route.ts`
- `app/api/plan/generate/route.ts`
- `lib/ai-planner/config.ts`
- `lib/ai-planner/edit-plan-workflow.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/ai-planner/index.ts`
- `lib/ai-planner/openai-json-schemas.ts`
- `lib/ai-planner/openai-prompts.ts`
- `lib/ai-planner/openai-provider.ts`
- `test/unit/openai-provider.test.ts`
- `README.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Known Limitations

- Tests do not call the real OpenAI API.
- The provider uses direct `fetch` instead of the OpenAI SDK to avoid adding dependencies.
- The default model can be overridden with `OPENAI_MODEL` when deployment requirements are known.
- OpenAI output remains semantic only; layout geometry is still deterministic application code.
- No database, auth, project ownership, tracing, retry, or rate-limit handling was added.
