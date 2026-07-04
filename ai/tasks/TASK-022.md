# TASK-022: Local LLM Runtime Smoke QA v1

## Objective

Run a small local runtime smoke QA for the new local LLM providers without using paid cloud APIs.

## Scope

- Local QA only.
- No OpenAI API calls.
- No paid cloud API calls.
- No database, auth, deployment, or UI redesign.
- Fix only small provider/config bugs if they block local QA.

## Required Checks

- Verify `AI_PROVIDER=mock` through `POST /api/plan/generate` and `POST /api/plan/edit`.
- Detect Ollama at `http://127.0.0.1:11434`.
- If Ollama is running with a usable model, test supported, Turkish, clarification, and unsupported generation prompts through the API.
- Detect LM Studio at `http://127.0.0.1:1234/v1`.
- If LM Studio is running with a loaded model, run the same generation prompts through the API.
- Validate local provider behavior: no OpenAI key requirement, no paid cloud calls, correct provider metadata, safe invalid output rejection, safe unsupported/clarification behavior, and validated plans when local output is valid.
- Test local chat edits if a local provider produces a valid plan.
- Create `docs/LOCAL_LLM_QA_REPORT.md`.
- Update README troubleshooting if useful.

## Completion Notes

- Mock mode passed live API smoke testing for generation and chat edit.
- Ollama was not installed or listening on `http://127.0.0.1:11434`.
- LM Studio was not installed or listening on `http://127.0.0.1:1234/v1`.
- No OpenAI API key was present in `.env.local`.
- No paid cloud API calls were made.
- Local provider behavior remains covered by mocked provider tests.
- `docs/LOCAL_LLM_QA_REPORT.md` records setup instructions and the final recommendation.
