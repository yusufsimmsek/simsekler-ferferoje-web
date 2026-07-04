# TASK-002: Scaffold the Next.js TypeScript Application With the Approved Architecture

## Status

Completed

## Objective

Scaffold the initial Next.js TypeScript application for AI Floor Plan Generator using the approved product design layer and technical architecture, without implementing the full product yet.

The scaffold should create the app foundation, route shells, reusable layout primitives, clear component boundaries, placeholder route handlers, domain type placeholders, and mock-mode wiring points needed for future implementation tasks.

## Required Specification Compliance

TASK-002 must follow:

- `docs/PRODUCT_DESIGN_SPECIFICATION.md`
- `docs/DESIGN_SYSTEM_SPECIFICATION.md`
- `docs/USER_FLOW_SPECIFICATION.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/MVP_REQUIREMENTS.md`
- `docs/AI_CONTRACTS.md`
- `docs/FLOOR_PLAN_SCHEMA.md`
- `docs/ENGINEERING_PRINCIPLES.md`

If any implementation decision conflicts across these documents, preserve MVP simplicity and the technical safety rules: structured JSON only, deterministic validation/layout, 2D rectangular rooms only, no 3D, no BIM, no CAD precision, and no compliance claims.

## Required Files/Folders

Create the application scaffold and these initial folders:

```text
app/
  layout.tsx
  page.tsx
  globals.css
  dashboard/
    page.tsx
  projects/
    new/
      page.tsx
    [projectId]/
      page.tsx
  api/
    plan/
      generate/route.ts
      edit/route.ts
      validate/route.ts
    export/
      png/route.ts
      pdf/route.ts
components/
  layout/
    AppShell.tsx
    MarketingShell.tsx
    Topbar.tsx
    Sidebar.tsx
    Panel.tsx
  workspace/
    WorkspaceShell.tsx
    PromptComposer.tsx
    ChatEditor.tsx
    ValidationPanel.tsx
    PlanSummary.tsx
    ExportControls.tsx
    RoomInspector.tsx
    ExportModal.tsx
  floor-plan/
    FloorPlanCanvas.tsx
    CanvasToolbar.tsx
    RoomList.tsx
  ui/
    Button.tsx
    Input.tsx
    Textarea.tsx
    Card.tsx
    Modal.tsx
    Toast.tsx
    StatusChip.tsx
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
  design/
    tokens.ts
test/
  fixtures/
    prompts/
    floor-plans/
  unit/
  integration/
```

## Page Scaffold Requirements

### Landing Page

- Route: `/`.
- Must be product-led and restrained.
- Must include the product promise, primary CTA to create a floor plan, a realistic workspace/floor-plan preview placeholder, and conceptual-draft disclaimer.
- Must not include heavy marketing sections, pricing, testimonials, enterprise content, or compliance claims.

### Dashboard Page

- Route: `/dashboard`.
- Must include project list/empty-state placeholder, topbar, and "New project" action.
- Must clearly label mock/demo data if used.

### Create Project Page

- Route: `/projects/new`.
- Must include prompt textarea, example prompts, basic preferences placeholder, and generate action placeholder.
- Must communicate simple 2D rectangular MVP scope.

### Project Editor Page

- Route: `/projects/[projectId]`.
- Must include workspace shell with topbar, canvas area, AI chat panel, room inspector/room list, validation panel, and export controls.
- Must render placeholders only unless a later task explicitly implements behavior.

## Tech Stack

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- ESLint.
- Runtime schemas with a schema validation library such as Zod.
- Canvas 2D API for MVP rendering.
- Mock AI provider for scaffold verification.
- Suggested icon library: `lucide-react` if package installation is approved during scaffolding.

Do not add a database in this task unless a later instruction explicitly changes scope.

## Design Constraints

- UI should feel premium, modern, technical, and startup-grade.
- Product should feel like a real AI SaaS, not a student project.
- Use clear component boundaries.
- Use reusable layout primitives.
- Support future Figma translation through stable tokens and component names.
- Do not overbuild interactions beyond scaffold placeholders.
- Avoid decorative UI that competes with the floor plan.
- Keep cards limited to repeated items, modals, and genuinely framed tools.
- Use icons for canvas/tool actions where practical.
- Include accessible labels and visible focus states.

## Product and Technical Constraints

- Do not build the full product workflow yet.
- Do not connect to a live AI provider yet.
- Do not implement production-grade layout packing yet.
- Do not implement final PNG/PDF export yet.
- Do not add authentication, billing, teams, or database persistence.
- Do not add 3D, BIM, CAD, or compliance features.
- Do not claim construction, permit, structural, legal, zoning, or code compliance.
- Keep MVP simple: one floor, simple rectangular rooms, approximate dimensions.
- AI must be represented as structured JSON-only contracts.
- Layout engine must be represented as deterministic conversion from JSON to non-overlapping 2D coordinates.
- Canvas must be represented as rendering generated geometry, not owning source-of-truth geometry.

## Acceptance Criteria

- A Next.js TypeScript app is scaffolded successfully.
- The app uses the App Router.
- Landing, dashboard, create project, and project editor route shells exist.
- The editor route renders a workspace shell with placeholder prompt/chat, canvas, room inspector, validation, summary, and export areas.
- The proposed folders exist.
- Reusable UI/layout primitives exist as typed placeholders.
- Placeholder route handlers exist for plan generation, chat edit, validation, PNG export, and PDF export.
- Domain, schema, AI, layout, render, design-token, and export modules exist as typed placeholders.
- Mock AI mode is represented by an interface and placeholder implementation.
- No live AI provider is required to run the app.
- No database is required to run the app.
- The app can start locally.
- Lint/build checks pass, or any scaffold limitation is documented.
- Design choices align with `docs/PRODUCT_DESIGN_SPECIFICATION.md`, `docs/DESIGN_SYSTEM_SPECIFICATION.md`, and `docs/USER_FLOW_SPECIFICATION.md`.

## Definition of Done

- The scaffold follows the approved design and architecture documents.
- The scaffold respects the MVP constraints in `docs/MVP_REQUIREMENTS.md`.
- The scaffold includes no full product implementation beyond placeholders and static mock wiring.
- The scaffold includes no unsupported scope such as 3D, BIM, CAD precision, or compliance claims.
- The app starts with route shells for the MVP page list.
- The editor shell feels like a premium technical AI SaaS workspace.
- Relevant checks are run and documented in the task summary.
- Follow-up implementation tasks are identified for schema implementation, mock generation, layout engine, Canvas renderer, chat edits, export pipeline, and Figma/design-system translation.

## Suggested Follow-Up Tasks

- TASK-003: Implement TypeScript domain types and runtime schemas.
- TASK-004: Implement deterministic mock prompt-to-plan generation.
- TASK-005: Implement rectangular layout engine and validation rules.
- TASK-006: Implement Canvas renderer for validated floor plans.
- TASK-007: Implement chat edit action parsing and application.
- TASK-008: Implement PNG/PDF export pipeline.
- TASK-009: Create Figma-ready design tokens and component inventory.

## Completion Notes

- Created the Next.js App Router foundation.
- Added TypeScript, Tailwind, ESLint, and Next configuration.
- Added route shells for `/`, `/dashboard`, `/projects/new`, and `/projects/[projectId]`.
- Added placeholder API routes for plan generation, chat edit, plan validation, PNG export, and PDF export.
- Added reusable layout primitives, UI primitives, workspace components, and floor-plan placeholders.
- Added typed module boundaries for AI planning, floor plans, layout engine, editor state, rendering, export, schemas, and design tokens.
- Added mock provider wiring points and fixture placeholders.
- Added README setup instructions.
- Verified with `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit --omit=dev`.
- Started the local dev server and verified the MVP routes and placeholder APIs at `http://127.0.0.1:3000`.
