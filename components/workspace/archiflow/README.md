# ArchiFlow Workspace Configuration

This folder keeps dashboard configuration separate from the large interactive workspace component.

- `types.ts`: route/view contracts and module definition shapes.
- `visual-assets.ts`: stable dashboard asset registry used by UI surfaces.
- `navigation-flow.ts`: sidebar navigation, badge tones, wizard steps, and intake workflow phases.
- `module-definitions.ts`: module titles, eyebrows, icons, and metric defaults.
- `sample-projects.ts`: demo portfolio data used by the local workspace experience.
- `project-draft.ts`: empty project wizard draft defaults.

Keep user-facing Turkish copy and workflow ordering here when the dashboard flow changes, and keep visual file paths synchronized with `public/visual-assets/archiflow/asset-manifest.json`.
