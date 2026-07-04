# Premium Design And Motion Standard

ArchiFlow must feel like a premium architectural product, not a generic SaaS dashboard.

## Product Feeling

Every screen should communicate:

- quality;
- confidence;
- intelligence;
- craftsmanship;
- architectural specificity.

The benchmark is Apple, Linear, Figma, Notion, Raycast, Arc Browser, Stripe Dashboard, Framer, Vercel, and Cursor. The interface should not look copied from those products, but it should meet a comparable level of taste and care.

## Visual Language

Use a calm, modern architectural aesthetic:

- minimal;
- elegant;
- professional;
- sophisticated;
- confident;
- timeless.

Use architectural signals such as technical grids, drawing surfaces, glass materials, soft depth, blueprint-like structure, paper texture, minimal geometry, clean shadows, and premium lighting.

Avoid:

- generic SaaS cards;
- visual noise;
- excessive borders;
- clutter;
- unnecessary copy;
- oversized controls;
- inconsistent spacing;
- decoration that does not support workflow.

## Motion Principles

Motion must improve usability. It should guide attention, communicate hierarchy, reduce cognitive load, and make state changes feel intentional.

Prefer:

- subtle opacity transitions;
- restrained scale and elevation changes;
- smooth layout transitions;
- animated empty/success/progress states;
- AI-thinking and file-processing feedback;
- natural easing.

Avoid:

- abrupt appearance;
- flashy movement;
- motion without purpose;
- jarring acceleration;
- distracting loops.

Respect `prefers-reduced-motion`.

## Component Review Standard

Replace or redesign any component that feels:

- generic;
- cheap;
- outdated;
- visually heavy;
- hard to understand;
- static or lifeless;
- unrelated to architectural work.

For every screen, ask whether it would impress an architect seeing ArchiFlow for the first time. If the answer is not clearly yes, keep refining.

## Current Implementation Notes

The Snow workspace uses:

- `snow-app` for the premium dark architectural surface;
- `snow-app-shell` for glass/paper shell depth;
- `snow-card` for refined panel surfaces;
- `snow-button` and `snow-focus-ring` for responsive controls;
- `snow-workflow-step` for guided workflow interaction;
- `snow-progress-fill` for smooth progress changes;
- `snow-animated-grid` for subtle architectural drawing motion.
