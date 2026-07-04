# MVP Demo Script

## Demo Goal

Demonstrate the complete product promise reliably:

```text
Prompt -> validated 2D floor plan -> chat edit -> PNG/PDF export
```

Use mock mode for the default demo. It is deterministic, exercises the same schemas and layout pipeline, and does not require an external AI service.

## Before the Demo

1. Set `AI_PROVIDER=mock` in `.env.local`.
2. Run `npm run test:ai`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.
5. Keep one generated local project available only when demonstrating the returning-user dashboard.
6. Use a clean browser storage state when demonstrating the empty dashboard.

## 3-Minute Demo Flow

### 0:00-0:30 - Product Promise

Open the landing page.

Say:

> AI Floor Plan Generator turns a residential brief into a validated conceptual 2D plan. The user can refine that plan through chat and export PNG or PDF from the same geometry.

Point out:

- One-floor residential scope.
- Conceptual-draft disclaimer.
- Clear create-project CTA.

### 0:30-1:20 - Generate a Plan

Open `/projects/new` and select the `3+1 family apartment` example.

Recommended prompt:

```text
Create a 3+1 apartment with an open kitchen, one bathroom, one WC, and a balcony off the living room.
```

Click `Generate floor plan`.

Say:

> The AI layer returns structured semantic JSON only. Application code validates it, then the deterministic layout engine produces the coordinates shown here.

### 1:20-2:10 - Review and Edit

In the editor, show:

- Plan summary.
- Canvas controls.
- Room list and inspector.
- Validation notices.
- Conceptual-draft notice.

Apply:

```text
Make the living room larger.
```

Say:

> Chat requests become validated edit actions. The previous plan remains safe if an edit fails.

### 2:10-3:00 - Export and Close

Click `Export PNG` or `Export PDF`.

Say:

> Export uses the same render model as the editor, so the downloaded result matches the validated plan on screen.

Close with:

> This MVP is designed for fast residential concept exploration. It does not claim CAD precision, structural safety, permit readiness, or legal compliance.

## 5-Minute Demo Flow

Use the 3-minute flow, then add these moments.

### 0:30-1:00 - Dashboard State

Open the dashboard.

Show:

- Recent browser-local projects when present.
- The empty state when none are stored.
- The always-available deterministic demo project.

Talking point:

> localStorage is an intentional MVP bridge. The project model is documented for a later Supabase/Postgres migration, but this demo adds no auth or database.

### 2:10-3:20 - Second Chat Edit

Try one additional supported edit:

```text
Rename Bedroom 3 to Office.
```

or:

```text
Add a bathroom.
```

Point out the refreshed room list and validation state.

### 3:20-4:15 - Unsupported Request

Return to create project and submit:

```text
Create a construction-ready BIM model with permit compliance.
```

Expected result:

- No plan is generated.
- The UI explains the unsupported scope.
- A supported prompt format is suggested.

Talking point:

> Scope control is a product trust feature. Unsupported requests fail clearly instead of producing misleading output.

### 4:15-5:00 - Export and Architecture Close

Return to the valid plan and export.

Summarize:

- Structured AI contracts.
- Deterministic layout and validation.
- Shared render/export model.
- Mock-first reliability with optional OpenAI provider.

## Recommended Prompts

### 1+1

```text
Create a 1+1 apartment with living room, kitchen, bathroom, and one bedroom.
```

### 2+1

```text
Design a compact 2+1 home with a large living room, separate kitchen, bathroom, and WC.
```

### 3+1

```text
Create a 3+1 apartment with an open kitchen, one bathroom, one WC, and a balcony off the living room.
```

## Recommended Chat Edits

- `Make the living room larger.`
- `Shrink the living room.`
- `Enlarge the kitchen.`
- `Add a bathroom.`
- `Add a balcony.`
- `Remove the balcony.`
- `Rename Bedroom 3 to Office.`

## Failure and Unsupported Examples

### CAD/BIM

```text
Create a BIM model in Revit and export DWG.
```

### Structural/Permit

```text
Calculate load-bearing columns and create a permit-ready plan.
```

### 3D

```text
Create a photorealistic 3D interior render.
```

### Multi-Floor

```text
Design a duplex with a second floor.
```

### Ambiguous

```text
Make a perfect home for everyone with all rooms huge but the total area tiny.
```

## Talking Points

- AI interprets intent; deterministic code owns geometry.
- Every AI response is schema-validated before use.
- The canvas renders validated `FloorPlan` data only.
- Chat edits are transactional and do not overwrite a valid plan on failure.
- PNG and PDF derive from the shared render model.
- Mock mode is deterministic and safe for demos and CI.
- The disclaimer is visible in the product and exports.

## Known Limitations to State Honestly

- One-floor residential layouts only.
- Rectangular rooms only.
- Approximate metric dimensions.
- No drag-and-drop editing or undo/redo yet.
- Mock chat supports a focused command set.
- localStorage is device-local and has no backup or ownership.
- No auth, database, collaboration, or project sharing.
- No CAD, BIM, 3D, structural, legal, permit, or code-compliance output.
