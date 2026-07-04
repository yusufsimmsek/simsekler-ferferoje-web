# TASK-023: Full Local Runtime QA and Bug Fix Sweep v1

## Objective

Act as a senior QA engineer and senior software engineer. Use the running local application, existing tests, and local Ollama setup to discover, reproduce, document, and fix real defects without adding major product scope.

## Environment

- Local app target: `http://127.0.0.1:3000`
- Local LLM runtime: Ollama
- Active provider: `AI_PROVIDER=ollama`
- Active model: `LOCAL_LLM_MODEL=llama3.2:3b`
- Cloud APIs: prohibited

## QA Scope

- Create project flow
- Local LLM provider behavior
- Chat edit flow
- Version history and localStorage resilience
- UI route behavior and responsive smoke checks where tooling allows
- PNG/PDF export behavior
- Automated checks: typecheck, lint, tests, AI tests, build

## Constraints

- Do not add auth, database, payments, or major new features.
- Fix only small and medium bugs that can be safely addressed.
- Document large or environment-level blockers in `docs/BUG_REPORT.md`.
- Preserve strict validation and never allow invalid AI output to replace a valid plan.

## Acceptance Criteria

- Real defects are reproduced and classified.
- Safe fixes are implemented with regression tests where practical.
- Remaining issues are documented with severity and reproduction steps.
- `docs/QA_FIX_REPORT.md` is created with commands run, fixes, remaining risks, and go/no-go recommendation.

## Definition of Done

- QA passes are executed or explicitly documented as blocked.
- Code changes pass `npm run typecheck`.
- Lint/test/build results are recorded honestly.
- Local LLM behavior is documented, including unsupported and clarification behavior.
- Final readiness score is provided.
