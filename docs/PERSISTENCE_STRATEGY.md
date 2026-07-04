# Persistence Strategy

## 2026-07-03 ArchiFlow Update

This document is retained for the legacy AI floor-plan subsystem. The canonical ArchiFlow product is now the kentsel dönüşüm proposal platform.

Current ArchiFlow Snow dashboard persistence decisions:

- Platform state is versioned and normalized in `lib/domain/archiflow-platform-state.ts`.
- Project/file/activity contracts, project creation, file type detection, workflow mutations, and persisted project normalization live in `lib/domain/kentsel-project.ts`.
- Browser persistence goes through `lib/platform/archiflow-local-storage-repository.ts`; UI components should not directly own ArchiFlow storage behavior.
- The optional kentsel backend read bridge lives in `lib/platform/kentsel-automation-api-repository.ts` and is enabled only with `NEXT_PUBLIC_KENTSEL_AUTOMATION_API_BASE_URL`.
- The bridge reads backend project cards and active-project automation readiness as sidecar UI state. It intentionally does not persist backend cards or readiness snapshots into `KentselProject` localStorage state.
- Backend readiness is fail-closed: missing parcel scope or unreadable detail/review/warning endpoints must be treated as review-required, never clean.
- The next persistence milestone is adding authenticated, owner-scoped, auditable, rate-limited write paths before enabling review decisions, warning updates, input project creation, engine runs, or backend offer state changes in Snow.

## Purpose

This document defines the MVP persistence bridge for AI Floor Plan Generator. The current product demo uses browser `localStorage`; the architecture should remain easy to migrate to a real database later without changing floor plan contracts.

## Current MVP Behavior

Generated projects are stored in browser `localStorage` under:

```text
ai-floor-plan-generator.generated-projects.v1
```

The stored object uses:

```json
{
  "version": 1,
  "projects": {
    "project_fixture_3plus1": {
      "projectId": "project_fixture_3plus1",
      "projectName": "Demo concept",
      "plan": {},
      "prompt": "Create a 3+1 apartment with balcony.",
      "aiSummary": "Prompt matched 3+1 apartment language.",
      "warnings": [],
      "createdAt": "2026-06-19T00:00:00.000Z",
      "metadata": {
        "quality": {},
        "optimization": {},
        "lastEditQualityDelta": {},
        "updatedAt": "2026-06-19T00:00:00.000Z"
      },
      "versions": []
    }
  },
  "lastProjectId": "project_fixture_3plus1"
}
```

Rules:

- Only validated `FloorPlan` objects should be saved.
- Loaded plans are validated again before rendering, editing, or export.
- Corrupted storage falls back to the demo plan.
- Unsupported storage versions fall back to the demo plan.
- Invalid stored projects do not replace or delete other valid stored projects.
- Version history entries are validated independently; corrupted entries are dropped without deleting the current valid plan.
- Only the latest 10 versions are retained per project.

## Local Version History

Each generated project may store a bounded `versions` array. This history is local to the current browser and is intended as a lightweight demo safety net, not a production audit trail.

Each version stores:

- `schemaVersion`
- `versionId`
- `createdAt`
- `label`
- `sourceType`: `initial-generation`, `chat-edit`, or `restore`
- `message`: original prompt or edit message when available
- validated `FloorPlan` snapshot
- optional layout quality report
- optional optimization report
- optional edit quality delta
- warnings

Behavior:

- Initial generation stores an `initial-generation` snapshot.
- Every successful chat edit stores the previous current plan as a `chat-edit` snapshot before replacing the current plan.
- Restore validates the selected version's `FloorPlan` before it becomes current.
- Restore stores the previous current plan as a `restore` snapshot when the current plan is still valid.
- Invalid or schema-mismatched version entries are ignored during load.
- Invalid history never overwrites the current valid plan.

## Risks and Limitations

- `localStorage` is browser-only and device-specific.
- Projects disappear if the user clears site data.
- No cross-device sync exists.
- No project ownership or permissions exist.
- Storage capacity is limited.
- There is no server-side backup or audit trail.
- Version history is bounded to 10 local snapshots per project.
- Browser extensions or manual edits can corrupt stored JSON.

## Migration-Friendly Project Shape

Keep project state shaped around stable domain objects:

- `projectId`
- `projectName`
- `ownerId` later, omitted in MVP
- `prompt`
- `aiSummary`
- `currentPlan`
- `warnings`
- `createdAt`
- `updatedAt` later
- `versions` as append-friendly validated plan snapshots

Keep future entities append-friendly:

- plan versions
- chat messages
- edit actions
- validation issues
- exports
- provider metadata snapshots

## Future Database Path

Recommended first production path:

- Supabase/Postgres for projects, plans, chat messages, and exports.
- Row-level security once auth is introduced.
- JSONB columns for validated plan snapshots and AI metadata.
- Object storage for generated export artifacts.

Do not add this until auth and product ownership decisions are approved.

## Suggested Supabase/Postgres Schema Outline

### projects

- `id uuid primary key`
- `owner_id uuid not null`
- `name text`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `archived_at timestamptz`

### floor_plan_versions

- `id uuid primary key`
- `project_id uuid references projects(id)`
- `version_number integer not null`
- `source text not null`
- `prompt_summary text`
- `floor_plan jsonb not null`
- `validation_status text not null`
- `quality_report jsonb`
- `optimization_report jsonb`
- `edit_quality_delta jsonb`
- `warnings jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null`

### chat_messages

- `id uuid primary key`
- `project_id uuid references projects(id)`
- `plan_version_id uuid references floor_plan_versions(id)`
- `role text not null`
- `content text not null`
- `created_at timestamptz not null`

### edit_actions

- `id uuid primary key`
- `project_id uuid references projects(id)`
- `plan_version_id uuid references floor_plan_versions(id)`
- `action jsonb not null`
- `provider text not null`
- `created_at timestamptz not null`

### exports

- `id uuid primary key`
- `project_id uuid references projects(id)`
- `plan_version_id uuid references floor_plan_versions(id)`
- `format text not null`
- `storage_path text`
- `created_at timestamptz not null`

## Migration Notes

- Treat `localStorage` project JSON as a client-side cache, not authoritative data.
- Preserve schema versions in every persisted object.
- Validate imported local projects before inserting into a database.
- Keep exports derived from validated plan versions.
- Never persist secrets, raw OpenAI keys, system prompts, or hidden orchestration text.
