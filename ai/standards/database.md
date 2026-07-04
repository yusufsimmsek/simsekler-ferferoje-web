# Database Standard

## Data Goals

The database should preserve user projects, plan versions, edit history, and export metadata in a way that supports undo, debugging, and future collaboration.

## Core Entities

- User
- Project
- FloorPlanVersion
- ChatMessage
- EditOperation
- ValidationIssue
- ExportArtifact

## Rules

- Store validated floor plan state with a schema version.
- Store edit operations separately when they are needed for replay or undo.
- Keep AI prompt and response metadata separate from user-facing plan state.
- Use migrations for schema changes.
- Avoid destructive updates to plan history unless explicitly required.

## Integrity Requirements

- Every floor plan version belongs to a project.
- Every export artifact references the exact plan version used to create it.
- Every AI-generated operation records the model, prompt template version, and validation outcome.

## Privacy Requirements

- Minimize stored prompt content.
- Avoid storing secrets or API keys in the database.
- Prepare for user data deletion from the beginning.
