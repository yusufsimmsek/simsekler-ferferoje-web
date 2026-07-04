# TASK-008: Deterministic Chat Edit Pipeline v1

## Status

Completed.

## Objective

Connect the editor chat panel to a deterministic mock edit pipeline that validates structured edit actions, applies safe room-level edits, reruns layout/validation, and updates the rendered plan.

## Scope

- No real OpenAI integration.
- No database persistence.
- No drag/drop editing.
- No export implementation.
- Deterministic mock chat edit pipeline only.

## Required Commands

- Enlarge living room.
- Shrink living room.
- Enlarge kitchen.
- Add bathroom.
- Add balcony.
- Remove balcony.
- Rename room.
- Unsupported command fallback.

## Acceptance Criteria

- `POST /api/plan/edit` accepts the current plan plus an edit message.
- The mock classifier returns structured `EditAction` responses only.
- Edit actions are validated against the AI contract schemas.
- Plan edits are applied transactionally without mutating the previous plan.
- The layout engine reruns after successful edits.
- Updated plans pass floor plan validation before they are returned or stored.
- The chat panel can submit edit messages and show success/error states.
- Successful edits update temporary browser project storage and refresh the rendered SVG plan.
- Failed or unsupported edits leave the previous plan unchanged.
- Tests cover supported commands, unsupported commands, invalid edits, and validation after edit.
- README documents supported mock chat commands.

## Implementation Summary

- Added a deterministic mock chat edit classifier for the supported MVP command set.
- Added transactional edit application that converts the current `FloorPlan` into a semantic `PlanDraft`, applies validated actions, and avoids direct mutation.
- Added a plan edit workflow that validates the request, validates structured edit actions, applies safe changes, reruns layout, validates the updated `FloorPlan`, and returns stable success/error envelopes.
- Updated `POST /api/plan/edit` to use the workflow.
- Added a client edit helper that validates current and returned plans, saves only successful edits to temporary browser storage, and notifies the editor to refresh.
- Replaced the placeholder chat panel with a working chat submit flow, assistant transcript, loading state, warnings, and unsupported/error handling.
- Updated the editor shell to listen for same-tab generated-project storage updates.
- Documented supported mock edit commands in `README.md`.

## Files Created or Changed

- `ai/tasks/TASK-008.md`
- `app/api/plan/edit/route.ts`
- `components/workspace/ChatEditor.tsx`
- `components/workspace/WorkspaceShell.tsx`
- `lib/ai-planner/apply-edit-actions.ts`
- `lib/ai-planner/edit-plan-workflow.ts`
- `lib/ai-planner/index.ts`
- `lib/ai-planner/mock-chat-edit-classifier.ts`
- `lib/ai-planner/mock-provider.ts`
- `lib/projects/edit-project-client.ts`
- `lib/projects/generated-plan-storage.ts`
- `lib/projects/index.ts`
- `test/unit/chat-edit-pipeline.test.ts`
- `README.md`

## Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- API smoke check: generate a 3+1 plan with `POST /api/plan/generate`, then edit it with `POST /api/plan/edit` using `Make the living room larger.`

## Known Limitations

- Edit support is deterministic mock logic only.
- No real OpenAI chat-edit integration exists yet.
- No database persistence exists; edited projects stay in browser storage.
- No undo/redo version history is implemented yet.
- No drag/drop room editing is implemented.
- Supported commands are intentionally narrow and room-level.
