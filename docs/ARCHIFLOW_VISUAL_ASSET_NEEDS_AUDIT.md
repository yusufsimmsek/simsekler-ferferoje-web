# ArchiFlow Visual Asset Needs Audit

Date: 2026-07-05

## Scope

This audit records the complete visual asset need set for the ArchiFlow dashboard and workspace visual system. The canonical prompt source is `docs/ARCHIFLOW_VISUAL_ASSET_GENERATION_BRIEF.md`.

The style-locked master prompt source for future regeneration passes is `docs/ARCHIFLOW_VISUAL_MASTER_PROMPTS.md`.

## Permanent Visual Agent Chain

Future visual work must use this sequence:

1. Visual Needs Detector: inspect manifest, filesystem, code references, and docs; output the missing/weak visual queue.
2. Style-Locked Visual Generator: generate only approved queued assets using `docs/ARCHIFLOW_VISUAL_MASTER_PROMPTS.md`.
3. Dashboard Visual Integrator: apply only QA-approved assets to manifest, dashboard code, and CSS.

No image generation should start until the detector has produced the current queue and target filenames.

## Required Asset Library

ArchiFlow currently requires 45 production visual assets:

- 2 dashboard hero visuals
- 6 process-card visuals
- 1 workflow guide background
- 5 project portfolio/card visuals
- 5 AI workflow visuals
- 5 empty-state visuals
- 3 document preview visuals
- 1 parcel map visualization
- 7 module hero/work-surface visuals
- 5 mini icons
- 3 background/overlay textures
- 2 avatar/account visuals

The full numbered asset map is tracked in `public/visual-assets/archiflow/asset-manifest.json`.

## Current Status

- Existing v1 library: present in `public/visual-assets/archiflow/**`.
- Physical required asset gaps: 0.
- New generated assets from the user-provided brief:
  - `public/visual-assets/archiflow/dashboard/archiflow-01-dashboard-hero-building-v2.webp`
  - `public/visual-assets/archiflow/dashboard/archiflow-02-dashboard-hero-dark-v2.webp`
- New generated assets from dashboard continuous-improvement iteration 04:
  - `public/visual-assets/archiflow/documents/archiflow-21-document-pdf-report-preview-v2.webp`
  - `public/visual-assets/archiflow/documents/archiflow-22-document-architectural-plan-preview-v2.webp`
  - `public/visual-assets/archiflow/documents/archiflow-23-document-cad-dwg-preview-v2.webp`
  - `public/visual-assets/archiflow/modules/archiflow-31-module-proposal-presentation-v2.webp`
- Active dashboard mapping now points to the v2 dashboard hero, document preview, and proposal presentation assets.
- Existing v1 files were preserved and not overwritten.
- Assets still needing locked-style v2 regeneration: 39 assets, numbers 03 through 20, 24 through 30, and 32 through 45.

## Generation Notes

- Generation mode: built-in `image_gen`.
- Output persistence: generated PNGs were converted to WebP and copied into the project asset library.
- Actual generated size for both v2 dashboard hero assets: `1672x941`.
- Actual generated size for v2 document preview assets 21 through 23: `1086x1448`.
- Actual generated size for v2 proposal presentation asset 31: `1672x941`.
- Prompt source: user-provided ArchiFlow visual asset generation brief, aligned with the canonical repo brief.

## Remaining Visual Opportunity

The complete 45-asset library already exists as v1. To complete the new premium locked style across the full dashboard/workspace system, regenerate the remaining assets as non-destructive `v2` files, then update `asset-manifest.json` and consuming code only after visual QA.

## Current V2 Regeneration Queue

Priority A:

- 03 to 08 process-card visuals
- 09 workflow guide background
- 16 no-projects dashboard empty state
- 35 quantity/metraj mini icon used on dashboard metric surfaces
- 37 to 39 background/overlay textures

Priority B:

- 10 to 14 project portfolio visuals
- 24 parcel map visualization
- 25 to 30 module hero/work-surface visuals

Priority C:

- 15 AI assistant panel
- 42 to 45 AI trust/provenance/approval/loading visuals

Priority D:

- 17 to 20 remaining empty states
- 32 to 34 and 36 remaining mini icons
- 40 to 41 avatar/account visuals

The exact target filenames and prompt matrix are defined in `docs/ARCHIFLOW_VISUAL_MASTER_PROMPTS.md`.

## Integration Findings

- Runtime dashboard code keeps the active `archiflowVisualAssets` map in `components/workspace/archiflow/visual-assets.ts`; it does not import `asset-manifest.json`.
- Several CSS surfaces hardcode visual URLs in `app/globals.css`.
- Future integration passes must keep the manifest, inline TypeScript map, CSS URLs, and actual files synchronized.
- Old flat compatibility assets in `public/visual-assets/archiflow/` are preserved for traceability and should not be used as the new-style source of truth.
- After any approved generation batch, dashboard application is mandatory: approved assets must be mapped into the dashboard, supporting visual layout adjustments must be made, and desktop/tablet/mobile visual QA must pass before the batch is considered complete.
