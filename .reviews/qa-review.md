# QA Review Template

## Scope

Use after any implementation and before claiming completion.

## Required Reviewers

- QA Lead
- Relevant implementation agents
- Security Engineer for trust-boundary changes
- Performance Engineer for performance-sensitive changes

## Checklist

- Lint result
- Typecheck result
- Build result
- Unit test result
- Integration test result when available
- E2E test result when available
- Manual/browser verification when visual or interactive behavior changed
- Regression coverage for fixed defects

## Output

```md
QA verdict:
Commands run:
Failures:
Coverage gaps:
Residual risk:
```
