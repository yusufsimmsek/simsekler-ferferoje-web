# Security Standard

## Security Goals

Protect user data, application integrity, AI system instructions, and exported artifacts. Because the product accepts natural language prompts, prompt injection and untrusted generated content are core risks.

## Input Handling

- Treat all user prompts as untrusted input.
- Validate every API request.
- Validate all AI responses against schemas.
- Reject generated operations that exceed product limits or violate geometry constraints.

## AI Safety

- Never expose system prompts, hidden policies, API keys, or internal orchestration instructions.
- Separate user-visible chat content from internal tool instructions.
- Detect attempts to override system behavior.
- Keep model output constrained to structured schemas for plan generation and edits.

## Data Protection

- Store only the data required for product functionality.
- Redact sensitive data from logs.
- Use environment variables or managed secret storage for credentials.
- Enforce project ownership on every project, plan, and export request.

## Export Security

- Ensure exported files contain only intended plan data.
- Use safe filenames.
- Do not embed private debug metadata in PNG or PDF exports.

## Review Checklist

- Are all inputs validated?
- Can one user access another user's project?
- Can prompt content alter internal instructions?
- Are secrets excluded from logs and artifacts?
- Are generated files safe to download?
