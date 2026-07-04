# QA Fix Report

## Summary

TASK-023 performed a local runtime QA sweep using Ollama local mode and the existing Next.js app. Several real defects were reproduced. Three product stability fixes were applied, plus one small UI polish fix and one export route hardening fix.

## Environment

- Date: 2026-06-22
- Workspace: `C:\Users\user\OneDrive\Belgeler\New project`
- App target: `http://127.0.0.1:3000`
- Provider: `ollama`
- Model: `llama3.2:3b`
- Timeout: `240000`
- OpenAI key: empty
- Cloud API calls: none

## QA Pass Results

### Create Flow and Local LLM

| Prompt | Result Before/After |
| --- | --- |
| `145 sqm modern apartment for a family of four with open kitchen, office and two balconies` | Passed before fixes: `PLAN_GENERATED`, 11 rooms, quality `78.61`, 6 optimizer candidates |
| `145 m2 modern 3+1 daire, acik mutfak, calisma odasi ve iki balkon olsun` | Passed: `PLAN_GENERATED`, 11 rooms, quality `77.82`, 6 optimizer candidates |
| `2+1 apartment with balcony` | Passed: `PLAN_GENERATED`, 9 rooms, quality `81.91`, 6 optimizer candidates |
| `Make me a plan` | Fixed: now `AI_NEEDS_CLARIFICATION` in about 2.3s |
| `Create a BIM model` | Fixed: now `AI_UNSUPPORTED_REQUEST` in about 56ms |

### Chat Edit

| Edit | Result |
| --- | --- |
| `Make the kitchen larger` | Fixed: `PLAN_EDITED`, deterministic local-provider edit, quality delta present |
| `Add a balcony` | Passed when no balcony remained; unsupported when balcony already existed |
| `Rename Bedroom 2 to Office` | Passed |
| `Rename Bedroom 3 to Office` | Correctly rejected on generated plans without Bedroom 3 |
| `Remove the balcony` | Passed; repeated removal remained safe |

### Export

| Export | Result |
| --- | --- |
| PNG valid request | Passed: `PNG_EXPORT_READY`, client SVG payload |
| PNG invalid plan | Passed: `INVALID_EXPORT_REQUEST` |
| PDF valid request | Found bug: empty `HTTP 500`; route now has structured error handling but final success could not be revalidated because the dev server became unstable |

### UI and Local Storage

- Route `/projects/new` initially returned `200`.
- Later in the sweep, Next dev server became unstable and `/projects/new` timed out or returned `500`.
- Version history storage code was inspected; direct browser/localStorage interaction was blocked by browser tooling failure and dev server instability.
- A small UI encoding/polish issue in version history was fixed by replacing the date separator with ASCII `-`.

## Bugs Fixed

1. Unsupported BIM/CAD prompts can no longer reach the local model and accidentally generate plans.
2. Vague prompts now return clarification instead of local-model schema mismatch.
3. Known local-provider chat edit commands are handled deterministically for stability.
4. Version history row separator uses ASCII and avoids mojibake in terminals/renderers.
5. PDF export route now catches renderer exceptions and returns structured export failures.

## Files Changed

- `lib/ai-planner/generate-plan-workflow.ts`
- `lib/ai-planner/edit-plan-workflow.ts`
- `app/api/export/pdf/route.ts`
- `components/workspace/VersionHistoryPanel.tsx`
- `test/unit/demo-readiness.test.ts`
- `test/unit/chat-edit-pipeline.test.ts`
- `ai/tasks/TASK-023.md`
- `docs/BUG_REPORT.md`
- `docs/QA_FIX_REPORT.md`

## Tests Added

- Regression coverage for deterministic unsupported prompt guard before local/cloud provider execution.
- Regression coverage for deterministic clarification prompt guard before provider execution.
- Regression coverage for deterministic local-provider edit handling for known MVP commands.

## Commands Run

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Timed out |
| `node .\node_modules\eslint\bin\eslint.js --version` | Timed out |
| `npm.cmd test` | Timed out |
| Focused Vitest files | Timed out |
| `npm.cmd run build` | Timed out while building |
| Ollama `/api/tags` | Passed |
| App create API supported prompts | Passed before dev server instability |
| App create API unsupported/clarification prompts | Passed after fix |
| App edit API known commands | Passed after fix |
| PNG export API | Passed |
| PDF export API | Bug found; route hardened |

## Remaining Issues

- Critical: Next dev server is not currently reliable from the OneDrive workspace path.
- High: ESLint runner hangs.
- High: Vitest test execution hangs.
- Medium: PDF export success needs revalidation after dev server/tooling stability is restored.
- Medium: Browser-based UI/localStorage QA was blocked by Browser plugin setup failure.

## Go/No-Go Recommendation

No-go for deployment or polished demo from the current OneDrive workspace state.

The core product API behavior improved materially, but the local dev server and test tooling are not stable enough to call this demo-ready. Move the project to a non-OneDrive local path, reinstall dependencies, and rerun the full check suite.

## Readiness Score

62/100

The conceptual product pipeline is functional in key API paths, and critical AI safety issues were fixed. The score is capped by local runtime instability, blocked lint/test/build, and incomplete browser/localStorage/PDF verification.
