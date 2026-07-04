# Task Workflow

## Purpose

This workflow defines how Codex should handle project tasks from intake to completion.

## Steps

1. Read the active task file in `ai/tasks/`.
2. Load product context from `docs/PRODUCT_VISION.md`.
3. Load engineering context from `docs/ENGINEERING_PRINCIPLES.md`.
4. Load relevant standards from `ai/standards/`.
5. Inspect the current repository state.
6. Identify assumptions, risks, and required decisions.
7. Implement only the scoped changes.
8. Run relevant checks.
9. Update documentation or task notes when appropriate.
10. Summarize changes, verification, and next steps.

## Task Intake Checklist

- Is the task objective clear?
- Are acceptance criteria defined?
- Are product and technical constraints listed?
- Is anything explicitly out of scope?
- Which standards apply?
- Which files are likely to change?

## Completion Checklist

- Scope matches the task.
- Relevant checks were run.
- New behavior is documented.
- Known limitations are recorded.
- No unrelated files were changed.

## Escalation Rules

Ask for clarification when:

- A missing product decision would change the implementation path.
- A security or privacy risk cannot be resolved locally.
- A requested change conflicts with documented product goals.
- Existing user changes make safe implementation ambiguous.
