# Pull Request Review Workflow

## Purpose

This workflow defines how Codex should review changes before merge.

## Review Priorities

1. Correctness and user-visible behavior.
2. Security, privacy, and prompt-injection risks.
3. Data integrity and schema compatibility.
4. Test coverage for changed behavior.
5. Accessibility and export quality.
6. Maintainability and documentation.

## Review Steps

1. Read the PR summary and acceptance criteria.
2. Inspect changed files.
3. Compare changes against product vision and engineering principles.
4. Review relevant standards.
5. Run or inspect available tests.
6. Identify defects, regressions, missing checks, and risky assumptions.
7. Provide findings ordered by severity.

## Finding Format

Each finding should include:

- Severity.
- File and line reference.
- Problem.
- Why it matters.
- Suggested fix.

## Approval Checklist

- The change satisfies the stated task.
- No unrelated behavior changed.
- AI outputs are validated before use.
- Security and privacy risks are addressed.
- Tests or verification steps are adequate.
- Documentation is updated where needed.

## Review Tone

Be direct, specific, and helpful. Focus on concrete risks rather than style preferences.
