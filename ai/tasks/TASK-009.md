# TASK-009: Export Pipeline v1

## Status

Completed.

## Objective

Implement PNG and PDF export from the shared render model while keeping exports aligned with the editor SVG rendering.

## Scope

- Export validated `FloorPlan` geometry only.
- Use existing render model primitives.
- Include conceptual draft disclaimer.
- No real AI.
- No database persistence.
- No CAD, BIM, construction-ready, legal, structural, permit, or code-compliance claims.

## Acceptance Criteria

- `POST /api/export/png` validates export request input and current floor plan geometry.
- `POST /api/export/pdf` validates export request input and current floor plan geometry.
- PNG export returns a stable SVG-backed payload for browser-side PNG download.
- PDF export returns deterministic PDF bytes generated from the shared render model.
- Exports include project title, room labels, dimensions when requested, room summary data, validation status, and conceptual draft disclaimer.
- Critical validation errors block export.
- Editor UI exposes separate Export PNG and Export PDF actions with loading and error states.
- Tests cover request validation, invalid plan rejection, disclaimer output, room summary generation, and stable output behavior.
- README documents export usage and current MVP limitations.

## Implementation Summary

- Added deterministic SVG export rendering from the shared floor plan render model.
- Added PNG export service that returns a stable SVG payload for browser-side PNG conversion.
- Added server-side PDF export service that generates deterministic vector/text PDF bytes from the shared render model.
- Added shared export validation, room summary, filename, and error helpers.
- Replaced placeholder export API routes.
- Replaced placeholder editor export UI with separate Export PNG and Export PDF actions.
- Added client-side PNG conversion/download and PDF download helpers.
- Added export pipeline unit tests.
- Updated README export notes.

## Files Created or Changed

- `ai/tasks/TASK-009.md`
- `app/api/export/png/route.ts`
- `app/api/export/pdf/route.ts`
- `components/workspace/ExportControls.tsx`
- `components/workspace/WorkspaceShell.tsx`
- `lib/export/client-export.ts`
- `lib/export/index.ts`
- `lib/export/pdf.ts`
- `lib/export/png.ts`
- `lib/export/service.ts`
- `lib/export/types.ts`
- `lib/render/export-renderer.ts`
- `test/unit/export-pipeline.test.ts`
- `README.md`

## Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- API smoke check: `POST /api/export/png` returns `PNG_EXPORT_READY`.
- API smoke check: `POST /api/export/pdf` returns HTTP `200`, `application/pdf`, and bytes beginning with `%PDF-1.4`.

## Known Limitations

- PNG is converted in the browser from an SVG payload instead of rendered as PNG on the server.
- PDF rendering is MVP vector/text output, not a full print-design engine.
- No export history, persistence, authentication, or cloud artifact storage exists.
- No CAD/BIM precision or construction-ready output is claimed.
- In-app Browser visual verification was blocked by connector setup failure.
