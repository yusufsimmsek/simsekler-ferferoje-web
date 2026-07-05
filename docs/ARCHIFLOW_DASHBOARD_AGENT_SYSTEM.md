# ArchiFlow Dashboard Agent System

Date: 2026-07-05

This document records the permanent dashboard improvement agent system requested for ArchiFlow. It extends the Engineering Operating System with a focused, repeatable dashboard quality loop.

## Agent Chain

1. Dashboard UI/UX Audit And Visual Asset Planner (`.agents/dashboard-ui-ux-audit-visual-asset-planner.md`)
   - Runs at least 30 distinct scenario passes.
   - Audits pages, states, controls, responsive behavior, visual quality, and user confusion.
   - Produces the seven-section Turkish audit output, a minimum 20-item asset list, and a prompt per asset.

2. Visual Asset Generator (`.agents/visual-asset-generator.md`)
   - Uses the approved asset queue from the audit or Visual Needs Detector.
   - Reads `docs/ARCHIFLOW_VISUAL_MASTER_PROMPTS.md` before generation.
   - Generates only needed assets in the locked premium architecture + AI technology style.

3. Dashboard Implementation Agent (`.agents/dashboard-implementation-agent.md`)
   - Acts as the Senior Frontend Integration And Visual Polish Agent.
   - Applies approved UI/UX fixes, responsive improvements, asset integrations, icon consistency, motion refinements, code cleanup, and performance improvements.
   - Treats Chrome `100%` zoom as the primary visual reference and fixes layouts that only looked professional at `67%`.
   - Verifies every changed page and runs the relevant release checks.

4. Continuous Improvement Orchestrator (`.agents/continuous-improvement-orchestrator.md`)
   - Manages at least 10 full iterations when continuous improvement is requested.
   - Scores each iteration and decides the next highest-value improvement.
   - Does not write code or generate visuals directly.

## Iteration Contract

Every iteration must run in this order:

1. Ajan 1 re-audits the whole dashboard from scratch.
2. Ajan 2 generates or regenerates only necessary visual assets.
3. Ajan 3 implements the prioritized improvements.
4. Relevant agents re-review the changed surfaces.
5. The Continuous Improvement Orchestrator scores the iteration and updates the next queue.

No iteration may reuse a previous report as evidence. Previous reports may be used only to avoid duplicate recommendations and to check whether prior issues were resolved.

## Ajan 3 Implementation Order

Dashboard Implementation Agent must work in this order:

1. Fix Critical and High UI/UX issues from Ajan 1.
2. Fix broken buttons, links, navigation, modal actions, and form actions.
3. Fix responsive issues.
4. Use Chrome `100%` zoom as the main reference.
5. Rework layout rules so surfaces that looked good at `67%` also look professional at `100%`.
6. Fix oversized spacing, overflowing cards, cramped grids, and poor alignment.
7. Apply Ajan 2 visuals to the correct pages and cards.
8. Use WebP, PNG, and SVG according to the correct asset role.
9. Establish a consistent dashboard icon system.
10. Tune image size, position, object-fit, opacity, glow, and shadow.
11. Polish hover, transition, loading, and empty-state details.
12. Retest the whole system.

Unused old visual references should be cleaned from code and manifests. Existing archived asset files should not be deleted unless the routed task explicitly approves deletion.

## Required Scorecard

Each iteration scores these items from `0` to `10`:

- UI Kalitesi
- UX Kalitesi
- Responsive
- Premium Gorunum
- Gorsel Tutarlilik
- Icon Tutarliligi
- Spacing
- Typography
- Animation
- Loading Experience
- Empty States
- Accessibility
- Performance
- Architecture Feeling
- Modern Product Feeling
- Code Quality
- Kullanici Deneyimi

Target threshold before completion:

- UI Kalitesi >= 9.8
- UX Kalitesi >= 9.8
- Responsive >= 9.8
- Premium Gorunum >= 9.8
- Gorsel Tutarlilik >= 9.8
- Code Quality >= 9.8
- Kullanici Deneyimi >= 9.8

## Dashboard Audit Output

Ajan 1 must use this section order:

1. BOLUM 1 - Genel Sistem Ozeti
2. BOLUM 2 - Sayfa Sayfa UI/UX Hata Listesi
3. BOLUM 3 - Calismayan / Eksik Fonksiyonlar
4. BOLUM 4 - Gorsel Kalite Sorunlari
5. BOLUM 5 - En Az 20 Gorsel / Icon Ihtiyac Listesi
6. BOLUM 6 - Her Gorsel Icin Ayri Prompt
7. BOLUM 7 - Uygulama Oncelik Plani

## Visual Style Lock For This Loop

Visual assets generated for this dashboard loop must feel like a premium AI-powered architecture technology platform:

- dark graphite, charcoal, black, and deep navy base;
- subtle bronze, amber, electric blue, cyan, and restrained warm architectural light accents;
- glassmorphism, soft shadows, 3D depth, steel/concrete/glass materiality;
- minimal but impressive compositions that work inside dashboard cards;
- no text unless specifically approved;
- no watermark, logo, random letters, or fake UI labels;
- no human faces unless an approved avatar asset explicitly requires one;
- 4K-quality source where possible, optimized for web delivery;
- transparent PNG when the target component needs object/icon cutouts;
- WebP for large dashboard visuals.

This loop must still honor `docs/ARCHIFLOW_VISUAL_MASTER_PROMPTS.md` and `docs/ARCHIFLOW_VISUAL_ASSET_GENERATION_BRIEF.md`. If style instructions conflict, Knowledge Guardian and Visual Asset Director must decide whether to update the canonical prompt documents before generation.

## Next-Iteration Questions

Before moving to another iteration, the Continuous Improvement Orchestrator must answer:

- En buyuk kalan problem nedir?
- En amator gorunen alan neresi?
- En cok gelistirilmesi gereken sayfa hangisi?
- En cok gelistirilmesi gereken component hangisi?
- Yeni hangi asset gerekli?
- Yeni hangi animasyon gerekli?
- Yeni hangi UX gelistirmesi yapilabilir?

## Stop Rule

The loop may not stop before 10 complete iterations when the user explicitly requests the continuous-improvement program. After 10 iterations, it continues while material improvement remains and required thresholds are below `9.8/10`.

If execution limits require pausing, the final report must include:

- completed iteration count;
- current scorecard;
- unresolved highest-priority issues;
- next exact iteration step;
- required agents;
- verification still needed.
