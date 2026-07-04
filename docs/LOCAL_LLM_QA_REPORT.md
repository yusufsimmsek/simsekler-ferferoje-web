# Local LLM Runtime Smoke QA Report

## Environment

- Date: 2026-06-20
- Workspace: `C:\Users\user\OneDrive\Belgeler\New project`
- App URL: `http://127.0.0.1:3000`
- Runtime mode after QA: `AI_PROVIDER=ollama`
- Local model after QA: `llama3.2:3b`
- Local timeout after QA: `LOCAL_LLM_TIMEOUT_MS=240000`
- OpenAI API key in local env: empty
- Paid cloud API calls: none

## Commands Run

```powershell
winget install --id Ollama.Ollama --accept-source-agreements --accept-package-agreements
ollama pull llama3.1:8b
ollama pull llama3.2:3b
ollama list
Invoke-WebRequest http://127.0.0.1:11434/api/tags
Invoke-WebRequest http://127.0.0.1:11434/api/generate
npm run dev
Invoke-WebRequest http://127.0.0.1:3000
Invoke-WebRequest http://127.0.0.1:3000/api/plan/generate
Invoke-WebRequest http://127.0.0.1:3000/api/plan/edit
Get-Content $env:LOCALAPPDATA\Ollama\server.log
```

## Installed Local Providers Detected

| Provider | Detection | Result |
| --- | --- | --- |
| Ollama | `ollama list`, `http://127.0.0.1:11434/api/tags` | Installed and running locally |
| LM Studio | `http://127.0.0.1:1234/v1/models` | Not tested in this rerun |

Installed Ollama models:

- `llama3.1:8b`, 4.9 GB
- `llama3.2:3b`, 2.0 GB

## Mock Mode Result

Previous TASK-022 smoke testing verified mock mode through the live API:

| Endpoint | Input | Result |
| --- | --- | --- |
| `POST /api/plan/generate` | `2+1 apartment with balcony and office` | `200`, `ok=true`, `provider=mock`, validation `valid`, quality score `88.06`, optimization candidates `6` |
| `POST /api/plan/edit` | `Make the kitchen larger` using the generated plan | `200`, `ok=true`, `provider=mock`, validation `valid`, quality delta `-0.17` |

Mock mode remains the safest demo mode when deterministic speed is more important than local-model realism.

## Ollama Result

Ollama installed successfully and listened on `http://127.0.0.1:11434`.

### `llama3.1:8b`

The `llama3.1:8b` model downloaded successfully but failed at runtime on this 8 GB RAM machine.

Observed behavior:

- Direct `POST /api/generate` returned `HTTP 500`.
- App `POST /api/plan/generate` returned structured `AI_PROVIDER_FAILED`.
- Ollama server log reported model-load memory allocation failures, including CPU/CPU_REPACK buffer allocation failures.

Conclusion: this was a local runtime memory limit, not an app contract failure and not an API-key/cloud issue.

### `llama3.2:3b`

The smaller `llama3.2:3b` model loaded and returned JSON successfully.

Direct Ollama smoke test:

| Test | Result |
| --- | --- |
| `POST /api/generate` with `Return JSON only: {"ok": true}` | `200`, response `{"ok": true}` |

App prompt-to-plan test:

| Prompt | Result |
| --- | --- |
| `145 sqm modern apartment for a family of four with open kitchen, office and two balconies` | `200`, `ok=true`, `code=PLAN_GENERATED`, `provider=ollama`, `model=llama3.2:3b` |

Generated plan summary:

- Title: `Modern Family Apartment`
- Rooms: 11
- Validation: `valid_with_warnings`
- Quality score: `78.61`
- Optimizer candidates: 6 valid candidates, selected `candidate_b`
- Main warnings: one balcony was too isolated, dining adjacency was approximated, privacy/compactness warnings were produced

## Chat Edit Result

Chat edit was tested with the generated plan.

| Edit | Result |
| --- | --- |
| `Make the kitchen larger` with `LOCAL_LLM_TIMEOUT_MS=120000` | `502`, local request aborted at timeout |
| `Make the kitchen larger` with `LOCAL_LLM_TIMEOUT_MS=240000` | `422`, `EDIT_INVALID_ACTION` |

The second attempt reached the model, but the model returned an MVP-unsupported `add_door` action instead of a safe room resize action. The app rejected the edit and did not replace the valid plan.

Conclusion: local chat edit plumbing is safe, but `llama3.2:3b` is not reliable enough yet for edit-action extraction without prompt/schema tuning or stronger local model hardware.

## Prompt Coverage

Completed in this rerun:

- Supported English prompt: generated a valid plan through Ollama.

Not rerun in this pass:

- Turkish supported prompt
- Clarification prompt: `I need a house`
- Unsupported prompt: `Create a BIM model`
- LM Studio provider tests

These should be covered in the next local QA pass after deciding whether to keep `llama3.2:3b` or try another model.

## Local Provider Behavior Validation

Observed protections:

- No OpenAI API key was required.
- No paid cloud API call was made.
- `llama3.1:8b` runtime failure returned a structured provider error instead of crashing the app.
- `llama3.2:3b` prompt output was validated before layout generation.
- Invalid/unsupported chat edit action was rejected before replacing the current plan.
- Layout quality and optimizer metadata were attached to successful generation output.

## Verification Checks

| Check | Result |
| --- | --- |
| Ollama service | Running on `127.0.0.1:11434` |
| `llama3.1:8b` direct generation | Failed with Ollama `HTTP 500` due local memory allocation |
| `llama3.2:3b` direct generation | Passed |
| Next dev server | Running on `127.0.0.1:3000` |
| `GET /` | `200` |
| `POST /api/plan/generate` with demo prompt | `200`, `PLAN_GENERATED`, provider `ollama` |
| `POST /api/plan/edit` with kitchen edit | Safely rejected unsupported model action |

Full typecheck/lint/test suite was not rerun during this runtime-only rerun because product source code was not changed. Previous TASK-022 checks passed.

## Fixes Applied

- Updated `.env.local` to use Ollama local mode.
- Changed local model from `llama3.1:8b` to `llama3.2:3b` after runtime memory failure.
- Increased `LOCAL_LLM_TIMEOUT_MS` from `120000` to `240000` for this CPU-only local runtime.
- Updated README local model guidance for 8 GB RAM machines.
- Updated this QA report with real Ollama runtime results.

## Recommended Local Model

For this machine, use:

```env
AI_PROVIDER=ollama
LOCAL_LLM_BASE_URL=http://127.0.0.1:11434
LOCAL_LLM_MODEL=llama3.2:3b
LOCAL_LLM_TIMEOUT_MS=240000
OPENAI_API_KEY=
```

For stronger JSON/edit-action reliability, use a larger model only on hardware with enough RAM/VRAM. `llama3.1:8b` was not runtime-ready on this 8 GB RAM setup.

## Final Recommendation

Local LLM mode is partially ready:

- Prompt-to-plan works with `llama3.2:3b`.
- Chat edit is protected but not yet reliable with `llama3.2:3b`.

Use mock mode for polished demos requiring fast, deterministic chat edits. Use Ollama mode to demonstrate local-first generation, with honest disclosure that smaller local models may fail structured edit extraction.
