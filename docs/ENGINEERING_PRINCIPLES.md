# Engineering Principles

## Mission

Build a reliable AI-assisted floor plan product in small, reviewable increments. The engineering system should make product behavior predictable, AI outputs inspectable, and future changes easy to reason about.

## Guiding Principles

### 1. Start With Contracts

Before implementing AI behavior, define the data contracts for prompts, floor plan geometry, edit operations, validation results, and exports. AI output should be converted into typed, validated structures before it reaches rendering or persistence.

### 2. Keep AI and Deterministic Logic Separate

Use AI for interpretation, generation, and conversational intent. Use deterministic code for validation, geometry normalization, rendering, permissions, exports, and persistence.

### 3. Prefer Small Vertical Slices

Build thin end-to-end workflows that can be tested and observed. Avoid large speculative abstractions before the plan schema, editor behavior, and export pipeline are proven.

### 4. Make State Explicit

Floor plan state, chat history, generated operations, validation warnings, and export metadata should be visible in code and easy to inspect during debugging.

### 5. Design for Correction

The product is conversational, so edits, reversals, retries, and partial failures are core behaviors. Treat repairability as a first-class requirement.

### 6. Validate Before Rendering

Generated layouts must pass schema checks and geometry checks before they are rendered or saved. Invalid AI output should become actionable feedback, not broken UI.

### 7. Protect User Trust

Never imply architectural, legal, structural, or code-compliance certainty unless verified by a dedicated system. Use clear disclaimers where appropriate.

## Engineering Quality Bar

- Typed interfaces for domain data.
- Automated tests around parsing, validation, geometry transforms, and export behavior.
- Accessible frontend UI.
- Secure handling of user input and AI responses.
- Clear documentation for all AI prompts, agents, and workflows.
- No product scaffolding until architecture and task boundaries are clear.
