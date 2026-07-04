# TASK-006: Floor Plan Render Model and Canvas Renderer v1

## Status

Completed.

## Objective

Convert validated `FloorPlan` geometry into render primitives and replace the project editor canvas placeholder with a real 2D floor plan drawing.

## Scope

- Render only validated `FloorPlan` geometry.
- Use existing mock/generated data.
- No real AI integration.
- No chat editing implementation.
- No PNG/PDF export implementation.
- No CAD/BIM precision.

## Acceptance Criteria

- Render model layer exists under `lib/render`.
- Rooms, walls, labels, area labels, doors, windows, and basic grid/bounds are represented as render primitives.
- `FloorPlanCanvas` renders a real 2D plan instead of a placeholder.
- Editor route shows the rendered mock/generated plan.
- Missing or invalid plans show clear empty/error states.
- Render model output is deterministic and test-covered.
- Typecheck, lint, tests, build, and local visual verification pass.

## Files Created Or Updated

- `lib/render/render-model.ts`
- `lib/render/canvas-renderer.ts`
- `lib/floor-plan/draft.ts`
- `lib/floor-plan/mock-plan.ts`
- `lib/floor-plan/index.ts`
- `lib/ai-planner/mock-prompt-classifier.ts`
- `components/floor-plan/FloorPlanCanvas.tsx`
- `components/floor-plan/CanvasToolbar.tsx`
- `components/workspace/WorkspaceShell.tsx`
- `components/workspace/ValidationPanel.tsx`
- `test/unit/render-model.test.ts`
- `README.md`
- `ai/tasks/TASK-006.md`

## Implementation Notes

- Added a pure render model that converts validated `FloorPlan` geometry into SVG/export-friendly primitives.
- The render model includes room rectangles, wall segments, door segments, door swing paths, window segments, labels, area/dimension labels, grid lines, and viewport data.
- Replaced the editor canvas placeholder with an SVG-based `FloorPlanCanvas`.
- Added fit-to-view, zoom in/out, label toggle, and dimension toggle controls.
- Missing plans show an empty state; invalid plans show a blocking validation error state.
- Editor mock data now uses layout-engine-generated `mockFloorPlan` geometry instead of the previous static placeholder geometry.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Verified `http://127.0.0.1:3000/projects/demo` response contains SVG render layers and no old static canvas placeholder text.

## Notes

- The in-app browser connector failed to initialize in this session with a local path setup error, so direct screenshot-based visual verification could not be completed.
