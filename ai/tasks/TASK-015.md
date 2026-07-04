# TASK-015: Planning Constraint Resolver and Feasibility Scoring v1

## Status

Completed.

## Objective

Add a deterministic planning constraint resolution layer and explainable feasibility scoring between validated `PlanningSpecification` intent and semantic `PlanDraft` generation.

## Architecture

```text
User Prompt
  -> Planning Provider
  -> PlanningSpecification Validation
  -> Planning Normalization
  -> Planning Constraint Resolver
  -> Feasibility Scoring
  -> ResolvedPlanningSpecification Validation
  -> Semantic PlanDraft
  -> Deterministic Layout Engine
  -> Validated FloorPlan
  -> Renderer
```

## Scope

- Deterministic residential planning rules.
- Exact resolved room program.
- Relationship graph generation.
- Conflict detection.
- Compromise generation.
- Explainable feasibility scoring.
- Generation workflow and metadata integration.
- Evaluation fixtures and regression coverage.

Out of scope:

- Layout optimization.
- Canvas or editor redesign.
- Database, authentication, or billing.
- 3D, BIM, CAD, legal, permit, structural, or compliance behavior.
- AI-generated coordinates.

## Acceptance Criteria

- `ResolvedPlanningSpecification v1` is strict, versioned, and runtime-validated.
- Resolved room programs contain stable semantic room IDs and no coordinates.
- Kitchen, balcony, bedroom, bathroom, ensuite, office, laundry, storage, accessibility, daylight, privacy, entertaining, cooking, and budget rules are deterministic.
- Conflicts identify area, room-count, balcony, luxury, accessibility, office-heavy, kitchen contradiction, unsupported, and unresolved cases.
- Compromises are explicit and never silently discard user intent.
- Feasibility returns an overall 0-100 score, rating, complexity score, and weighted component breakdown.
- Low-feasibility or contradictory programs stop before layout and request clarification.
- Planning-to-draft mapping consumes resolved planning output.
- API success shape remains backward compatible with additive `meta.planning`.
- Mock and OpenAI provider modes remain functional.
- Existing TASK-014 tests remain green.

## Implementation Summary

- Added strict resolved planning schemas and inferred TypeScript types.
- Added deterministic room-program and relationship graph rule generation.
- Added conflict detection and compromise policy.
- Added weighted feasibility scoring with conflict penalties.
- Updated semantic draft mapping to use resolved rooms and graph edges.
- Updated generation workflow to gate layout on feasibility and unresolved conflicts.
- Added additive planning metadata to success and low-feasibility error responses.
- Added ten deterministic constraint evaluation fixtures.
- Added focused unit and workflow regression tests.
- Updated planning architecture and README documentation.

## Files Created

- `lib/planning/resolved-planning-schema.ts`
- `lib/planning/resolved-planning-types.ts`
- `lib/planning/constraint-rules.ts`
- `lib/planning/constraint-resolver.ts`
- `lib/planning/feasibility-score.ts`
- `lib/planning/constraint-fixtures.ts`
- `test/unit/planning-constraint-resolver.test.ts`
- `ai/tasks/TASK-015.md`

## Files Updated

- `lib/planning/planning-normalizer.ts`
- `lib/planning/planning-to-draft.ts`
- `lib/planning/index.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/ai-planner/evaluation.ts`
- `lib/projects/create-project-client.ts`
- `test/unit/ai-evaluations.test.ts`
- `docs/PLANNING_ENGINE.md`
- `README.md`
- `package.json`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:ai`
- `npm test`
- `npm run build`

## Known Limitations

- Feasibility is heuristic planning intelligence, not geometric proof.
- The resolver does not optimize room dimensions or placement.
- Relationship graph satisfaction remains the layout engine's responsibility.
- Compromise selection is deterministic and single-pass.
- Clarification recommendations are not yet collected in a multi-turn planning UI.
- Accessibility handling remains conceptual and is not a compliance check.

## Recommended Next Task

TASK-016 should implement deterministic layout feasibility feedback v1: compare resolved relationship intent with generated geometry, report which relationships were satisfied or approximated, and return a post-layout quality score without changing the renderer.
