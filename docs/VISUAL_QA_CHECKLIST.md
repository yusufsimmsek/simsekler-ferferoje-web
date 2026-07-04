# Visual QA Checklist

Run this checklist at desktop `1440x900`, tablet `1024x768`, and mobile `390x844` where practical.

## Landing Page

- Product name is the primary heading.
- Product promise is understandable without scrolling.
- Primary CTA routes to `/projects/new`.
- Secondary CTA routes to `/dashboard`.
- Supported one-floor residential scope is visible.
- Conceptual-draft limitation is visible.
- Workspace preview is readable and not cropped.
- No text overlaps room preview labels.
- Header actions fit on mobile.

## Dashboard

- Header and create-project CTA are visible.
- Empty local-project state has a clear next action.
- Recent local projects appear when valid localStorage data exists.
- Invalid local projects do not render as cards.
- Demo project remains available.
- Project thumbnails preserve floor plan proportions.
- Cards fit at desktop, tablet, and mobile widths.

## Create Project

- Prompt is the dominant input area.
- Project name remains clearly optional.
- Supported and unsupported scope lists are readable.
- Example prompts fit without clipped text.
- Empty prompt error appears beside the prompt field.
- Generation state is announced and visually distinct.
- Unsupported/clarification errors explain the next action.
- Submit button cannot be double-triggered while loading.
- Conceptual-draft notice remains visible.

## Editor

- Project title, provider mode, and export actions fit in the topbar.
- Conceptual-draft notice remains visible below the topbar.
- Canvas is the dominant surface.
- Floor plan fits within the SVG viewport.
- Room labels and dimensions remain readable.
- Zoom, fit, label, and dimension controls do not cover important geometry.
- Left chat panel and right inspector do not overlap the canvas.
- Tablet layout places the inspector below the primary workspace cleanly.
- Mobile layout stacks panels without horizontal overflow.

## Room List and Inspector

- Room names, types, dimensions, and area remain aligned.
- Long room names truncate rather than overflow.
- Selected room styling is visible without relying only on color.
- Inspector values match the selected room.
- Room rows remain readable at narrow widths.

## Chat Edit

- Quick actions fit in two columns without clipped text.
- Chat textarea and submit button remain reachable.
- Loading state disables duplicate submission.
- Successful assistant summary appears in history.
- Failed edits show a persistent contextual error.
- Unsupported edits leave the displayed plan unchanged.

## Warnings and Errors

- Validation status is visible near its details.
- Critical issues use error styling and block affected actions.
- Warnings use warning styling and remain readable.
- Multiple warnings render without hiding validation issues.
- Corrupted localStorage shows the demo fallback state.
- Missing local project shows a clear fallback reason.
- Error messages do not expose raw provider responses, secrets, or developer diagnostics.

## Export

- PNG and PDF actions are visible when the plan is valid.
- Loading and failure states do not alter the current plan.
- Exported content includes the conceptual-draft disclaimer.
- Export output visually matches the editor render model.
