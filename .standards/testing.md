# Testing Standard

## Purpose

Verification must protect the core architectural workflow and prevent regressions in trust-critical behavior.

## Requirements

- Run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` after code changes when available.
- Run integration and e2e tests when available and relevant.
- Add regression tests for fixed defects.
- Prioritize tests for workflow gates, data integrity, API contracts, AI output validation, security boundaries, and persistence behavior.
- Document any verification that cannot run.

## Review Gate

QA Lead must approve residual test gaps for high-risk changes.
