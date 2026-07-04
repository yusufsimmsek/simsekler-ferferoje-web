# TASK-003: Floor Plan Domain Types, Zod Schemas, and Validation Contracts

## Status

Completed.

## Objective

Implement the TypeScript domain types, runtime Zod schemas, reusable validation helpers, mock fixtures, and contract tests for the MVP floor plan system before adding real AI, layout, rendering, or export behavior.

## Scope

- FloorPlan, Room, Door, Window, Adjacency, and layout geometry contracts.
- Validation result and issue contracts.
- Prompt-to-plan AI contract.
- Chat edit action contract.
- PNG and PDF export request contracts.
- Valid and invalid fixtures for contract testing.

## Constraints Followed

- No real AI calls.
- No layout algorithm implementation.
- No canvas rendering implementation.
- No real PNG/PDF export implementation.
- Schemas are strict but MVP-friendly.
- Validation errors are developer-readable and suitable for later UI display.
- Existing scaffold architecture and module boundaries are preserved.

## Files Created Or Updated

- `lib/schemas/floor-plan.schema.ts`
- `lib/schemas/ai-contracts.schema.ts`
- `lib/schemas/export.schema.ts`
- `lib/floor-plan/types.ts`
- `lib/floor-plan/validation.ts`
- `lib/floor-plan/fixtures.ts`
- `lib/floor-plan/mock-plan.ts`
- `lib/floor-plan/index.ts`
- `lib/domain/edit-actions.ts`
- `test/fixtures/invalid-floor-plans.ts`
- `test/unit/floor-plan-schema.test.ts`
- `vitest.config.ts`
- `package.json`
- `package-lock.json`
- `README.md`

## Acceptance Criteria

- Valid 1+1, 2+1, and 3+1 floor plan fixtures parse successfully.
- Invalid room area, adjacency references, door references, and window placement fail validation.
- Prompt-to-plan AI responses are validated as structured JSON without layout coordinates.
- Chat edit actions are validated through a strict discriminated union.
- PNG and PDF export request payloads are validated before future export implementation.
- Typecheck, lint, tests, and production build pass.

## Definition Of Done

- Contract source of truth exists under `lib/schemas`.
- Domain types are inferred from runtime schemas where appropriate.
- Validation helpers expose a consistent result shape for APIs and future UI surfaces.
- Fixtures are available for mock providers and tests.
- Contract test coverage exists for valid and invalid MVP payloads.
