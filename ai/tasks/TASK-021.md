# TASK-021: Local LLM Provider Support v1

## Objective

Remove dependency on paid cloud AI providers by adding local-first LLM provider support for planning and chat edit structured outputs.

## Scope

- Add Ollama provider support.
- Add LM Studio / OpenAI-compatible local provider support.
- Keep deterministic mock mode as the default and safest mode.
- Keep OpenAI provider optional when explicitly configured.
- Do not require paid API keys for local operation.
- Do not change layout, optimizer, renderer, persistence, or UI architecture.

## Implementation Summary

- Added provider options:
  - `mock`
  - `ollama`
  - `lmstudio`
  - `openai-compatible-local`
  - `openai`
- Added local environment variables:
  - `LOCAL_LLM_BASE_URL`
  - `LOCAL_LLM_MODEL`
  - `LOCAL_LLM_TIMEOUT_MS`
- Added server-side local provider implementations using `fetch`.
- Reused existing planning prompts, JSON schemas, Zod validation, planning resolver, layout optimizer, and edit action workflow.
- Preserved mock mode as default.
- Preserved OpenAI mode as optional and gated by `OPENAI_API_KEY`.

## Constraints

- No external paid API calls are required.
- Local model output is never trusted without schema validation.
- Local provider failures return structured API errors.
- Local providers do not generate layout coordinates.
- Deterministic layout, optimizer, renderer, export, storage, and UI architecture remain unchanged.

## Acceptance Criteria

- `AI_PROVIDER=mock` works without local or cloud dependencies.
- `AI_PROVIDER=ollama` targets the local Ollama API.
- `AI_PROVIDER=lmstudio` targets LM Studio's local OpenAI-compatible API.
- `AI_PROVIDER=openai-compatible-local` targets a configurable local `/v1/chat/completions` API.
- Local providers do not require `OPENAI_API_KEY`.
- Invalid local model JSON is rejected.
- Missing local server failures are returned as structured provider errors.
- Existing OpenAI mode remains optional.
- Existing tests continue passing.

## Definition of Done

- Local provider modules are implemented.
- Provider config recognizes all supported modes.
- README documents Ollama and LM Studio setup.
- Unit tests cover provider selection, request construction, invalid output, missing server errors, mock mode, and OpenAI optional behavior.
- Typecheck, lint, AI tests, and full tests pass.
