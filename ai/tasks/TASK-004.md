# TASK-004: Deterministic Mock Prompt-to-Plan Pipeline

## Status

Completed.

## Objective

Wire the mock prompt-to-plan workflow end to end using existing schemas and fixtures. The pipeline must be deterministic, typed, validated, and testable while avoiding real AI calls, real layout generation, canvas rendering, export implementation, and persistence.

## Scope

- Classify common prompt patterns into MVP fixture families.
- Return a valid prompt-to-plan AI contract response from the mock provider.
- Validate request input, AI output, and final fixture-backed `FloorPlan` output in `POST /api/plan/generate`.
- Return normalized success and error responses.
- Add contract tests for supported prompts, fallback behavior, request validation, and invalid provider output.

## Constraints

- No OpenAI integration.
- No database persistence.
- No layout coordinates beyond existing fixtures.
- No UI/design changes unless required for API typing.
- Preserve TASK-003 validation strictness.

## Acceptance Criteria

- `1+1`, `2+1`, and `3+1` prompts map deterministically to matching fixtures.
- Unknown residential prompts map to a generic apartment fallback.
- Empty prompts are rejected at the request boundary.
- Invalid mock provider responses are blocked before a floor plan is returned.
- The generate API returns a stable success/error envelope.
- Typecheck, lint, tests, and build pass.

## Files Created Or Updated

- `lib/ai-planner/mock-prompt-classifier.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/ai-planner/mock-provider.ts`
- `lib/ai-planner/provider.ts`
- `lib/ai-planner/index.ts`
- `app/api/plan/generate/route.ts`
- `test/unit/mock-prompt-to-plan.test.ts`
- `README.md`
- `ai/tasks/TASK-004.md`

## Implementation Notes

- The mock provider now returns the `PromptToPlanAiResponse` contract with `planDraft`, not an already-trusted application `FloorPlan`.
- `runGeneratePlanWorkflow` validates request input, provider output, and fixture-backed floor plan output before returning success.
- The deterministic classifier supports English and Turkish-ish apartment size patterns for `1+1`, `2+1`, and `3+1`.
- Unknown residential prompts intentionally use the generic `2+1` fixture as the MVP fallback.
- Unsupported CAD/BIM/3D/permit/compliance prompts produce structured errors instead of plans.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`
