# TASK-019: Local Plan Version History and Restore v1

## Status

Completed.

## Objective

Add lightweight local version history for generated plans so validated generation, chat edit, and restore events can preserve recent plan snapshots without adding authentication, cloud sync, or a database.

## Scope

- Browser `localStorage` only.
- Bounded version history per generated project.
- Restore previous valid plan versions.
- Storage recovery for corrupted or schema-mismatched history entries.
- Minimal editor UI for recent versions.

Out of scope:

- Database persistence.
- Auth, ownership, cloud sync, or collaborative history.
- Full undo/redo command stack.
- Drag/drop editing.

## Data Model

Each `StoredPlanVersion` includes:

- `schemaVersion`
- `versionId`
- `createdAt`
- `label`
- `sourceType`: `initial-generation`, `chat-edit`, or `restore`
- original prompt or edit message when available
- validated `FloorPlan` snapshot
- optional quality report
- optional optimization report
- optional edit quality delta
- warnings

## Behavior

- Initial project generation stores an `initial-generation` snapshot.
- Successful chat edits store the previous current plan as a `chat-edit` snapshot before saving the new current plan.
- Restore validates the selected snapshot before replacing the current plan.
- Restore stores the previous current plan as a `restore` snapshot when that current plan is valid.
- The latest 10 versions are retained per project.
- Corrupted, invalid, or schema-mismatched history entries are dropped during load.
- Old stored projects without `versions` remain compatible.

## Files Created

- `components/workspace/VersionHistoryPanel.tsx`
- `lib/projects/restore-project-version-client.ts`
- `test/unit/version-history.test.ts`
- `ai/tasks/TASK-019.md`

## Files Updated

- `lib/projects/generated-plan-storage.ts`
- `lib/projects/create-project-client.ts`
- `lib/projects/edit-project-client.ts`
- `lib/projects/index.ts`
- `components/workspace/WorkspaceShell.tsx`
- `docs/PERSISTENCE_STRATEGY.md`
- `README.md`
- `package.json`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:ai`
- `npm test`
- `npm run build`

## Known Limitations

- History is local to one browser and can be removed by clearing site data.
- There is no server-side audit log or cloud backup.
- Restore is snapshot-based, not a full command-level undo/redo system.
- Version comparison is limited to visible labels, quality scores, and edit deltas.

## Recommended Next Task

TASK-020 should add a lightweight plan comparison view that highlights changed rooms, score deltas, and warning differences between the current plan and a selected local history version.
