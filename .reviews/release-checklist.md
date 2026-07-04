# Release Checklist

## Required Gates

- Knowledge Guardian confirms documentation consistency.
- Orchestrator confirms correct agents reviewed the work.
- Product Manager confirms acceptance criteria.
- QA Lead confirms verification or documented gaps.
- Security Engineer confirms no unresolved P0/P1 security issue.
- Performance Engineer confirms no obvious critical regression.
- Principal Product Designer or Frontend Engineer confirms user-facing quality when UI changed.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- Integration tests when available
- E2E tests when available
- Manual browser check for visible UI changes

## Release Notes Format

```md
Summary:
Changed files:
Verification:
Known risks:
Backlog updates:
```
