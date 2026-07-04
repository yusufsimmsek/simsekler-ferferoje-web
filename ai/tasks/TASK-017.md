# TASK-017: Layout Candidate Generation and Optimization v1

## Status

Completed.

## Objective

Generate multiple deterministic layout candidates, evaluate each valid candidate with the layout quality engine, and select the highest-scoring layout as the final generated `FloorPlan`.

## Architecture

```text
Prompt
  -> Planning
  -> Draft
  -> Candidate Generator
  -> Multiple FloorPlan Candidates
  -> FloorPlan Validation
  -> Quality Evaluation
  -> Optimizer
  -> Best FloorPlan
```

## Scope

- Deterministic candidate generation.
- Strict candidate and optimization schemas.
- Candidate validation, rejection, and score comparison metadata.
- Quality-based best-candidate selection.
- Generation workflow integration.
- Tests and documentation.

Out of scope:

- AI optimization.
- Randomized or genetic search.
- Renderer, editor, export, database, auth, 3D, BIM, CAD, legal, or compliance changes.

## Candidate Strategies

- `candidate_a`: baseline public band.
- `candidate_b`: private-zone/service-first ordering.
- `candidate_c`: wider public core.
- `candidate_d`: service-core kitchen placement.
- `candidate_e`: balcony living-edge placement.
- `candidate_f`: office quiet-buffer placement.

## Selection Rules

Candidates are ranked by:

1. overall quality score
2. relationship satisfaction score
3. circulation score
4. room balance score
5. deterministic candidate order

## Files Created

- `lib/planning/layout-candidate-generator.ts`
- `lib/planning/layout-optimizer.ts`
- `lib/planning/candidate-schema.ts`
- `lib/planning/candidate-types.ts`
- `lib/planning/candidate-fixtures.ts`
- `test/unit/layout-optimizer.test.ts`
- `docs/LAYOUT_OPTIMIZER.md`
- `ai/tasks/TASK-017.md`

## Files Updated

- `lib/layout-engine/generate-layout.ts`
- `lib/planning/index.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/projects/create-project-client.ts`
- `docs/PLANNING_ENGINE.md`
- `docs/LAYOUT_QUALITY_ENGINE.md`
- `README.md`
- `package.json`

## Acceptance Criteria

- At least five deterministic candidates are generated for each valid draft.
- Candidates vary room ordering, zoning, kitchen placement, balcony placement, office placement, hallway strategy, and circulation strategy.
- Every candidate is schema and geometry validated.
- Invalid candidates are rejected with validation issues.
- Every valid candidate receives a `LayoutQualityReport`.
- The optimizer selects the highest-ranked valid candidate with deterministic tie-breakers.
- Successful generation responses expose additive `meta.optimization`.
- Existing UI, renderer, export, database, and auth behavior remain unchanged.

## Verification

- `npm run typecheck`
- `npm run test:ai`
- Full lint, test, and build sweep should remain green after final verification.

## Known Limitations

- Candidate strategies are bounded heuristics, not mathematical optimization.
- The optimizer selects among generated candidates but does not repair geometry.
- Chat-edit relayout still uses the direct deterministic layout path.
- Scores are conceptual and do not imply architectural, legal, structural, permit, CAD/BIM, or code compliance.

## Recommended Next Task

TASK-018 should apply planning-aware optimization to chat-edit relayouts and expose quality/optimization deltas after edits, while keeping edits transactional and validated.
