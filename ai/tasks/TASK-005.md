# TASK-005: Deterministic Floor Plan Layout Engine v1

## Status

Completed.

## Objective

Implement a deterministic MVP layout engine that converts validated semantic floor plan drafts into non-overlapping rectangular 2D room geometry.

## Scope

- Simple rectangular rooms only.
- Deterministic grid/zone-based layout rules only.
- No real AI calls.
- No canvas rendering.
- No export implementation.
- No database persistence.
- No CAD/BIM precision.

## Acceptance Criteria

- Layout generation produces `x`, `y`, `width`, and `height` for each room.
- Rooms stay inside generated bounds.
- Room interiors do not overlap.
- Approximate room area proportions are preserved from semantic draft sizes.
- Living room, kitchen, hall, bedrooms, bathrooms, and balcony use stable placement priorities.
- Basic entry doors, interior doors, balcony doors, and exterior windows are generated where possible.
- Generated floor plans pass existing domain validation.
- Mock prompt generation workflow normalizes AI draft output through the layout engine.
- Typecheck, lint, tests, and build pass.

## Files Created Or Updated

- `lib/layout-engine/generate-layout.ts`
- `lib/ai-planner/generate-plan-workflow.ts`
- `test/unit/layout-engine.test.ts`
- `test/unit/mock-prompt-to-plan.test.ts`
- `README.md`
- `ai/tasks/TASK-005.md`

## Implementation Notes

- Added `generateFloorPlanLayout`, which converts a validated `PlanDraft` into a schema-compatible `FloorPlan`.
- Uses a deterministic zone-grid strategy:
  - entry, hall, living, kitchen, and balcony are placed in the public/top band;
  - bedrooms, bathrooms, WC, storage, and other secondary rooms are placed in a lower band;
  - kitchen and balcony are kept adjacent to the living room when possible;
  - hall and entry are kept close to living and private rooms when present.
- Generates an exterior entry door, interior/balcony doors only for rooms that share an edge, and simple exterior windows.
- The mock prompt generation workflow now validates AI draft output, runs the layout engine, then validates the generated `FloorPlan`.
- Layout warnings are represented as validation warnings only when adjacency intent cannot be approximated by the MVP placement rules.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
