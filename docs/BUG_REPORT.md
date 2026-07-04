# Bug Report

## BUG-001: Local LLM generated a plan for an unsupported BIM request

- Severity: Critical
- Status: Fixed
- Reproduction:
  1. Set `AI_PROVIDER=ollama`.
  2. Set `LOCAL_LLM_MODEL=llama3.2:3b`.
  3. POST `/api/plan/generate` with `Create a BIM model`.
  4. Observe `PLAN_GENERATED` before the fix.
- Root cause:
  Local model output was trusted to classify product scope. The deterministic MVP unsupported-request rules were only reliably applied in the mock planning path.
- Fix:
  Added a deterministic prompt guard before provider execution in `runGeneratePlanWorkflow`.
- Expected result:
  The same request now returns `422`, `AI_UNSUPPORTED_REQUEST`, `aiStatus=unsupported`.

## BUG-002: Vague prompt returned schema mismatch instead of clarification

- Severity: High
- Status: Fixed
- Reproduction:
  1. POST `/api/plan/generate` with `Make me a plan`.
  2. Observe `502`, `AI_SCHEMA_MISMATCH` before the fix.
- Root cause:
  The local model produced invalid or incomplete planning JSON instead of a clarification response, and there was no deterministic pre-provider clarification guard.
- Fix:
  Added deterministic vague-prompt handling before provider execution.
- Expected result:
  The same request now returns `422`, `AI_NEEDS_CLARIFICATION`, with user-facing room-program questions.

## BUG-003: Local chat edit model produced unsupported actions for simple commands

- Severity: High
- Status: Fixed for known MVP edit commands
- Reproduction:
  1. Generate a valid plan with Ollama.
  2. POST `/api/plan/edit` with `Make the kitchen larger`.
  3. Before the fix, Ollama returned an unsupported action such as `add_door`; the API rejected it with `EDIT_INVALID_ACTION`.
- Root cause:
  `llama3.2:3b` is not reliable enough for long-context edit-action extraction.
- Fix:
  Local providers now use the deterministic MVP edit classifier for known room-level edit commands before calling the local model.
- Expected result:
  Known commands such as enlarge kitchen, add/remove balcony, and rename room are fast, deterministic, validated, and still reported under the selected local provider.

## BUG-004: Next dev server becomes unusable in OneDrive workspace

- Severity: Critical
- Status: Not fixed
- Reproduction:
  1. Run Next dev server from `C:\Users\user\OneDrive\Belgeler\New project`.
  2. Request `/projects/new`.
  3. Observe timeout or `500`.
  4. Logs show `./app/globals.css` read failures and Turbopack `.sst` persistence errors.
- Evidence:
  `Error: UNKNOWN: unknown error, read` while reading `app/globals.css`; `Persisting failed: Unable to write SST file`.
- Suspected cause:
  Next 16/Turbopack and/or webpack dev compilation is unstable from the OneDrive-managed workspace path.
- Recommendation:
  Move the project to a non-OneDrive local path such as `C:\tmp\ai-floor-plan-generator` or disable OneDrive sync for the project directory. Then reinstall dependencies and rerun dev/build/test.

## BUG-005: ESLint runner hangs before producing output

- Severity: High
- Status: Not fixed
- Reproduction:
  1. Run `npm.cmd run lint`.
  2. Run `node .\node_modules\eslint\bin\eslint.js --version`.
  3. Observe timeout with no version output.
- Suspected cause:
  Local Node/tooling environment issue, potentially related to OneDrive filesystem behavior or Node 24 compatibility with this dependency set.
- Recommendation:
  Re-run after moving workspace out of OneDrive. If it persists, pin a supported Node LTS version and reinstall `node_modules`.

## BUG-006: Vitest execution hangs

- Severity: High
- Status: Not fixed
- Reproduction:
  1. Run `npm.cmd test`.
  2. Run focused tests such as `node .\node_modules\vitest\vitest.mjs run test/unit/demo-readiness.test.ts`.
  3. Observe timeout with no test result output.
- Suspected cause:
  Local tooling/filesystem environment issue. The Vitest binary can print `--version`, but test execution does not complete.
- Recommendation:
  Re-run after moving workspace out of OneDrive and cleaning `node_modules`/`.next`.

## BUG-007: Valid PDF export request returned empty HTTP 500

- Severity: Medium
- Status: Partially fixed
- Reproduction:
  1. Generate a valid plan.
  2. POST `/api/export/pdf` with a valid `pdf` export request.
  3. Observe `HTTP 500` with an empty body before route hardening.
- Root cause:
  The route did not catch unexpected PDF rendering exceptions and therefore could return an unstructured server failure.
- Fix:
  Wrapped PDF export generation in structured `EXPORT_RENDER_FAILED` error handling.
- Remaining risk:
  Due the current Next dev server instability, the successful PDF response could not be revalidated in the running app.

## BUG-008: In-app browser QA tooling could not attach

- Severity: Medium
- Status: Not fixed
- Reproduction:
  1. Attempt Browser plugin setup.
  2. Observe `failed to write kernel assets: Sistem belirtilen yolu bulamıyor`.
- Recommendation:
  Treat this as a local tooling limitation and use HTTP/API checks until the browser plugin environment is healthy.

