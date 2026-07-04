# Product Vision

## Product Goal

ArchiFlow is a Turkish-first kentsel dönüşüm proposal platform for architecture offices.

The canonical product journey is:

```text
Mimar hesap oluşturur
  -> boş veya eski projeler panelini görür
  -> yeni ada/parsel projesi oluşturur
  -> 17 adımlı 8.3 mimari teklif akışını tamamlar
  -> teklif paketini üretir
  -> insan onayıyla versiyonu kilitler.
```

## Product Promise

ArchiFlow turns a scattered urban transformation offer process into a calm, ordered, evidence-backed workspace. A mimar should always know which project is open, which source files are available, which workflow step is next, what is blocking the offer, and when the final package is ready to share.

## Primary Users

- Architecture offices preparing kentsel dönüşüm proposals.
- Lead architects responsible for ada/parsel review and offer quality.
- Construction/developer teams comparing feasibility, apartment mix, and share ratios.
- Office coordinators tracking files, decisions, approvals, and locked proposal versions.

## Core User Journey

1. Architect creates an account or logs in.
2. System opens a Turkish dashboard with either an empty state or the project portfolio.
3. Architect creates a new project with client, district, neighborhood, ada, parsel, imar, apartment mix, notes, and files.
4. Project opens in the 17-step workflow workspace.
5. Architect completes the work in order: intake, zoning, file classification, existing-plan analysis, owner/share assumptions, massing, apartment mix, calculations, comparison, report, offer package, and approval.
6. System blocks final offer generation until required prerequisite steps are complete.
7. Architect generates the offer package.
8. Human reviewer locks the version.
9. Locked output remains available from the project archive.

## Product Scope

Included in the current product direction:

- Turkish account, dashboard, portfolio, project wizard, workspace, and modules.
- 17-step 8.3 workflow as a reusable domain model.
- Offer readiness checks and visible preflight blockers.
- Project source files and architectural decision notes.
- Portfolio search and safe deep-link handling.
- Future connection to `kentsel_automation` project, warning, run, sharing, and offer data.

Supporting but not canonical:

- Legacy AI floor-plan prompt generation.
- Legacy chat edits for conceptual 2D plans.
- Legacy PNG/PDF floor-plan export endpoints.

## Non-Goals For The Current Phase

- Pretending prototype localStorage is production persistence.
- Legal, permit, structural, or code-compliance guarantees.
- Unreviewed AI-generated final offers.
- Silent fallback from one project to another.
- Hiding whether a project is demo, archive, draft, or real.
- Full CAD/BIM editing inside the dashboard.

## Product Principles

- The architect must never be unsure which project is open.
- The workflow should guide the user step by step without feeling like a form prison.
- Offer generation must feel earned, traceable, and auditable.
- AI may assist, summarize, classify, and suggest, but final business outputs need explicit human approval.
- Turkish copy, local architectural vocabulary, and office-grade visual design matter.
- Empty states must help the user act; demo data must be clearly labeled.
- Every irreversible or high-value action should have a visible prerequisite and outcome.

## Success Metrics

- Time from account creation to first valid project workspace.
- Percentage of new projects that include ada/parsel before creation.
- Percentage of projects reaching offer preflight without skipped required steps.
- Offer packages generated only after required workflow readiness.
- Locked versions with clear human approval metadata.
- Reduction in wrong-project or wrong-file user errors.
- Architect satisfaction with clarity, trust, and visual quality.
