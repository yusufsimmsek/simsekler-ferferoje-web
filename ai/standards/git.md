# Git Standard

## Commit Principles

- Keep commits scoped to one coherent task.
- Use clear, imperative commit messages.
- Do not mix product code, documentation, formatting, and unrelated cleanup in one commit unless the task requires it.
- Preserve user changes and unrelated work.

## Branch Naming

Use descriptive branch names. Suggested format:

```text
codex/<short-task-name>
```

Examples:

- `codex/ai-dos-foundation`
- `codex/plan-schema`
- `codex/export-pipeline`

## Pull Request Expectations

Each PR should include:

- Summary of changes.
- Acceptance criteria.
- Screenshots or artifacts for frontend/export work.
- Tests run.
- Known risks or follow-up work.

## Review Standard

Review for correctness, scope control, security, data integrity, accessibility, and test coverage. Prefer actionable comments tied to specific files and lines.
