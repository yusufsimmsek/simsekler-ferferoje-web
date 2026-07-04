# Testing Standard

## Testing Goals

Testing should protect the core promise: natural language becomes a valid 2D plan, chat edits modify it correctly, and exports match the validated plan.

## Required Test Areas

- Schema validation for floor plan state.
- Prompt-to-structured-output parsing.
- Geometry normalization and constraints.
- Conversational edit operations.
- Rendering of rooms, walls, openings, labels, and dimensions.
- Export generation for PNG and PDF.
- API validation and authorization.
- Regression tests for previously failed prompts.

## Test Types

- Unit tests for pure geometry and validation functions.
- Contract tests for API and AI schema boundaries.
- Integration tests for generation and edit workflows.
- Visual regression tests for plan rendering when practical.
- End-to-end tests for prompt, edit, and export flows.

## AI Evaluation

- Maintain a prompt fixture set for common layout requests.
- Track whether AI output passes schema validation.
- Track whether generated plans satisfy required rooms and constraints.
- Add failing prompts to regression fixtures.

## Minimum Completion Rule

A task is not complete until relevant checks have been run or a clear reason is documented for why they could not be run.
