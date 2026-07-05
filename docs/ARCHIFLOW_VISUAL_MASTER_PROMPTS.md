# ArchiFlow Visual Master Prompts

This document is the style-locked generation contract for ArchiFlow visuals. Use it before producing any new image asset. The canonical numbered asset brief remains `docs/ARCHIFLOW_VISUAL_ASSET_GENERATION_BRIEF.md`; this file adds the mandatory style lock, generation order, quality gate, and v2 prompt matrix.

## Agent Sequence

1. Visual Needs Detector inspects the manifest, filesystem, dashboard code, and visual audit.
2. Style-Locked Visual Generator creates only the approved queued assets in this style.
3. Dashboard Visual Integrator applies only QA-approved assets to manifest/code/CSS.

No generation should start until step 1 has produced the current queue.

## Current Detection Result

- Required production asset library: 45 assets.
- Physical required file gaps: 0.
- Active current-style generated assets: 01 and 02.
- Assets that need locked-style v2 regeneration before full visual-system completion: 03 through 45.
- Existing v1 assets must be preserved. New files must use non-destructive version names.

## Master Style Lock

Use this exact style direction as the first part of every generation prompt:

```txt
Create a premium ArchiFlow visual for an AI-powered architectural operating system for Turkish urban transformation workflows. The image must feel like Apple, Linear, Figma, and Autodesk level product polish: calm, elegant, technical, high-end architectural visualization, realistic glass/concrete/steel materials, subtle blueprint overlays, transparent analysis layers, refined shadows, precise geometry, and clean negative space for UI. Use dark graphite, charcoal, black, deep navy, architectural white, soft blue-gray, subtle bronze/amber warmth, restrained electric blue or glass cyan data light, and warm architectural light; use restrained violet only where existing product continuity requires it. Make it cinematic but clean, premium product UI asset quality, semi-isometric only where useful, realistic materials, transparent glass overlays, and technical drawing layers. No generic SaaS illustration.
```

## Universal Negative Prompt

Append this exact negative prompt to every generation request:

```txt
Negative prompt: cheap dashboard illustration, cartoon, flat vector, childish icon, generic stock image, generic SaaS art, messy composition, unreadable text, fake UI text, low quality, distorted building, distorted floor plan, over-saturated neon, cyberpunk city, people in foreground, watermark, logo, random letters, random numbers, blurry, noisy, cluttered, amateur render, placeholder graphic, simple SVG style, cheap 3D icon look.
```

## Output Contract

- Use `.webp` for large UI visuals.
- Use `.png` only for transparent icons, avatar cutouts, or object-like assets.
- Do not overwrite existing files.
- For regenerated assets use `archiflow-[number]-[usage-area]-[short-description]-v2.[ext]`.
- Save inside `public/visual-assets/archiflow/[category]/`.
- Record actual dimensions, source prompt, generation date, and QA result in the audit or manifest before integration.

## 10-Point Visual QA Gate

Every generated image must be checked against these ten questions before integration:

1. Does it clearly belong to ArchiFlow's architectural product universe?
2. Does it avoid generic SaaS, cartoon, flat vector, and stock-dashboard language?
3. Does it avoid visible text, random letters, random numbers, logos, and watermarks?
4. Are buildings, plans, documents, parcels, and diagrams geometrically credible?
5. Does the palette stay restrained with graphite, charcoal, deep navy, white, blue-gray, bronze/amber warmth, electric blue/cyan data light, and warm architectural light?
6. Does the composition leave enough negative space for the target UI?
7. Does it fit the target aspect ratio without awkward crop risk?
8. Does it support the exact product workflow meaning?
9. Does it look premium at dashboard/card size and not only full size?
10. Would Visual Asset Director and Design Critic approve it for a professional architecture office tool?

## Priority Generation Queue

Batch A, dashboard above the fold:

- 03 to 08 process cards
- 09 workflow guide background
- 16 no-projects dashboard empty state
- 35 quantity/metraj mini icon used by dashboard metric surfaces
- 37 to 39 dashboard background and overlay textures

Batch B, workspace module surfaces:

- 10 to 14 project portfolio and project-card visuals
- 24 parcel map
- 25 to 31 module hero/work-surface visuals

Batch C, trust, AI, and document states:

- 15 AI assistant panel
- 21 to 23 document previews
- 42 to 45 AI provenance, approval, missing data, processing

Batch D, portfolio, empty states, icons, and avatars:

- 17 to 20 remaining empty states
- 32 to 34 and 36 remaining mini icons
- 40 to 41 avatar/account visuals

## Category Master Prompts

Use the relevant category prompt after the Master Style Lock and before the asset-specific intent.

### Dashboard Hero And Backgrounds

```txt
Composition must support dashboard UI overlays. Leave calm negative space, keep the main architectural subject balanced, avoid busy foregrounds, and use subtle transparent technical layers rather than decorative noise.
```

### Process Cards

```txt
Create a dark premium process-card visual with a strong single subject, high readability at card size, deep navy background, glass technical overlays, precise geometry, subtle violet/cyan focus light, and no text. The image must explain one workflow step in one glance.
```

### Workflow Guide

```txt
Create a horizontal workflow background that sits behind UI content. It must be elegant and quiet, with connected architectural milestones, faint blueprint grid, and enough soft negative space that labels and controls can be placed over it.
```

### Project Portfolio

```txt
Create realistic but product-ready architectural thumbnails for residential urban transformation projects. They should feel like project cards inside a premium architecture office workspace, not real estate advertising or stock imagery.
```

### AI And Trust States

```txt
Create AI visuals that communicate assistance, traceability, source review, and human approval. Avoid magic, overclaiming, humanoid robots, or autonomous decision symbolism. Use transparent data layers and architectural documents as the subject.
```

### Empty States

```txt
Create calm empty-state visuals that feel intentional, professional, and ready for the architect's next action. They should not look empty, broken, cute, or decorative; use quiet architectural objects and clear negative space.
```

### Documents

```txt
Create premium document preview visuals with realistic architectural sheets, CAD/PDF/report materiality, no readable text, and polished UI-ready framing.
```

### Maps And Modules

```txt
Create professional architectural analysis surfaces with parcel maps, zoning envelopes, massing, floorplates, quantity overlays, apartment allocation, and proposal presentation material. Each image must look like a serious architecture workflow surface.
```

### Icons And Avatars

```txt
Create small premium product objects with glass material, navy/white base, restrained violet/cyan accents, and clean silhouette readability. Avoid cheap 3D icon sets and avoid logos.
```

## V2 Asset Prompt Matrix

The Style-Locked Visual Generator must combine: Master Style Lock + Category Master Prompt + the asset-specific intent below + Universal Negative Prompt.

| No | Target file | Category | Asset-specific intent |
| --- | --- | --- | --- |
| 03 | `process-cards/archiflow-03-process-parcel-zoning-v2.webp` | Process Cards | Isometric GIS parcel grid with one parcel highlighted in violet, cadastral divisions, street outlines, zoning boundaries, transparent regulation overlays, no text. |
| 04 | `process-cards/archiflow-04-process-depth-hmax-v2.webp` | Process Cards | Translucent 3D building mass on parcel base with setback planes, height limit lines, Hmax guides, glass violet volume, cyan construction lines, no text. |
| 05 | `process-cards/archiflow-05-process-existing-plans-quantity-v2.webp` | Process Cards | Scanned architectural floor plan becoming luminous CAD analysis surface with wall lines, measurement traces, quantity highlights, dark drafting table, no text. |
| 06 | `process-cards/archiflow-06-process-core-apartment-mix-v2.webp` | Process Cards | Transparent residential floorplate cutaway showing elevator core, stair core, corridors, apartments, warm unit lighting, refined dark background, no text. |
| 07 | `process-cards/archiflow-07-process-share-allocation-v2.webp` | Process Cards | Ownership allocation diagram combined with transparent apartment blocks, segmented rings, glass panels, apartment fragments, architectural grid, no text. |
| 08 | `process-cards/archiflow-08-process-proposal-report-v2.webp` | Process Cards | Elegant architectural proposal documents, report booklet pages, folded drawings, subtle building render on paper, glass reflections, no readable text. |
| 09 | `workflow/archiflow-09-workflow-guide-background-v2.webp` | Workflow Guide | Six connected architectural workflow milestones from parcel intake to proposal generation, pale blueprint grid, translucent circular nodes, no text or numbers. |
| 10 | `projects/archiflow-10-project-portfolio-gallery-v2.webp` | Project Portfolio | Multiple residential project thumbnails arranged as refined architectural cards on a clean studio surface with one emphasized main project render. |
| 11 | `projects/archiflow-11-project-active-thumbnail-v2.webp` | Project Portfolio | Modern mid-rise residential urban transformation project in Ankara, elegant facade, balconies, realistic materials, professional daylight render, no logo. |
| 12 | `projects/archiflow-12-project-design-stage-thumbnail-v2.webp` | Project Portfolio | Residential building in design phase, realistic mass mixed with transparent wireframe extensions and blueprint overlays. |
| 13 | `projects/archiflow-13-project-proposal-stage-thumbnail-v2.webp` | Project Portfolio | Residential building beside subtle proposal and document visualization layers suggesting offer preparation, premium and calm. |
| 14 | `projects/archiflow-14-project-archive-thumbnail-v2.webp` | Project Portfolio | Desaturated completed residential project with soft archive haze, faint blueprint lines, professional but inactive mood. |
| 15 | `ai/archiflow-15-ai-assistant-panel-v2.webp` | AI And Trust States | Translucent AI analysis core above architectural drawings, parcel grids, and document fragments, communicating assistance and document reading without overclaiming. |
| 16 | `empty-states/archiflow-16-empty-no-projects-v2.webp` | Empty States | Clean architectural desk with blank parcel model, subtle blueprint grid, one highlighted start point, optimistic first-project mood, no text. |
| 17 | `empty-states/archiflow-17-empty-no-analysis-v2.webp` | Empty States | Parcel outline waiting for zoning data with inactive imar, Hmax, and setback layers, soft gray-blue background, no text. |
| 18 | `empty-states/archiflow-18-empty-no-files-v2.webp` | Empty States | Glass tray with faint CAD, PDF, and spreadsheet document outlines waiting on an architectural drawing background, no text. |
| 19 | `empty-states/archiflow-19-empty-no-tasks-v2.webp` | Empty States | Completed process line on clean blueprint surface with small glass check indicators and soft light, no text. |
| 20 | `empty-states/archiflow-20-empty-no-reports-v2.webp` | Empty States | Blank architectural report booklet, folded plans, faint building outline, soft white/navy shadows and violet accent, no readable text. |
| 21 | `documents/archiflow-21-document-pdf-report-preview-v2.webp` | Documents | Professional architectural report booklet cover with abstract building render, blueprint texture, elegant document layering, no readable text. |
| 22 | `documents/archiflow-22-document-architectural-plan-preview-v2.webp` | Documents | Refined scanned floor plan on textured paper with AI highlight zones and blue measurement marks, no readable text. |
| 23 | `documents/archiflow-23-document-cad-dwg-preview-v2.webp` | Documents | Dark CAD/DWG preview with crisp white/cyan linework, wall layers, grids, technical annotations without readable text. |
| 24 | `maps/archiflow-24-map-parcel-visualization-v2.webp` | Maps And Modules | Ankara-inspired urban block map with parcel polygons, one violet-selected parcel, transparent zoning overlays, street grid, subtle 3D terrain, no street names. |
| 25 | `modules/archiflow-25-module-zoning-analysis-v2.webp` | Maps And Modules | Selected parcel with transparent zoning envelope, setback boundaries, visual TAKS/KAKS-like massing zones, floating regulation layers, no text. |
| 26 | `modules/archiflow-26-module-hmax-massing-v2.webp` | Maps And Modules | Building massing for height and setback analysis with horizontal planes, Hmax boundary, front/side/rear setback zones, measurement lines, no text. |
| 27 | `modules/archiflow-27-module-quantity-heatmap-v2.webp` | Maps And Modules | Floor plan or floorplate with translucent area heatmap zones for net area, common area, circulation, shafts, and parking, no text. |
| 28 | `modules/archiflow-28-module-core-library-v2.webp` | Maps And Modules | Several 3D elevator and stair core modules on clean studio grid, semi-transparent cores, visible stairs, shafts, and circulation zones, no text. |
| 29 | `modules/archiflow-29-module-apartment-mix-v2.webp` | Maps And Modules | Transparent residential section with different apartment types subtly color-coded across floors, floorplate diagrams, stacked units, no text. |
| 30 | `modules/archiflow-30-module-ownership-allocation-v2.webp` | Maps And Modules | Refined glass apartment units assigned between landowner and contractor groups with connection lines and circular allocation diagrams, no text. |
| 31 | `modules/archiflow-31-module-proposal-presentation-v2.webp` | Maps And Modules | Architectural report booklet, PDF panels, project render, floor plan sheet, and offer package on clean glass desk, no readable text. |
| 32 | `icons/archiflow-32-icon-project-v2.png` | Icons And Avatars | Small glass document/building hybrid object representing an architectural project, deep navy base, soft violet glow, transparent background if possible. |
| 33 | `icons/archiflow-33-icon-parcel-v2.png` | Icons And Avatars | Small glass highlighted land plot on cadastral grid, violet accent, clean silhouette, transparent background if possible. |
| 34 | `icons/archiflow-34-icon-zoning-v2.png` | Icons And Avatars | Small glass parcel with regulation envelope and measurement planes, violet/cyan accent, transparent background if possible. |
| 35 | `icons/archiflow-35-icon-quantity-v2.png` | Icons And Avatars | Small floor plan fragment with highlighted area zones and subtle measuring ruler form, glassy violet/blue accents, transparent background if possible. |
| 36 | `icons/archiflow-36-icon-report-v2.png` | Icons And Avatars | Small elegant report booklet with blueprint sheet and soft violet light, transparent glass reflections, transparent background if possible. |
| 37 | `backgrounds/archiflow-37-background-light-blueprint-v2.webp` | Dashboard Hero And Backgrounds | Barely visible off-white blueprint texture with faint blue-gray grid lines, delicate construction marks, soft vignette, lots of negative space, no text. |
| 38 | `backgrounds/archiflow-38-background-dark-technical-grid-v2.webp` | Dashboard Hero And Backgrounds | Deep navy/charcoal technical grid with faint blueprint lines, soft violet radial glow, delicate measurement traces, calm negative space, no text. |
| 39 | `backgrounds/archiflow-39-background-glass-reflection-v2.webp` | Dashboard Hero And Backgrounds | Subtle transparent glass reflection overlay texture with soft white reflections, faint violet/cyan refractions, clean studio light, no objects or text. |
| 40 | `avatars/archiflow-40-avatar-architect-v2.png` | Icons And Avatars | Professional Turkish architect profile portrait, modern office lighting, neutral background, realistic polished avatar style, confident and approachable, no logo. |
| 41 | `avatars/archiflow-41-avatar-office-v2.png` | Icons And Avatars | Refined minimal architecture office account symbol made of glass and soft navy lines with subtle violet glow, no text or logo. |
| 42 | `ai/archiflow-42-ai-provenance-source-tracking-v2.webp` | AI And Trust States | Documents, parcel data, zoning files, and calculations connected by luminous source lines into a transparent AI analysis core, traceability emphasis, no text. |
| 43 | `ai/archiflow-43-ai-human-approval-v2.webp` | AI And Trust States | Architectural plan and proposal package paused at clean approval checkpoint with subtle glass check gate and architect desk environment, no text. |
| 44 | `ai/archiflow-44-ai-missing-data-checklist-v2.webp` | AI And Trust States | Semi-transparent document cards, parcel outline, old plan placeholder, zoning document placeholder, and metraj sheet arranged as needed data, no text. |
| 45 | `ai/archiflow-45-ai-processing-architectural-data-v2.webp` | AI And Trust States | Transparent building model forming from parcel lines, plan fragments, and data points with soft violet/cyan light, intelligent but not magical, no text. |

## First Integration Target

After Batch A generation and QA, the Dashboard Visual Integrator should update:

- `public/visual-assets/archiflow/asset-manifest.json`
- `components/workspace/SnowArchitectPlatform.tsx`
- `app/globals.css`

The first UI surfaces to verify are the dashboard hero, six process cards, workflow guide surface, empty dashboard state, quantity metric icon usage, and dark/light technical background overlays.

## Post-Generation Dashboard Application Gate

When any visual generation batch is completed, the work is not complete until the approved generated assets are applied to the dashboard. The Dashboard Visual Integrator must:

- replace active references with approved `v2` paths in the manifest, TypeScript asset map, and CSS URL references;
- adjust crop, object-position, panel contrast, spacing, image sizes, and responsive constraints if the new artwork needs layout support;
- preserve existing assets for rollback and never overwrite v1 files;
- verify desktop `1440x900`, tablet `1024x768`, and mobile `390x844` visual behavior;
- confirm no horizontal overflow, no text overlap, no console errors, stable image loading, accessible decorative image handling, and reduced-motion compatibility;
- run the available verification suite after code/CSS changes.
