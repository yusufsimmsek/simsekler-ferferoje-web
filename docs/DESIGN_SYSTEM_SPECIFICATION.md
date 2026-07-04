# Design System Specification

## Purpose

This document defines the visual and component system for the AI Floor Plan Generator MVP. It should guide implementation in Next.js and future translation into Figma.

## Visual Direction

The UI should feel like a premium technical SaaS workspace: precise, calm, modern, and highly usable. The visual design should borrow the confidence of design tools and developer tools without becoming dense CAD software.

Visual qualities:

- Clean workbench layout.
- Crisp 2D plan rendering.
- Muted neutral surfaces.
- High-contrast technical lines.
- Controlled accent colors.
- Minimal decorative imagery.
- Strong spacing discipline.
- Subtle elevation only where it clarifies layering.

## Brand Personality

Brand traits:

- Intelligent.
- Practical.
- Trustworthy.
- Modern.
- Technical.
- Calm under complexity.

The product should feel like a capable AI design assistant, not a novelty generator.

## Color System

Use a neutral-first palette with one primary accent and semantic status colors.

### Core Neutrals

- `neutral-950`: #101114 - primary text, dark surfaces.
- `neutral-900`: #181A1F - sidebar dark mode surface.
- `neutral-800`: #252832 - strong borders in dark mode.
- `neutral-700`: #3A3F4B - secondary dark text.
- `neutral-500`: #6B7280 - muted labels.
- `neutral-300`: #D1D5DB - light borders.
- `neutral-200`: #E5E7EB - dividers.
- `neutral-100`: #F3F4F6 - page background.
- `neutral-050`: #FAFAFB - elevated surfaces.
- `white`: #FFFFFF - primary panels.

### Primary Accent

- `blueprint-700`: #1D4ED8 - primary action.
- `blueprint-600`: #2563EB - hover/action fill.
- `blueprint-500`: #3B82F6 - focus and active state.
- `blueprint-100`: #DBEAFE - soft selected state.

### Technical Accent

- `teal-600`: #0D9488 - successful generation, valid geometry.
- `cyan-500`: #06B6D4 - AI activity, canvas helper lines.

### Semantic Colors

- Success: #16A34A.
- Warning: #D97706.
- Error: #DC2626.
- Info: #2563EB.

### Canvas Colors

- Canvas background: #F8FAFC.
- Room fill: #FFFFFF.
- Room selected fill: #EFF6FF.
- Wall stroke: #111827.
- Interior wall stroke: #374151.
- Dimension line: #64748B.
- Door stroke: #0F766E.
- Window stroke: #2563EB.
- Warning overlay: #F59E0B.
- Critical overlay: #EF4444.

Color rules:

- Do not let the interface become monochrome blue.
- Use accent color for actions and selection, not every surface.
- Keep validation colors consistent across canvas, panels, and export modal.
- Avoid decorative gradients as primary surfaces.

## Typography System

Recommended fonts:

- Interface: Inter, Geist Sans, or system sans-serif.
- Technical labels/numeric measurements: Geist Mono, JetBrains Mono, or system monospace.

Type scale:

- Display: 48px / 56px, landing only.
- H1: 32px / 40px.
- H2: 24px / 32px.
- H3: 20px / 28px.
- Section title: 16px / 24px, semibold.
- Body: 14px / 22px.
- Small: 12px / 18px.
- Micro: 11px / 16px.
- Canvas label: 12-13px, medium.
- Dimension label: 11-12px, mono or tabular numeric.

Rules:

- Do not scale font size with viewport width.
- Use 0 letter spacing unless a component specifically needs uppercase micro-labels.
- Keep dashboard/editor typography compact and work-focused.

## Spacing System

Base unit: 4px.

Recommended tokens:

- `space-1`: 4px.
- `space-2`: 8px.
- `space-3`: 12px.
- `space-4`: 16px.
- `space-5`: 20px.
- `space-6`: 24px.
- `space-8`: 32px.
- `space-10`: 40px.
- `space-12`: 48px.
- `space-16`: 64px.

Rules:

- Use 16px or 24px panel padding in app surfaces.
- Use 8px gaps for compact controls.
- Use 12px gaps for related form fields.
- Use 24px gaps between major page sections.

## Radius System

- Small: 4px for inputs, tags, compact controls.
- Medium: 6px for buttons and panels.
- Large: 8px for cards and modals.
- Full: only for avatars, circular icon buttons, and status dots.

Rules:

- Cards should not exceed 8px radius.
- Avoid pill-heavy UI.
- Keep technical controls crisp.

## Shadow/Elevation System

Use shadows sparingly.

- `elevation-0`: no shadow, border only.
- `elevation-1`: subtle panel shadow for floating controls.
- `elevation-2`: modal/dropdown shadow.
- `elevation-focus`: focus ring, not a decorative glow.

Suggested values:

- Panel: `0 1px 2px rgba(16, 17, 20, 0.06)`.
- Modal: `0 20px 50px rgba(16, 17, 20, 0.18)`.
- Floating toolbar: `0 8px 24px rgba(16, 17, 20, 0.12)`.

## Layout Grid

Desktop editor:

- Topbar height: 56-64px.
- Left panel: 280-320px.
- Right panel: 340-400px.
- Main canvas: flexible.
- Outer page padding: 16px.
- Panel gap: 12px.

Dashboard:

- Content max width: 1180-1280px.
- Project grid: responsive cards with minimum width 260px.
- Header/actions row aligned to grid.

Landing:

- Content max width: 1120-1200px.
- Hero should show the product/workspace preview in the first viewport.
- Keep a hint of the next section visible on common desktop and mobile heights.

## Button Components

Button variants:

- Primary: main action, blue fill.
- Secondary: neutral border.
- Ghost: low-emphasis action.
- Destructive: delete/archive only.
- Icon: canvas and toolbar controls.

Button sizes:

- Small: 32px height.
- Medium: 40px height.
- Large: 48px height.
- Icon small: 32x32px.
- Icon medium: 40x40px.

Rules:

- Primary buttons should be rare and obvious.
- Use icons for toolbar actions such as zoom, fit, undo, redo, export, and validation.
- Provide tooltips for icon-only controls.
- Disabled buttons must explain why when the reason is not obvious.

## Input Components

Input types:

- Text input.
- Textarea.
- Select.
- Segmented control.
- Checkbox.
- Toggle.
- Numeric field.

Prompt textarea:

- Minimum height: 140px on create page.
- Compact height: 80-96px in chat panel.
- Submit action should be visually attached but not cramped.

Rules:

- Inputs must have labels.
- Helper text should be short and useful.
- Error text appears directly under the field.
- Use monospaced numeric styling for dimensions where helpful.

## Card Components

Card uses:

- Project cards.
- Example prompt cards.
- Room summary cards.
- Validation issue rows.

Rules:

- Do not nest cards inside cards.
- Use cards for repeated items, not page sections.
- Cards use border plus subtle background before shadows.
- Maximum radius: 8px.

## Modal Components

Modal uses:

- Export modal.
- Confirmation dialogs.
- Future project delete/archive confirmation.

Modal structure:

- Header.
- Short description.
- Content area.
- Footer actions.

Rules:

- Use modal width 520-720px depending on content.
- Keep critical warnings visible above final action.
- Escape and close controls should work unless export is actively finalizing.

## Sidebar Components

Sidebar uses:

- Room inspector.
- Room list.
- Validation panel.

Rules:

- Sidebars should be dense but readable.
- Use section headers and compact rows.
- Keep selected room state obvious.
- Avoid marketing copy inside work panels.

## Topbar Components

Topbar content:

- Product/project identity.
- Current project title.
- Validation status.
- Undo/redo placeholders.
- Export action.
- Navigation back to dashboard.

Rules:

- Keep topbar stable across editor states.
- Do not overload the topbar with secondary actions.
- Use status chips for validation and mock mode.

## Canvas UI Controls

Canvas toolbar:

- Fit to view.
- Zoom in.
- Zoom out.
- Toggle labels.
- Toggle dimensions.
- Center selected room.

Control style:

- Floating compact toolbar.
- Icon buttons with tooltips.
- Neutral background with border and light shadow.

Canvas overlays:

- Selected room outline.
- Warning marker.
- Critical issue marker.
- Optional grid toggle for future use.

Rules:

- Controls must not cover important plan content when possible.
- Canvas labels must not overlap incoherently at default zoom.
- Use stable dimensions so controls do not shift during loading.

## Toast/Notification System

Toast types:

- Success.
- Info.
- Warning.
- Error.

Use cases:

- Plan generated.
- Edit applied.
- Export started.
- Export ready.
- Validation warning.
- Recoverable failure.

Rules:

- Keep toast text under two lines.
- Do not use toasts for critical blocking errors alone; also show errors in context.
- Auto-dismiss success/info.
- Let warnings and errors remain long enough to read.

## Icon Style

Recommended style:

- Thin/regular stroke line icons.
- Consistent stroke width.
- Rounded stroke caps acceptable.
- Use a standard icon library during implementation, such as lucide-react.

Icon rules:

- Use icons for common technical controls.
- Pair icon and text for primary actions where clarity matters.
- Avoid decorative custom icons in the MVP.

## Animation and Motion Rules

Motion should support orientation, not spectacle.

Allowed:

- 120-180ms hover/focus transitions.
- 180-240ms panel/drawer transitions.
- Subtle loading progress transitions.
- Canvas zoom transitions only if they remain crisp.

Avoid:

- Large decorative motion.
- Bouncy easing in the editor.
- Animations that delay core work.
- Motion that hides validation or error changes.

Reduced motion:

- Respect reduced-motion preferences.
- Replace animated loading with static progress indicators when needed.

## Dark Mode Rules

MVP may ship light mode first, but the design system should support dark mode.

Dark mode goals:

- Technical workspace feel.
- High contrast plan lines.
- Clear validation colors.
- No pure black canvas unless tested for readability.

Rules:

- Maintain semantic color meaning.
- Canvas may remain light in dark mode if readability is better.
- Do not invert exported plan colors by default.
- Export output should remain print-friendly.

## Premium SaaS UI References

Use these as directional quality references, not as sources to copy:

- Linear: dense, calm issue/workspace layouts.
- Vercel: technical clarity and restrained surfaces.
- Figma: canvas-first product ergonomics.
- Stripe: polished forms, docs-like clarity, and status handling.
- Notion: approachable empty states and progressive complexity.
- Framer: modern product-led landing presentation.
- Retool: practical builder/workbench patterns.

Reference translation for this product:

- Linear-like density for dashboard/editor panels.
- Figma-like canvas centrality.
- Stripe-like microcopy precision.
- Vercel-like technical confidence.
- Retool-like practical workspace controls.

## Figma Translation Readiness

Design tokens should map cleanly to Figma variables:

- Color variables.
- Type styles.
- Spacing variables.
- Radius variables.
- Effect styles.
- Component variants for buttons, inputs, modals, sidebars, cards, toasts, and canvas controls.

Component naming should be stable:

- `Button/Primary`
- `Button/Secondary`
- `Input/Text`
- `Input/Textarea`
- `Panel/Sidebar`
- `Modal/Export`
- `Canvas/Toolbar`
- `Toast/Status`
- `Card/Project`
- `Card/Room`
