# Backend Standard

## Backend Responsibilities

The backend should coordinate AI requests, validate structured outputs, persist user projects, and generate exports. It should not leak raw implementation details to the frontend.

## API Principles

- Use typed request and response contracts.
- Validate all input at the boundary.
- Return structured errors with stable error codes.
- Keep endpoints narrow and workflow-oriented.
- Avoid long-running synchronous export or generation requests if they become slow.

## AI Integration

- Store prompt templates and schema versions.
- Capture AI output metadata needed for debugging and evaluation.
- Validate AI output before persistence.
- Protect system prompts and internal instructions.
- Detect and reject prompt-injection attempts that target system behavior.

## Export Responsibilities

- Generate deterministic PNG/PDF output from validated plan state.
- Include dimensions and labels consistently.
- Return clear errors when export fails.

## Observability

- Log request IDs, schema versions, validation failures, and export failures.
- Avoid storing sensitive user content unless needed for product functionality.
- Redact secrets and credentials from all logs.
