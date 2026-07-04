# Floor Plan Product Knowledge

## Product Summary

AI Floor Plan Generator converts natural language into draft 2D floor plans, supports conversational edits, and exports the final layout to PNG or PDF.

Target outcome:

> "Prompt yaz → 2D kat planı oluşsun → sohbetle düzenlensin → PNG/PDF indirilsin."

## Domain Concepts

- Floor plan: a 2D representation of spaces, walls, openings, labels, and dimensions.
- Room: a named enclosed or semi-enclosed area such as living room, kitchen, bedroom, or bathroom.
- Wall: a boundary line or polygon segment that defines spaces.
- Door: an opening that connects spaces.
- Window: an exterior wall opening.
- Dimension: a measurement annotation shown on the plan.
- Edit operation: a structured change requested through chat.
- Export artifact: a PNG or PDF generated from a plan version.

## Common Prompt Examples

- "Create a 2 bedroom apartment with an open kitchen and one bathroom."
- "Make the living room larger and move the kitchen next to the balcony."
- "Add a window to the bedroom exterior wall."
- "Export this as a PDF with dimensions."

## MVP Capabilities

- Generate simple residential layouts.
- Preserve named rooms and approximate dimensions.
- Apply chat edits as structured operations.
- Show validation warnings when requests are ambiguous or impossible.
- Export readable PNG/PDF files.

## Important Constraints

- The product creates conceptual drafts, not construction-ready drawings.
- Dimensions may be approximate unless a precise unit system is implemented.
- Building code, structural feasibility, and permitting are outside MVP scope.
- AI output must be validated before display, persistence, or export.

## Open Product Questions

- Which units should be default: meters, centimeters, or feet?
- What plan size and room count should MVP support?
- Should generated layouts use a grid?
- Should users be able to manually drag rooms in MVP?
- Should exports include disclaimers or metadata?
- What level of dimension accuracy is expected?
