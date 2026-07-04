# TASK-014: AI Natural Language Planning Engine v1

## Status

Completed.

## Objective

Introduce a validated natural-language planning layer between user prompts and semantic floor plan drafts.

## Architecture

```text
User Prompt
  -> Planning Provider
  -> PlanningSpecification Validation
  -> Planning Normalization
  -> Planning-to-Draft Mapper
  -> PlanDraft Validation
  -> Layout Engine
  -> FloorPlan Validation
  -> Renderer
```

## Acceptance Criteria

- `PlanningSpecification v1` covers project, building, household, priority, room, relationship, constraint, clarification, unsupported, warning, confidence, and assumption fields.
- Strict Zod validation protects all planning provider output.
- English and Turkish bedroom, kitchen, office, balcony, and ensuite synonyms normalize consistently.
- Mock mode remains deterministic.
- OpenAI mode requests strict PlanningSpecification JSON only.
- AI output cannot contain layout coordinates or FloorPlan geometry.
- Valid planning specifications map deterministically into validated semantic drafts.
- Ambiguous prompts produce clarification questions.
- CAD/BIM, structural, construction, permit/legal, 3D, multi-floor, and non-residential prompts are unsupported.
- Existing generation API response shapes remain compatible.
- Existing layout, render, edit, and export behavior remains unchanged.

## Implementation Summary

- Added the complete `lib/planning` module boundary.
- Added canonical planning fixtures for common residential profiles.
- Added deterministic bilingual prompt normalization and priority extraction.
- Added mock and OpenAI planning-provider behavior.
- Added deterministic planning-to-draft mapping with area estimation and relationship translation.
- Updated generation workflow to validate planning before semantic draft mapping and layout.
- Updated OpenAI Structured Outputs schema and generation prompt.
- Routed legacy mock classification through the planning normalizer.
- Added planning-level evaluation fixtures and regression tests.
- Added planning architecture documentation and README guidance.

## Files Created or Changed

- `ai/tasks/TASK-014.md`
- `docs/PLANNING_ENGINE.md`
- `lib/planning/planning-schema.ts`
- `lib/planning/planning-types.ts`
- `lib/planning/planning-validation.ts`
- `lib/planning/planning-normalizer.ts`
- `lib/planning/planning-provider.ts`
- `lib/planning/planning-fixtures.ts`
- `lib/planning/planning-to-draft.ts`
- `lib/planning/index.ts`
- `lib/ai-planner/provider.ts`
- `lib/ai-planner/mock-provider.ts`
- `lib/ai-planner/mock-prompt-classifier.ts`
- `lib/ai-planner/openai-provider.ts`
- `lib/ai-planner/openai-prompts.ts`
- `lib/ai-planner/openai-json-schemas.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/ai-planner/evaluation-fixtures.ts`
- `lib/ai-planner/evaluation.ts`
- `test/unit/planning-engine.test.ts`
- `test/unit/openai-provider.test.ts`
- `test/unit/ai-evaluations.test.ts`
- `package.json`
- `README.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:ai`
- `npm test`
- `npm run build`

## Known Limitations

- Area allocation is heuristic and deterministic, not optimized.
- No constraint solver exists yet.
- No multi-turn clarification UI exists yet.
- Accessibility intent remains conceptual and non-compliant.
- Layout engine v1 still owns relationship satisfaction and may emit warnings.

## Recommended Next Task

TASK-015 should implement Planning Constraint Resolution v1: deterministic conflict detection, room-program feasibility scoring, and clearer pre-layout warnings without changing the geometry optimizer.
