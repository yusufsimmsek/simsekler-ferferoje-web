# Frontend Standard

## Experience Goals

The frontend should feel like a focused design workspace, not a marketing page. The first product screen should prioritize prompt entry, generated plan viewing, chat-based editing, and export actions.

## UI Principles

- Keep the workspace clear, calm, and practical.
- Make the floor plan the visual center of the experience.
- Use predictable controls for undo, redo, zoom, export, and selection.
- Avoid decorative UI that competes with the plan.
- Keep text concise and task-oriented.

## Rendering Principles

- Render only validated plan state.
- Make labels, dimensions, rooms, doors, windows, and wall thickness visually distinct.
- Support responsive layouts without distorting plan geometry.
- Provide empty, loading, error, and validation-warning states.

## Accessibility

- Ensure keyboard access for primary controls.
- Provide visible focus states.
- Use sufficient contrast for plan lines, labels, and controls.
- Do not rely only on color to communicate validation issues.

## Future Implementation Notes

- Evaluate SVG for precise 2D export-friendly rendering.
- Consider Canvas only if interaction or performance requirements exceed SVG practicality.
- Keep chat/edit controls close to the plan without covering it.
