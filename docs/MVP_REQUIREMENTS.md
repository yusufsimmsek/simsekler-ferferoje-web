# MVP Requirements

## Product Goal

User writes a prompt -> AI generates a 2D floor plan -> user edits it through chat -> user exports PNG/PDF.

## MVP Scope

The MVP is a focused concept-planning tool for simple residential floor plans. It should prove that a user can describe a home layout in natural language, receive a valid 2D plan, refine it conversationally, and export the result.

Included in MVP:

- Prompt-to-plan generation for residential layouts.
- Simple rectangular rooms only.
- One floor per project.
- Approximate metric dimensions.
- Deterministic layout normalization into non-overlapping 2D coordinates.
- Canvas-based 2D plan rendering.
- Chat-based edits that produce structured edit actions.
- Undo-ready version history at the in-memory/domain level.
- PNG export.
- PDF export.
- Mock/fallback AI mode for local development and testing.
- Clear disclaimers that plans are conceptual drafts, not construction documents.

## Out-of-Scope Features

- 3D rendering.
- BIM modeling.
- AutoCAD-level precision.
- Manual CAD drafting tools.
- Building-code, legal, permit, or structural compliance claims.
- Multi-floor buildings.
- Curved, angled, or irregular room shapes.
- Furniture placement beyond simple optional labels.
- Real-time collaboration.
- Billing, subscriptions, teams, or enterprise administration.
- Marketplace templates.
- Mobile-native app.
- Direct integration with AutoCAD, Revit, SketchUp, or BIM tools.

## Target Users

- Homeowners exploring early renovation or new-home ideas.
- Interior designers creating fast initial layout concepts.
- Architects or design studios using AI for early ideation, not final drawings.
- Real estate and construction teams preparing simple draft visuals.
- Students or hobbyists learning spatial planning.

## Core User Journey

1. The user opens the app and sees a focused workspace with prompt input, plan canvas, chat/edit panel, validation messages, and export controls.
2. The user writes a prompt such as "Create a 3 bedroom apartment with an open kitchen, living room, bathroom, ensuite, and balcony."
3. The backend sends the prompt to the AI planning layer and requests structured JSON only.
4. The app validates the AI JSON against the plan draft contract.
5. The deterministic layout engine converts the validated draft into non-overlapping rectangular coordinates.
6. The canvas renderer draws rooms, walls, doors, windows, labels, dimensions, and warnings.
7. The user asks for an edit through chat, such as "Make the living room larger and move the balcony next to it."
8. The AI returns structured edit actions only.
9. The app validates and applies the edit actions through deterministic domain logic.
10. The layout engine resolves geometry again when needed.
11. The user exports the final validated plan as PNG or PDF.

## Functional Requirements

### Prompt-to-Plan Generation

- The user can submit a natural-language residential floor plan prompt.
- The system returns a structured plan draft with rooms, approximate sizes, adjacencies, doors, windows, and user-facing assumptions.
- The AI response must be JSON only and must match the approved schema.
- The app must reject malformed or unsafe AI output.
- The app must produce a usable fallback plan in mock mode.

### Layout Generation

- The layout engine converts a validated plan draft into a `FloorPlan` with rectangular room coordinates.
- Rooms must not overlap.
- Rooms must fit within plan bounds.
- Adjacency preferences should be satisfied when possible.
- Failed or partial constraints must appear as validation warnings.
- Geometry must remain deterministic for the same input.

### Canvas Rendering

- The canvas renders validated geometry only.
- The canvas must display room boundaries, room names, approximate dimensions, doors, windows, and exterior walls.
- The user can view the complete floor plan without distortion.
- The renderer must support zoom-to-fit for MVP.
- Rendering must show validation warnings without blocking export unless the issue is critical.

### Conversational Editing

- The user can request edits through chat.
- Chat edits must produce structured `EditAction` objects only.
- Supported MVP actions:
  - Add room.
  - Remove room.
  - Rename room.
  - Resize room.
  - Move room adjacency preference.
  - Add door.
  - Move door.
  - Add window.
  - Move window.
  - Set room dimensions.
  - Regenerate layout from current semantic plan.
- Unsupported requests must return a structured refusal or clarification request.
- The app must not apply edit actions until they pass validation.

### Export

- The user can export the current validated plan as PNG.
- The user can export the current validated plan as PDF.
- Exports must include room names, dimensions, walls, doors, windows, scale note, and conceptual-draft disclaimer.
- Exports must be generated from the same validated geometry shown on canvas.

### Validation and Feedback

- The app must validate schema, room dimensions, geometry bounds, overlaps, doors, windows, and adjacencies.
- Critical validation failures block rendering and export.
- Non-critical warnings remain visible to the user.
- The app must show plain-language messages for invalid prompts, failed generation, failed edits, and failed exports.

### Persistence for MVP

- The first implementation may keep project state in browser/app memory.
- The architecture must leave room for later persistence of projects, plan versions, chat messages, edit actions, validation issues, and export artifacts.
- No database is required in the initial scaffold unless explicitly approved in a later task.

## Non-Functional Requirements

### Reliability

- AI output must never be trusted directly.
- Validation must run before rendering, state updates, persistence, or export.
- Deterministic layout code must handle malformed dimensions and impossible adjacency requests safely.

### Performance

- MVP-sized plans should render interactively in the browser.
- Target plan size: up to 12 rooms, 24 doors/windows, and 30 adjacency preferences.
- Prompt generation can be asynchronous, but the UI must show progress.
- Layout generation should complete fast enough to feel immediate after AI JSON is received.

### Security and Privacy

- User prompts are untrusted input.
- System prompts, internal contracts, and secrets must not be exposed to the user or included in exports.
- API keys must only exist on the server side.
- Prompt injection attempts must not alter application rules or hidden instructions.
- Logs must avoid storing sensitive user content unless intentionally needed.

### Accessibility

- Primary controls must be keyboard accessible.
- Canvas-adjacent information must expose room lists and validation messages in text form.
- Controls must have visible focus states.
- Color must not be the only indicator of warnings or errors.

### Maintainability

- Domain types, validation, layout, rendering, AI contracts, and export logic must be separated.
- Geometry functions should be pure where practical.
- Tests should cover schema validation, layout rules, edit actions, rendering adapters, and export preparation.

### Product Trust

- The product must describe output as a conceptual draft.
- The product must not claim architectural, legal, structural, code, zoning, permit, or construction compliance.
- Dimensions must be labeled approximate unless a later precision model is approved.

## Acceptance Criteria

- A user can enter one prompt and receive a rendered 2D rectangular-room floor plan.
- The generated plan uses structured JSON and passes validation before rendering.
- The layout engine places rooms in non-overlapping 2D coordinates.
- The canvas renders the generated geometry with labels and approximate dimensions.
- The user can request at least one chat edit and see the plan update after validation.
- The user can export the current plan as PNG.
- The user can export the current plan as PDF.
- Invalid AI responses are rejected with user-facing error messages.
- Unsupported edit requests produce structured clarification/refusal behavior.
- The app includes a visible conceptual-draft disclaimer.
- No 3D, BIM, AutoCAD precision, or compliance claims are present.

## Success Metrics

### Product Metrics

- First usable plan generated in under 30 seconds for standard prompts.
- At least 70% of MVP test prompts produce a valid renderable plan without manual repair.
- At least 80% of supported edit requests apply successfully in test fixtures.
- At least 90% successful export rate for validated plans.
- Average user reaches export in fewer than five edit turns during usability tests.

### Quality Metrics

- 100% of AI responses pass through schema validation before use.
- Zero known overlap bugs in validated floor plans.
- Critical validation failures block export 100% of the time.
- Unit coverage exists for schema validation, layout normalization, and edit application.
- Regression fixtures exist for failed prompts and failed edit requests.

### Learning Metrics

- Track the most common unsupported prompts.
- Track validation failure categories.
- Track AI retry and fallback usage.
- Track export failure reasons.
- Track user edits that indicate poor initial layout quality.
