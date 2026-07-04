# TASK-016: Post-Layout Relationship Satisfaction and Geometric Quality Scoring v1

## Status

Completed.

## Objective

Evaluate generated floor plan geometry after layout and measure how well it satisfies resolved planning intent without changing layout behavior.

## Architecture

```text
User Prompt
  -> PlanningSpecification
  -> Planning Constraint Resolver
  -> ResolvedPlanningSpecification
  -> Semantic PlanDraft
  -> Deterministic Layout Engine
  -> Validated FloorPlan
  -> Layout Quality Analyzer
  -> Relationship Satisfaction Score
  -> Geometric Quality Score
  -> Renderer
```

## Scope

- Post-layout evaluation only.
- Deterministic relationship satisfaction.
- Deterministic geometry and room quality scoring.
- Structured warnings and recommendations.
- Additive generation API metadata.
- Fixtures, tests, and documentation.

Out of scope:

- Layout optimization or regeneration.
- Rendering or UI changes.
- Database, authentication, billing, 3D, BIM, CAD, legal, or compliance features.
- AI-based scoring.

## Acceptance Criteria

- `LayoutQualityReport v1` is strict and runtime-validated.
- All required quality metrics use a 0-100 scale.
- Relationship scoring recomputes evidence from room geometry and doors.
- Geometry scoring checks overlap, bounds, aspect ratio, compactness, circulation, daylight, privacy, accessibility, and room balance.
- Warnings and recommendations are explainable and deterministic.
- The analyzer never mutates the input plan.
- Successful generation responses expose additive `meta.quality`.
- Existing response fields, layout behavior, rendering, and export remain unchanged.
- High-quality and low-quality fixtures produce predictably different scores.
- Existing planning, layout, AI, render, edit, and export tests remain green.

## Files Created

- `lib/planning/layout-quality.ts`
- `lib/planning/relationship-scoring.ts`
- `lib/planning/quality-schema.ts`
- `lib/planning/quality-types.ts`
- `lib/planning/quality-fixtures.ts`
- `test/unit/layout-quality.test.ts`
- `docs/LAYOUT_QUALITY_ENGINE.md`
- `ai/tasks/TASK-016.md`

## Files Updated

- `lib/planning/index.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/projects/create-project-client.ts`
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

- The analyzer uses heuristic near-distance and compactness thresholds.
- It does not model open-plan walking paths, acoustics, solar orientation, or professional accessibility rules.
- It evaluates one generated layout and does not compare alternatives.
- It does not repair failed relationships.

## Recommended Next Task

TASK-017 should implement deterministic layout candidate generation and quality-based selection v1: generate a small bounded set of layout variants, analyze each with `LayoutQualityReport`, and select the highest-scoring valid candidate without introducing AI or UI changes.
