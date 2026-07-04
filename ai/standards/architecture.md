# Architecture Standard

## Architectural Direction

The system should be organized around explicit floor plan state and deterministic transformations. AI should propose structured operations; application logic should validate and apply those operations.

## Initial Domain Boundaries

- Prompt understanding: converts natural language into structured intent.
- Plan generation: creates initial room and wall layout candidates.
- Plan validation: checks geometry, schema, dimensions, and consistency.
- Plan editing: applies conversational edit operations.
- Rendering: turns plan state into 2D visual output.
- Export: produces PNG and PDF artifacts.
- Persistence: stores projects, plan versions, and chat/edit history.

## Core Data Concepts

- Project
- FloorPlan
- Room
- Wall
- Door
- Window
- Dimension
- Label
- EditOperation
- ValidationIssue
- ExportJob

## Architectural Rules

- Define schemas before building UI or backend endpoints.
- Keep render state derived from validated plan state.
- Keep edit operations append-only where possible so changes can be replayed or undone.
- Treat AI responses as proposals until validated.
- Keep export behavior deterministic and reproducible.

## Early Architecture Questions

- What floor plan schema is sufficient for MVP?
- Should rendering use SVG, Canvas, or a hybrid approach?
- How will conversational edits map to atomic operations?
- What persistence model is needed for version history?
- Which AI model and structured-output strategy should be used?
