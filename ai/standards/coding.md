# Coding Standard

## Goals

Code should be readable, typed, testable, and easy to modify. The product will combine AI output, geometry, rendering, and export behavior, so unclear code will quickly become expensive.

## Rules

- Use strong typing for all domain objects and API contracts.
- Prefer pure functions for geometry transforms, validation, parsing, and export preparation.
- Keep side effects at module boundaries.
- Name functions after business intent, not implementation detail.
- Avoid large files that mix UI, AI calls, validation, and persistence.
- Do not accept raw AI output as trusted application state.
- Keep comments concise and useful. Explain why, not what.

## Error Handling

- Represent expected failures as typed results where practical.
- Include actionable error messages for invalid prompts, invalid geometry, failed exports, and failed AI responses.
- Log enough context for debugging without exposing private user prompt data unnecessarily.

## Maintainability

- Prefer local clarity over premature abstraction.
- Introduce shared utilities only after repeated real use.
- Keep public module APIs small.
- Remove dead code as part of the task that makes it obsolete.
