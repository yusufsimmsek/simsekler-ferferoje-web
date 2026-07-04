# User Flow Specification

## Purpose

This document defines the canonical ArchiFlow user flows for the kentsel dönüşüm proposal platform. The old AI floor-plan generator flows are legacy/supporting flows and must not be treated as the primary product experience.

## First-Time Architect Journey

Goal:

- Help a new architect enter the platform, understand that no project exists yet, and create the first project.

Flow:

1. User opens `/dashboard` or `/`.
2. If unauthenticated in the prototype, user sees the Turkish account screen.
3. User creates an account.
4. System opens the empty dashboard.
5. User clicks `Proje oluştur`.
6. User enters project identity.
7. User enters district, neighborhood, ada, and parsel.
8. User optionally adds source files, apartment mix targets, and notes.
9. User reviews the setup summary.
10. User creates the project.
11. System opens `/projects/[projectId]` in the workflow workspace.

Acceptance criteria:

- New account creation does not load fake projects by default.
- Empty dashboard has a clear primary action.
- Project name, district, neighborhood, ada, and parsel are required before downstream workflow creation.
- The project opens at the first 8.3 workflow step.

## Returning Architect Journey

Goal:

- Let a returning architect safely continue an existing project or create a new one.

Flow:

1. User opens `/dashboard`.
2. User sees project metrics, recent activity, and portfolio entry points.
3. User opens `/projects`.
4. User searches by project name, client, district, neighborhood, ada, or parsel.
5. User opens the intended project.
6. System opens that exact project workspace.

Acceptance criteria:

- Project cards and rows show enough identity to avoid confusion.
- Demo, archive, draft, and real records should be distinguishable.
- A missing project URL must show a not-found state, not another project.

## New Project Wizard Flow

Goal:

- Capture the minimum project facts needed to start a reliable architectural proposal workflow, while producing a kural-tabanlı intake preflight for architect review.

Flow:

1. Step `Proje`: user enters project name, client, responsible architect, and share ratio.
2. Step `Parsel`: user enters district, neighborhood, ada, parsel, area, and imar note.
3. Step `Dosyalar`: user adds e-imar, CAD/DWG/DXF, metraj, PDF, PNG/JPG, or other source files.
4. Step `Karma`: user enters apartment count/share targets and architectural notes.
5. Step `Kontrol`: user reviews the setup summary and creates the project.

Live intake output:

- Project brief derived from architect-entered fields.
- Missing data checklist split into required and recommended items.
- Suggested next steps aligned to parcel, zoning/imar, depth/hmax, old plans/metraj, core/apartment mix, share allocation, and proposal flow.
- Provenance/source rows that distinguish `Mimar girişi`, `Dosya adı ve tipi`, `Bekliyor`, and `Kural tabanlı` values.
- Human approval requirement.
- Architect notes and daire karması preference.
- Next module recommendation.

Acceptance criteria:

- Sidebar step jumping cannot bypass required earlier fields.
- Final creation validates the same required fields as step navigation.
- The review step clearly shows missing optional vs required values.
- Created project receives a stable project code and starts in workflow state.
- Intake preflight must not claim that AI has designed, extracted, approved, or read source content without a real AI/provider or backend extraction run.
- Intake readiness must not change offer readiness; the 17-step workflow remains the source of truth for proposal and lock gates.

## 17-Step Workflow Flow

Goal:

- Guide the architect through the 8.3 proposal preparation sequence.

Flow:

1. Yeni proje açılır.
2. Ada/parsel ve müşteri bilgisi girilir.
3. E-imar, TKGM, CAD, PDF ve metraj dosyaları yüklenir.
4. Dosyalar sınıflandırılır.
5. Mevcut bağımsız bölümler okunur.
6. İmar kuralları ve çekme mesafeleri çıkarılır.
7. Mevcut hak sahipliği ve paylaşım varsayımları girilir.
8. Bina kütlesi alternatifleri üretilir.
9. Daire karması hedefi belirlenir.
10. Kat planı alternatifleri üretilir.
11. Mimar alternatif seçer veya revizyon ister.
12. Alanlar hesaplanır.
13. Kat karşılığı / paylaşım cetveli oluşur.
14. Alternatifler karşılaştırılır.
15. Mevzuat ve kalite kontrol raporu üretilir.
16. Teklif PDF/PNG paketi oluşur.
17. İnsan onayı ile versiyon kilitlenir.

Acceptance criteria:

- Only the current step can be completed as the next workflow action.
- Completed steps update progress, status, and activity.
- Future steps can be inspected but should not imply completion.
- Locked projects cannot keep mutating as ordinary drafts.

## Offer Package Flow

Goal:

- Produce an offer only after architectural prerequisites are complete.

Flow:

1. User opens the `Teklif` tab.
2. System checks offer readiness.
3. If prerequisites are missing, system shows the missing workflow steps.
4. User returns to the workflow and completes required steps.
5. User clicks `Teklif üret`.
6. System marks offer package outputs as ready.
7. User downloads the package.
8. User locks the version after human approval.

Acceptance criteria:

- Offer generation is blocked before the required quality-control stage.
- Download and lock controls stay disabled until the final offer is ready.
- Locking has a defensive guard even if stale UI state exists.
- Final readiness requires both workflow prerequisite completion and offer package generation.

## Missing Project Deep-Link Flow

Goal:

- Prevent wrong-project work when a route contains an unknown project ID.

Flow:

1. User opens `/projects/[projectId]`.
2. System loads the saved portfolio.
3. If the project exists, system opens it.
4. If the project does not exist, system shows `Proje bulunamadı`.
5. User can open the project list or create a new project.

Acceptance criteria:

- The first available project is never opened as a fallback for a missing ID.
- The requested missing project code is visible.
- The recovery actions are clear.

## File Intake Flow

Goal:

- Keep project evidence visible and ready for future automation.

Flow:

1. User opens the `Dosyalar` tab or wizard file step.
2. User selects source files.
3. System records file name, detected type, and current status.
4. Future backend integration stores file content, extraction state, and evidence references.

Acceptance criteria:

- The UI does not claim durable upload until backend storage exists.
- File type detection is predictable.
- Offer and workflow steps can reference available files.

## AI Assistance Flow

Goal:

- Use AI as a review and automation assistant without weakening architectural trust.

Flow:

1. System receives structured project facts, files, warnings, and workflow state.
2. AI may classify, summarize, suggest missing evidence, compare alternatives, or draft explanations.
3. Deterministic domain rules decide whether an output can affect workflow readiness.
4. Human architect reviews high-value outputs before final package lock.

Acceptance criteria:

- AI provider provenance is visible in metadata.
- Production mode should fail closed for missing real provider credentials where appropriate.
- Raw prompts, secrets, or developer diagnostics must not appear in user-facing outputs.

## Error And Validation Flow

Goal:

- Make failures recoverable and trustworthy.

Flow:

1. System detects a missing field, missing project, failed API call, unsupported AI output, or blocked offer prerequisite.
2. Issue is shown near the user action.
3. User receives one clear next action.
4. Critical errors block final output.

Acceptance criteria:

- Error copy is Turkish and specific.
- Wrong-project and skipped-workflow states are impossible by default.
- Public API errors do not expose developer-only diagnostics.

## Flow Acceptance Summary

- Account -> dashboard -> project creation -> workflow -> offer -> lock is the primary product path.
- The 17-step 8.3 workflow is the source of truth for proposal readiness.
- Deep links must preserve project identity.
- Required project facts cannot be skipped.
- AI and legacy floor-plan generation are supporting capabilities, not the product's core promise.
