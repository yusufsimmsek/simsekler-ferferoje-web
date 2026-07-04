# TASK-018: Optimization-Aware Chat Editing and Quality Delta Reporting v1

## Status

Completed.

## Objective

Upgrade chat editing so every supported edit uses planning-aware relayout, candidate optimization, quality scoring, and before/after quality delta reporting.

## Architecture

```text
User edit message
  -> Structured EditAction
  -> Transactional semantic edit
  -> Reconstructed edit planning context
  -> Layout candidate generation
  -> Candidate validation
  -> Quality scoring
  -> Best candidate selection
  -> Final FloorPlan validation
  -> Before/after quality delta
  -> Stored project metadata
  -> Updated rendered plan
```

## Scope

- Chat edit workflow upgrade.
- Quality delta schema/types/calculation.
- Optimizer integration with direct-layout fallback.
- Additive API metadata.
- Optional localStorage metadata.
- Minimal chat-panel quality delta UI.
- Tests and documentation.

Out of scope:

- Drag/drop editing.
- Undo/redo.
- Database, auth, 3D, BIM, CAD, legal, structural, or compliance features.
- New optimization algorithms or heavy dependencies.

## Files Created

- `lib/planning/edit-quality-delta.ts`
- `lib/planning/edit-quality-delta-schema.ts`
- `lib/planning/edit-quality-delta-types.ts`
- `lib/planning/edit-planning-context.ts`
- `test/unit/edit-quality-delta.test.ts`
- `ai/tasks/TASK-018.md`

## Files Updated

- `lib/ai-planner/edit-plan-workflow.ts`
- `lib/planning/index.ts`
- `lib/projects/generated-plan-storage.ts`
- `lib/projects/create-project-client.ts`
- `lib/projects/edit-project-client.ts`
- `components/workspace/ChatEditor.tsx`
- `docs/LAYOUT_OPTIMIZER.md`
- `docs/LAYOUT_QUALITY_ENGINE.md`
- `README.md`
- `package.json`
- `test/unit/chat-edit-pipeline.test.ts`
- `test/unit/create-project-flow.test.ts`

## Metadata Added

Successful edit responses include:

- `meta.qualityBefore`
- `meta.qualityAfter`
- `meta.qualityDelta`
- `meta.optimization`
- `meta.selectedCandidate`

## Fallback Rule

The optimizer is attempted first. If it cannot return a valid candidate, direct deterministic relayout is attempted. The fallback only replaces the current plan if it validates successfully.

## Verification

- `npm run typecheck`
- `npm run test:ai`
- Full lint, test, and build sweep should remain green after final verification.

## Known Limitations

- Chat-edit planning context is reconstructed from the current semantic draft instead of persisted from the original planning specification.
- Fallback layout does not include optimizer comparison metadata.
- The UI displays only the latest edit delta, not historical quality trends.
- Quality scores are conceptual heuristics, not architectural or compliance validation.

## Recommended Next Task

TASK-019 should add lightweight plan version history for chat edits, storing previous plans and quality deltas so the user can compare or revert recent validated changes without adding a database.
