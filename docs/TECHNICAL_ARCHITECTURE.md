# Technical Architecture

## Architecture Goal

Build the smallest reliable system that proves the core workflow:

Prompt -> structured AI plan draft -> deterministic validation -> deterministic layout -> Canvas render -> chat edit actions -> PNG/PDF export.

The architecture must keep AI planning separate from geometry, rendering, persistence, and export logic.

## Recommended Stack

### Application

- Next.js App Router.
- React with TypeScript.
- Tailwind CSS for utility styling.
- Server-side route handlers for AI, validation, and export endpoints.
- Client-side Canvas rendering for the 2D floor plan workspace.

### Domain and Validation

- TypeScript domain types for `FloorPlan`, `Room`, `Door`, `Window`, `Adjacency`, `Layout`, and `EditAction`.
- Runtime schema validation with a schema library such as Zod.
- Pure deterministic functions for geometry validation, layout normalization, edit application, and export preparation.

### AI

- Provider adapter around the model API.
- Structured JSON output only.
- Strict schema validation before any AI output becomes application state.
- Mock AI provider for local development, CI, and deterministic tests.

### Export

- PNG export from the same render geometry used by Canvas.
- PDF export through a deterministic export adapter that uses the validated plan, not a screenshot-only approximation.
- Export disclaimer embedded in the output.

### Persistence

- MVP can begin with in-memory/client-side project state.
- The codebase should prepare domain boundaries for future persistence with Postgres and an ORM such as Prisma.
- Do not add a database in the initial scaffold unless explicitly requested.

## Frontend Architecture

The frontend is a single focused workspace rather than a landing page.

Primary UI areas:

- Prompt composer.
- Floor plan canvas.
- Chat/edit panel.
- Validation and assumptions panel.
- Plan metadata panel.
- Export controls.

Recommended component boundaries:

- `WorkspaceShell`: arranges the main app layout.
- `PromptComposer`: captures the initial generation prompt.
- `FloorPlanCanvas`: renders validated plan geometry.
- `ChatEditor`: captures conversational edits and displays edit history.
- `ValidationPanel`: shows warnings, errors, and assumptions.
- `PlanSummary`: shows rooms, dimensions, area, and version.
- `ExportControls`: triggers PNG/PDF export.

State principles:

- Keep validated `FloorPlan` state as the source of truth.
- Keep chat messages and edit actions separate from floor plan geometry.
- Derive render primitives from validated plan state.
- Never let Canvas hold authoritative geometry state.

## Backend/API Architecture

The backend should expose workflow-oriented route handlers.

Proposed MVP endpoints:

- `POST /api/plan/generate`
  - Input: user prompt and optional preferences.
  - Output: validated floor plan, assumptions, warnings, and version metadata.

- `POST /api/plan/edit`
  - Input: current floor plan, chat message, and recent edit context.
  - Output: validated updated floor plan, edit actions, assumptions, and warnings.

- `POST /api/plan/validate`
  - Input: floor plan JSON.
  - Output: validation result and normalized plan.

- `POST /api/export/png`
  - Input: validated floor plan and export settings.
  - Output: PNG artifact.

- `POST /api/export/pdf`
  - Input: validated floor plan and export settings.
  - Output: PDF artifact.

API rules:

- Validate every request body.
- Return stable error codes.
- Never expose raw provider errors directly.
- Never return system prompts.
- Include schema versions in generation and edit responses.

## AI Planning Architecture

The AI layer has two responsibilities:

- Convert initial user prompts into structured `PlanDraft` JSON.
- Convert chat edit requests into structured `EditAction[]` JSON.

The AI layer must not own final geometry placement. It may suggest room sizes, adjacency intent, exterior preferences, and opening intent. The deterministic layout engine owns coordinates.

AI components:

- `ai/prompts/plan-generation.md`: system and developer prompt for initial generation.
- `ai/prompts/chat-edit.md`: system and developer prompt for edit action extraction.
- `ai/contracts/plan-generation.schema.ts`: runtime schema for plan generation output.
- `ai/contracts/chat-edit.schema.ts`: runtime schema for chat edit output.
- `lib/ai/provider.ts`: interface for real and mock AI providers.
- `lib/ai/mock-provider.ts`: deterministic mock responses.
- `lib/ai/parse-ai-response.ts`: parse, validate, and classify model responses.

AI output lifecycle:

1. Build prompt with product rules and schema version.
2. Request structured JSON only.
3. Parse response.
4. Validate JSON against runtime schema.
5. Convert draft or edit actions into domain input.
6. Run deterministic validation and layout.
7. Return safe result or structured error.

## Geometry/Layout Engine Architecture

The layout engine converts a semantic plan into rectangular coordinates.

Inputs:

- Rooms with target dimensions or target area.
- Required and preferred adjacencies.
- Exterior preferences.
- Door/window intents.
- Unit settings and grid settings.

Outputs:

- `FloorPlan` with normalized rectangular room coordinates.
- Door/window positions attached to room edges.
- Overall plan bounds.
- Validation issues.
- Layout metadata.

MVP layout strategy:

- Use a simple grid-based rectangle packing algorithm.
- Snap dimensions to a configurable grid, default `0.25m`.
- Place rooms in deterministic priority order:
  - entry/circulation,
  - living/kitchen,
  - bedrooms,
  - bathrooms,
  - utility/storage,
  - balcony.
- Prefer satisfying required adjacencies before preferred adjacencies.
- Resolve overlaps by shifting rooms along the grid.
- If a requested adjacency cannot be satisfied, preserve the room and emit a warning.

Geometry rules:

- Rooms are axis-aligned rectangles.
- Room dimensions must be positive.
- Rooms may share edges but must not overlap interiors.
- Doors must lie on a valid room edge.
- Windows must lie on an exterior room edge.
- Plan bounds must contain every room and opening.
- Coordinates use meters in world space.

## Canvas Rendering Architecture

The Canvas renderer draws from render primitives derived from `FloorPlan`.

Render pipeline:

1. `FloorPlan` is validated.
2. `toRenderModel(floorPlan)` creates walls, fills, labels, dimensions, doors, windows, and warnings.
3. `fitPlanToViewport(renderModel, canvasSize)` computes scale and offset.
4. Canvas draws layers in stable order:
   - background,
   - room fills,
   - walls,
   - doors,
   - windows,
   - dimensions,
   - labels,
   - warning overlays,
   - export disclaimer if export mode is active.

Canvas rules:

- Canvas is not the source of truth.
- Rendering must be idempotent for the same render model.
- Use device pixel ratio for crisp lines.
- Keep all geometry in world coordinates until the final viewport transform.
- Keep export rendering and on-screen rendering visually consistent.

Accessibility companion:

- Provide a textual room list next to the canvas.
- Provide validation messages in HTML, not only on Canvas.
- Provide keyboard-accessible export and zoom controls.

## Export Architecture

Exports must be generated from validated floor plan data.

PNG export:

- Use the same render model as Canvas.
- Render at export resolution independent of the on-screen canvas size.
- Include labels, dimensions, scale note, and conceptual-draft disclaimer.

PDF export:

- Use the same render model and export settings.
- Target A4 landscape for MVP.
- Include title, plan image/vector representation, room schedule, assumptions, warnings, and disclaimer.

Export rules:

- Block export on critical validation errors.
- Include non-critical warnings in PDF metadata/notes.
- Do not include internal prompts, raw AI output, secrets, debug traces, or provider metadata.
- Tie export artifacts to the plan version that produced them when persistence is added.

## Data Flow Diagram

```text
User Prompt
  -> PromptComposer
  -> POST /api/plan/generate
  -> AI Provider Adapter
  -> Structured PlanDraft JSON
  -> Runtime Schema Validation
  -> Domain Validation
  -> Layout Engine
  -> FloorPlan JSON with Coordinates
  -> Render Model
  -> FloorPlanCanvas
  -> User Chat Edit
  -> POST /api/plan/edit
  -> AI Provider Adapter
  -> Structured EditAction JSON
  -> Runtime Schema Validation
  -> Apply Edit Actions
  -> Domain Validation
  -> Layout Engine
  -> Updated FloorPlan
  -> Render Model
  -> Canvas Update
  -> Export Controls
  -> POST /api/export/png or /api/export/pdf
  -> Export Renderer
  -> Download Artifact
```

## Folder Structure Proposal

This is the proposed structure for TASK-002. Do not create it until the app scaffold task.

```text
/
  app/
    page.tsx
    layout.tsx
    globals.css
    api/
      plan/
        generate/route.ts
        edit/route.ts
        validate/route.ts
      export/
        png/route.ts
        pdf/route.ts
  components/
    workspace/
      WorkspaceShell.tsx
      PromptComposer.tsx
      ChatEditor.tsx
      ValidationPanel.tsx
      PlanSummary.tsx
      ExportControls.tsx
    floor-plan/
      FloorPlanCanvas.tsx
      CanvasToolbar.tsx
      RoomList.tsx
  lib/
    ai/
      provider.ts
      mock-provider.ts
      parse-ai-response.ts
    domain/
      floor-plan.ts
      edit-actions.ts
      validation.ts
    layout/
      generate-layout.ts
      rectangle-packing.ts
      geometry.ts
    render/
      render-model.ts
      canvas-renderer.ts
      export-renderer.ts
    export/
      png.ts
      pdf.ts
    schemas/
      floor-plan.schema.ts
      ai-contracts.schema.ts
  test/
    fixtures/
      prompts/
      floor-plans/
    unit/
    integration/
  ai/
    prompts/
    contracts/
```

## Main Risks and Mitigations

### AI Produces Invalid or Overconfident Output

Risk: The model may hallucinate unsupported geometry, compliance claims, or malformed JSON.

Mitigation: Use strict structured output, runtime validation, no compliance claims, and fallback/mock mode.

### Layout Engine Cannot Satisfy User Intent

Risk: Simple rectangle packing may fail complex requests.

Mitigation: Keep MVP scope to simple rectangular residential layouts, preserve unsatisfied constraints as warnings, and add regression fixtures.

### Canvas Rendering Diverges From Export

Risk: On-screen plan and exported plan may not match.

Mitigation: Use one render model for Canvas, PNG, and PDF export.

### Chat Edits Create Invalid State

Risk: Edit actions may break geometry or delete required context.

Mitigation: Validate each action, apply actions transactionally, and keep previous plan version for rollback.

### Users Misinterpret Plans as Construction-Ready

Risk: Users may treat approximate output as professional drawings.

Mitigation: Add visible conceptual-draft disclaimers in UI and exports.

### Scope Creep Toward CAD/BIM

Risk: Early implementation may drift toward professional drafting complexity.

Mitigation: Enforce no 3D, no BIM, no irregular shapes, no compliance claims, and no manual CAD tools in MVP.

## External References Considered

- [Next.js App Router documentation](https://nextjs.org/docs/app).
- [Next.js TypeScript documentation](https://nextjs.org/docs/app/api-reference/config/typescript).
- [React TypeScript guidance](https://react.dev/learn/typescript).
- [MDN Canvas API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API).
- [OpenAI structured output guidance](https://developers.openai.com/api/docs/guides/structured-outputs).
