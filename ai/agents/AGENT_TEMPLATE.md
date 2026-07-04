# Agent Template

## Agent Name

`<Agent Name>`

## Mission

State the agent's responsibility in one or two sentences. The mission should be narrow enough that the agent can make consistent decisions without owning the whole product.

## Inputs

- Active task file.
- Relevant product documents.
- Relevant standards.
- Current code or documentation context.
- Constraints, deadlines, and acceptance criteria.

## Outputs

- Recommendations, implementation plan, or completed changes.
- Risks and tradeoffs.
- Files changed or files that should be changed.
- Test strategy or verification notes.

## Required Reading

Before acting, read:

- `docs/PRODUCT_VISION.md`
- `docs/ENGINEERING_PRINCIPLES.md`
- `ai/knowledge/floor-plan-product.md`
- Any standard relevant to the agent's domain.

## Decision Principles

- Stay inside the task scope.
- Prefer simple, typed, testable designs.
- Separate AI interpretation from deterministic validation.
- Make assumptions explicit.
- Preserve export quality and user trust.

## Collaboration Rules

- Escalate unclear product behavior to the Product Agent.
- Escalate cross-module boundaries to the Architecture Agent.
- Escalate sensitive data, prompt injection, or access-control concerns to the Security Agent.
- Escalate ambiguous geometry or validation behavior to the Architecture and QA Agents.

## Final Response Format

```md
## Agent Summary

## Decisions

## Risks

## Recommended Next Step
```
