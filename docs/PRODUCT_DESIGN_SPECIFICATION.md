# Product Design Specification

## Purpose

This document defines the product experience layer for the AI Floor Plan Generator MVP before any application code is created. It translates the product vision, MVP requirements, technical architecture, schema, and AI contracts into concrete UX decisions.

The product goal is:

```text
User writes a prompt -> AI generates a 2D floor plan -> user edits it through chat -> user exports PNG/PDF.
```

## Product Experience Principles

### 1. Workspace First

The product should feel like a real design workspace from the first authenticated screen. Avoid a marketing-heavy app experience. The editor should prioritize the plan canvas, prompt/chat controls, validation feedback, and export actions.

### 2. AI Is a Drafting Partner, Not an Authority

AI actions should be visible, explainable, and reversible. The UI must show assumptions, validation warnings, and conceptual-draft disclaimers whenever plans are generated, edited, or exported.

### 3. Simple Beats CAD Complexity

The MVP should not imitate AutoCAD, BIM, or professional architecture software. It should offer a clean AI-assisted concept workflow with simple rectangular rooms and readable 2D output.

### 4. The Plan Is the Product

The visual floor plan should be the center of attention. Panels, controls, and metadata should support the canvas without competing with it.

### 5. Fast Confidence

Users should quickly understand what happened, what changed, and what still needs attention. Loading, validation, and export states should feel deliberate and professional.

### 6. Startup-Grade Polish

The interface should feel premium, modern, technical, and calm. It should look like a serious AI SaaS product, not a demo or student project.

## Information Architecture

Primary navigation:

- Home
- Dashboard
- New Project
- Project Editor
- Settings placeholder for future use

Primary product objects:

- Project
- Floor plan version
- Prompt
- Chat edit
- Validation issue
- Export artifact

Primary user actions:

- Create project from prompt.
- Generate floor plan.
- Review assumptions and warnings.
- Edit through chat.
- Inspect room details.
- Export PNG.
- Export PDF.

## Full Page List

### MVP Pages

- `/` - Landing page.
- `/dashboard` - Project dashboard.
- `/projects/new` - Create project page.
- `/projects/[projectId]` - Project editor page.

### Future Pages

- `/settings` - User settings and preferences.
- `/projects/[projectId]/exports` - Export history.
- `/templates` - Prompt/layout templates.
- `/help` - Product help and examples.

## Landing Page Specification

Purpose:

- Explain the product promise clearly.
- Help a new user understand the workflow in under 10 seconds.
- Route users into project creation.

Content hierarchy:

- Hero headline: "AI Floor Plan Generator".
- Supporting copy: "Describe a home layout, generate a 2D plan, refine it through chat, and export PNG or PDF."
- Primary action: "Create a floor plan".
- Secondary action: "View examples".
- Product preview: static 2D floor plan workspace preview, not a vague abstract illustration.
- Three workflow steps: Prompt, Generate, Edit and export.
- Trust note: "Conceptual drafts only. Not for construction or permit use."

Design rules:

- Keep the landing page restrained and product-led.
- Use the actual product interface or a realistic generated floor plan preview as the main visual.
- Avoid claims about code compliance, structural safety, or professional certification.
- Do not overbuild pricing, enterprise, testimonials, or blog sections for MVP.

Primary empty-state route:

- If the user starts from landing, the primary CTA routes to `/projects/new`.

## Dashboard Page Specification

Purpose:

- Let returning users see projects and resume work.
- Let first-time users create their first project.

Layout:

- Topbar with product name, current workspace label, and primary "New project" action.
- Main header with project count and last updated summary.
- Project grid/list with project cards.
- Empty dashboard state when there are no projects.

Project card content:

- Project title.
- Thumbnail or miniature floor plan preview.
- Room count.
- Last edited timestamp.
- Validation status.
- Export availability status.

Primary actions:

- Open project.
- Create new project.
- Duplicate project placeholder for future use.
- Delete/archive placeholder for future use.

MVP behavior:

- If persistence is not implemented yet, dashboard may show sample/mock projects or an empty state.
- The UI must clearly label mock/demo data when used.

## Create Project Page Specification

Purpose:

- Capture the initial prompt and basic project preferences.
- Start prompt-to-plan generation.

Layout:

- Compact topbar.
- Main prompt panel.
- Examples column or inline prompt suggestions.
- Scope reminder: "Simple rectangular 2D plans only for MVP."

Fields:

- Project name, optional.
- Prompt textarea, required.
- Unit preference, default meters.
- Layout type, default residential apartment/home.
- Mock mode indicator when enabled.

Prompt examples:

- "Create a 3 bedroom apartment with an open kitchen, one bathroom, one WC, and a balcony off the living room."
- "Design a compact 2 bedroom home with a large living room and separate kitchen."
- "Make a studio apartment with bathroom, entry, kitchen zone, and sleeping area."

Primary actions:

- Generate floor plan.
- Use example prompt.
- Cancel/back to dashboard.

Validation:

- Empty prompt: "Describe the layout you want to generate."
- Too broad: "Keep the first version to one simple floor with rectangular rooms."
- Out of scope: "3D, BIM, and construction-ready plans are outside the MVP."

## Project Editor Page Specification

Purpose:

- Provide the main working surface for reviewing, editing, validating, and exporting a floor plan.

Layout:

- Topbar: project title, validation status, undo/redo placeholders, export button.
- Left panel: room list and room inspector.
- Center: 2D floor plan canvas.
- Right panel: AI chat editor.
- Bottom or secondary panel: assumptions and validation issues.

Recommended desktop proportions:

- Left panel: 280-320px.
- Canvas center: flexible main area.
- Right chat panel: 340-400px.
- Topbar: 56-64px.

Primary editor states:

- Empty editor before plan generation.
- Generating plan.
- Valid plan loaded.
- Plan loaded with warnings.
- Critical validation error.
- Editing through chat.
- Exporting.

Canvas content:

- Room fills.
- Room labels.
- Approximate dimensions.
- Walls.
- Doors.
- Windows.
- Exterior boundary.
- Validation overlays when helpful.

Editor rules:

- Canvas never owns source-of-truth geometry.
- Editor renders validated `FloorPlan` only.
- AI chat actions must be summarized before or immediately after application.
- Unsupported edit requests must become clarification or refusal states.

## Export Modal Specification

Purpose:

- Let the user export the current validated floor plan as PNG or PDF.

Trigger:

- Export button in topbar and export controls.

Modal sections:

- Format selector: PNG or PDF.
- Export preview summary.
- Include options:
  - Room labels.
  - Approximate dimensions.
  - Warnings/assumptions note for PDF.
  - Conceptual-draft disclaimer, required and always on.
- Page setting for PDF: A4 landscape by default.
- Resolution setting for PNG: standard or high.
- Validation status summary.

Blocking behavior:

- Critical validation errors disable export and show the reason.
- Non-critical warnings allow export but are shown in the modal.

Primary actions:

- Export PNG.
- Export PDF.
- Cancel.

Microcopy:

- "Exports are conceptual drafts and are not suitable for construction, permits, or legal use."
- "The export uses the same validated geometry shown in the editor."

## AI Chat Panel Specification

Purpose:

- Let users edit the plan conversationally without learning drawing tools.

Panel content:

- Conversation history.
- AI action summaries.
- Clarification requests.
- Validation feedback after edits.
- Prompt input.
- Suggested quick actions.

Supported quick actions:

- Make selected room larger.
- Add window to selected room.
- Rename selected room.
- Regenerate layout.
- Export current plan.

Message types:

- User message.
- AI summary.
- System validation message.
- Clarification request.
- Unsupported request message.
- Mock mode message.

Rules:

- Do not show raw JSON to standard users in MVP.
- Do not expose hidden prompts or internal contracts.
- Show concise summaries of edit actions.
- Use stable room names from the current plan.
- Ask a clarification question instead of guessing when the target is ambiguous.

## Room Inspector Panel Specification

Purpose:

- Show selected room details and expose simple future editing controls.

Fields:

- Room name.
- Room type.
- Approximate dimensions.
- Area.
- Exterior preference.
- Wet area flag.
- Connected rooms.
- Doors and windows count.
- Validation notes for that room.

MVP controls:

- Rename room placeholder.
- Resize request helper.
- Add window request helper.
- Focus room on canvas.

Rules:

- Inspector does not directly mutate geometry in MVP unless routed through approved edit actions.
- Manual CAD-style editing is out of scope.

## Empty States

Dashboard empty state:

- Title: "Create your first floor plan"
- Body: "Start with a simple prompt. You can refine the plan through chat after generation."
- Action: "New project"

Create project empty prompt state:

- Title: "Describe the space"
- Body: "Mention rooms, rough size, and important relationships like balcony near living room."

Editor empty state:

- Title: "No plan generated yet"
- Body: "Generate a plan from a prompt to begin editing."
- Action: "Create from prompt"

Chat empty state:

- Title: "Edit with natural language"
- Body: "Try: Make the living room larger, add a window to bedroom 2, or move the balcony next to the living room."

Room inspector empty state:

- Title: "Select a room"
- Body: "Room details appear here after a plan is generated."

## Loading States

Generation loading:

- Show progress copy: "Interpreting prompt", "Creating room plan", "Validating layout", "Preparing canvas".
- Keep the user in context.
- Do not show fake precision or professional compliance language.

Chat edit loading:

- Show the pending user request.
- Show "Converting request into edit actions".
- Disable duplicate submit for the same message.

Export loading:

- Show selected format and plan version.
- Disable modal close only while the file is actively being generated if necessary.

Mock mode loading:

- Keep loading brief and label mock mode clearly.

## Error States

AI invalid JSON:

- "The AI response did not match the required structure. Try again or use mock mode."

Unsupported request:

- "This MVP supports simple 2D rectangular floor plans only."

Layout failure:

- "The requested rooms could not be placed without overlap. Try fewer rooms or simpler relationships."

Critical validation error:

- "This plan has a critical geometry issue and cannot be exported yet."

Export failure:

- "Export failed. The plan is still available in the editor."

Prompt injection or unsafe request:

- "I cannot change system rules or skip validation. Describe the floor plan you want instead."

## Responsive Behavior

Desktop:

- Full three-panel editor layout.
- Canvas stays central.
- Chat and inspector remain visible.

Tablet:

- Canvas remains primary.
- Inspector and chat become tabs or drawers.
- Topbar actions collapse into grouped controls where needed.

Mobile:

- MVP may be read/edit-light, not full CAD interaction.
- Use stacked views:
  - Plan
  - Chat
  - Rooms
  - Validation
- Export remains available if validation passes.

Canvas:

- Must preserve aspect ratio.
- Must support zoom-to-fit.
- Must not distort plan geometry.
- Text labels should remain readable or simplify at small sizes.

## Accessibility Rules

- All primary actions must be keyboard accessible.
- Focus states must be visible.
- Validation messages must be available as text, not only color or canvas overlays.
- Canvas must have an accessible summary of rooms and dimensions nearby.
- Inputs must have labels.
- Buttons must use clear accessible names.
- Warning and error colors must meet contrast requirements.
- Loading states should announce progress to assistive technologies when practical.
- Do not rely on hover-only disclosure for critical controls.

## Microcopy Guidelines

Voice:

- Clear, calm, technical, and trustworthy.
- Confident about product behavior.
- Careful about architectural/legal limitations.

Use:

- "Generate a floor plan"
- "Edit with chat"
- "Approximate dimensions"
- "Conceptual draft"
- "Validation warning"
- "Export PNG"
- "Export PDF"

Avoid:

- "Construction-ready"
- "Code compliant"
- "Permit ready"
- "Architect approved"
- "Structurally safe"
- "CAD precision"

Error copy rules:

- State what happened.
- Explain whether the user can retry.
- Offer one concrete next action.
- Avoid blaming the user or the model.

Examples:

- "I need one clarification before changing the plan: which bedroom should become larger?"
- "This request asks for BIM-level output, which is outside the MVP. Try a simple 2D room layout instead."
- "The plan was generated with warnings. You can keep editing or export it as a conceptual draft."
