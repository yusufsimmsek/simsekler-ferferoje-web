# TASK-007: Create Project Flow Integration

## Status

Completed.

## Objective

Connect the `/projects/new` prompt flow to the mock prompt-to-plan API and render the generated floor plan in the editor.

## Scope

- Use existing mock AI pipeline.
- Use existing layout engine.
- Use existing SVG floor plan renderer.
- No real OpenAI integration.
- No chat editing implementation.
- No persistence/database.
- No export implementation.

## Acceptance Criteria

- `/projects/new` has an interactive prompt submit flow with loading, validation, and unsupported/error states.
- Submit calls `POST /api/plan/generate`.
- Successful generated plans are stored in safe temporary MVP browser storage.
- The app navigates to `/projects/[projectId]`.
- The editor renders the generated plan when present.
- The editor falls back to the demo mock plan with a clear mock-state label when no generated plan exists.
- Side panels show prompt/AI summary, room list, validation status, warnings, and conceptual draft disclaimer.
- API client and storage behavior are test-covered.
- Typecheck, lint, tests, and build pass.

## Implementation Summary

- Added a typed client helper for project creation from prompts.
- Added temporary browser storage for generated MVP projects.
- Connected `/projects/new` to the mock prompt-to-plan API.
- Updated the project editor to load generated plans from browser storage by route id.
- Preserved a clear demo fallback state when no generated project exists.
- Updated editor panels to show prompt context, AI summary, room list, validation state, warnings, and conceptual draft disclaimers.

## Files Created or Changed

- `lib/projects/create-project-client.ts`
- `lib/projects/generated-plan-storage.ts`
- `lib/projects/index.ts`
- `components/workspace/PromptComposer.tsx`
- `components/workspace/WorkspaceShell.tsx`
- `components/workspace/ChatEditor.tsx`
- `components/workspace/PlanSummary.tsx`
- `components/workspace/ValidationPanel.tsx`
- `app/projects/new/page.tsx`
- `lib/editor/types.ts`
- `lib/editor/state.ts`
- `test/unit/create-project-flow.test.ts`
- `README.md`
- `ai/tasks/TASK-007.md`

## Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Route smoke check: `GET /projects/new`
- API smoke check: `POST /api/plan/generate` returns `ok=true`, `code=PLAN_GENERATED`, and a generated 3+1 plan.

## Known Limitations

- Generated projects are stored only in browser `localStorage`.
- No authentication, persistence, collaboration, or project listing sync exists yet.
- Chat editing remains a placeholder.
- Export actions remain placeholders.
- The create flow uses the deterministic mock AI provider only.
