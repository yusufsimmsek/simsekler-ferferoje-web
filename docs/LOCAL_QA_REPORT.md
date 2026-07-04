# Local QA Report

## Environment

- Date: 2026-06-20
- OS/runtime: Windows local workspace
- App URL: `http://127.0.0.1:3000`
- Framework: Next.js 16.2.9, React 19, TypeScript, Tailwind
- AI mode: mock provider by default
- Persistence: browser `localStorage`

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm install` | Pass | Up to date. npm emitted peer dependency override warnings for `@napi-rs/wasm-runtime` peer packages. |
| `npm run typecheck` | Pass | `tsc --noEmit` completed successfully. |
| `npm run lint` | Pass | ESLint completed successfully. |
| `npm test` | Pass | 18 test files, 145 tests passed. |
| `npm run test:ai` | Pass | 12 focused test files, 104 tests passed. |
| `npm run build` | Pass | Production build compiled and generated all routes successfully. |
| Local dev server | Pass | Port `3000` returned 200 for tested routes. |

## Route Test Results

| Route | Result | Notes |
| --- | --- | --- |
| `/` | Pass | Landing page returns 200 and renders product shell. |
| `/dashboard` | Pass | Dashboard returns 200, shows recent local projects and demo project. |
| `/projects/new` | Pass | Create page returns 200, prompt form renders. |
| `/projects/demo` | Pass | Dynamic editor route returns 200 and uses demo fallback behavior. |
| `/projects/[projectId]` | Pass | Generated and demo project routes render editor/SVG. |

## Supported Prompt Results

All required supported prompts returned `PLAN_GENERATED`, opened or were compatible with the editor route, produced validated floor plan data, included `meta.quality`, and included `meta.optimization`.

| Prompt | Result | Quality | Optimizer | Notes |
| --- | --- | ---: | ---: | --- |
| `145 sqm modern apartment for a family of four with open kitchen, office and two balconies` | Pass | 81.28 | 6 candidates | Valid with warnings. User-facing warnings mention approximated balcony/private-zone constraints. |
| `3+1 modern apartment with open kitchen` | Pass | 84.91 | 6 candidates | Valid. |
| `2+1 apartment with balcony and office` | Pass | 88.06 | 6 candidates | Valid. Browser create flow rendered editor SVG. |
| `Small student apartment` | Pass | 85.34 | 6 candidates | Valid 1+1-style concept. |
| `Pet friendly apartment with balcony` | Pass | 87.12 | 6 candidates | Valid 2+1-style concept. |
| `Wheelchair accessible apartment` | Pass | 83.20 | 6 candidates | Valid. Includes conceptual accessibility disclaimer warning. |

## Clarification Results

All required ambiguous prompts returned `AI_NEEDS_CLARIFICATION` with HTTP 422, no `plan`, and user-facing clarification copy.

| Prompt | Result |
| --- | --- |
| `I need a house` | Pass |
| `Make me a plan` | Pass |
| `Design something modern` | Pass |

## Unsupported Results

All required unsupported prompts returned `AI_UNSUPPORTED_REQUEST` with HTTP 422, no `plan`, and supported-scope guidance.

| Prompt | Result |
| --- | --- |
| `Create a BIM model` | Pass |
| `Generate structural calculations` | Pass |
| `Make a permit-ready construction drawing` | Pass |
| `Design a shopping mall` | Pass |
| `Create a 3D render` | Pass |

## Chat Edit Results

Chat edit API and browser flows update only after valid edits. Failed edits do not replace the current valid plan.

| Edit | Result | Notes |
| --- | --- | --- |
| `Make the kitchen larger` | Pass | Plan updates, quality before/after and delta returned. Quality may decrease and warning copy explains review is needed. |
| `Add a balcony` | Pass | Works on a no-balcony student apartment. Returns quality delta and optimizer metadata. |
| `Rename Bedroom 3 to Office` | Pass | Works on 3+1 plan. Room name updates to `Office`. |
| `Remove the balcony` | Pass | Works after balcony exists. Returns quality delta and optimizer metadata. |
| Unsupported edit: `Create a 3D render` | Pass | Returns `EDIT_UNSUPPORTED_COMMAND`; no replacement plan. |

## Version History Results

| Scenario | Result | Evidence |
| --- | --- | --- |
| Successful edits create history entries | Pass | Browser QA and `version-history.test.ts`. |
| Latest 10 versions retained | Pass | Unit coverage in `version-history.test.ts`. |
| Restore works | Pass | Browser QA restored a previous version and incremented history. |
| Corrupted history recovery | Pass | Unit coverage drops invalid history entries safely. |
| Old storage format compatibility | Pass | Unit coverage confirms projects without `versions` still load. |

## localStorage Persistence Results

| Scenario | Result | Notes |
| --- | --- | --- |
| Refresh keeps generated project route usable | Pass | Browser refresh retained editor and SVG for generated `project_fixture_2plus1`. |
| Dashboard shows recent local project | Pass | Dashboard displayed local project count and cards. |
| Corrupted localStorage recovery | Pass | Covered by storage/version tests; app falls back safely. |
| Reset instructions | Pass with caveat | Reset is currently manual browser storage clearing; there is no in-app reset button. |

## Export Results

| Export | Result | Notes |
| --- | --- | --- |
| PNG | Pass | API returns `PNG_EXPORT_READY` with SVG payload and disclaimer; UI reports downloadable PNG ready. |
| PDF | Pass | API returns `application/pdf`, valid PDF header, filename, disclaimer, and room-summary-sized payload. |

## Bugs Found

| ID | Severity | Status | Description |
| --- | --- | --- | --- |
| QA-020-001 | Medium | Fixed | Editor chat panel could keep stale assistant text when navigating between generated projects in the same shell. This could show misleading fallback copy on a valid generated project. Fixed by remounting `ChatEditor` when project prompt, summary, or fallback context changes. |

## Fixes Applied

- Updated `components/workspace/WorkspaceShell.tsx` to key `ChatEditor` by project id, prompt, AI summary, and fallback reason. This resets chat-local state when project context changes.

## Remaining Issues and Caveats

- npm install emits peer dependency override warnings from transitive WASM runtime packages; install still succeeds.
- Visual QA was performed at the active desktop browser size. Tablet/mobile responsive QA should be done before a polished external demo.
- `/projects/demo` works through the dynamic editor fallback path, not as a dedicated named demo route.
- localStorage reset is documented/manual rather than a product control.
- The product remains conceptual only: no auth, database, cloud sync, CAD/BIM, construction, permit, legal, structural, or compliance output.

## Go / No-Go Recommendation

**Go for local MVP demo.** The core loop works: prompt generation, clarification/unsupported handling, SVG rendering, chat edits, version restore, and PNG/PDF export.

**No-go for production deployment.** Before production, add auth/persistence decisions, broader responsive visual QA, hosted environment validation, and a deliberate storage reset/recovery UX.

## Recommended Next Task

TASK-021: Responsive Visual QA and Demo Stabilization. Test desktop, tablet, and mobile breakpoints; capture screenshots; fix layout overflow or interaction issues without changing product scope.
