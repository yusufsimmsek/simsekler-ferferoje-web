"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import type {
  StoredGeneratedProject,
  StoredPlanVersion
} from "@/lib/projects/generated-plan-storage";
import { getValidStoredPlanVersions } from "@/lib/projects/generated-plan-storage";
import { restoreGeneratedProjectVersion } from "@/lib/projects/restore-project-version-client";
import { formatSignedScoreDelta } from "@/lib/planning";

type VersionHistoryPanelProps = {
  project: StoredGeneratedProject | null;
};

const sourceLabels: Record<StoredPlanVersion["sourceType"], string> = {
  "initial-generation": "Initial",
  "chat-edit": "Chat edit",
  restore: "Restore"
};

export function VersionHistoryPanel({ project }: VersionHistoryPanelProps) {
  const versions = useMemo(
    () => (project ? getValidStoredPlanVersions(project) : []),
    [project]
  );
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  function handleRestore(versionId: string) {
    if (!project) return;

    setRestoringVersionId(versionId);
    setError(null);

    const result = restoreGeneratedProjectVersion({
      project,
      versionId,
      storage: window.localStorage
    });

    setRestoringVersionId(null);

    if (!result.ok) {
      setError(result.message);
    }
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-950">Version history</h3>
        </div>
        <StatusChip tone="neutral">{versions.length}/10</StatusChip>
      </div>
      <p className="text-xs leading-5 text-neutral-500">
        Saved only in this browser. Clearing local storage removes versions; cloud sync is not enabled yet.
      </p>
      {error ? (
        <div
          aria-live="assertive"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <div className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Restore not applied
          </div>
          <p>{error}</p>
        </div>
      ) : null}
      {versions.length > 0 ? (
        <div className="grid gap-2">
          {versions.map((version) => (
            <VersionHistoryRow
              isRestoring={restoringVersionId === version.versionId}
              key={version.versionId}
              onRestore={handleRestore}
              version={version}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3 text-xs leading-5 text-neutral-500">
          Generate or edit a local project to start collecting restorable plan snapshots.
        </div>
      )}
    </section>
  );
}

function VersionHistoryRow({
  isRestoring,
  onRestore,
  version
}: {
  isRestoring: boolean;
  onRestore: (versionId: string) => void;
  version: StoredPlanVersion;
}) {
  const qualityScore = version.quality?.overallScore;
  const deltaScore = version.editQualityDelta?.scoreDelta;

  return (
    <article className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-neutral-950">
            {version.label}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {formatVersionDate(version.createdAt)} - {sourceLabels[version.sourceType]}
          </p>
        </div>
        <Button
          aria-label={`Restore ${version.label}`}
          disabled={isRestoring}
          onClick={() => onRestore(version.versionId)}
          size="iconSm"
          title={`Restore ${version.label}`}
          variant="icon"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        {qualityScore !== undefined ? (
          <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 font-mono text-teal-800">
            Quality {Math.round(qualityScore)}
          </span>
        ) : null}
        {deltaScore !== undefined ? (
          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-blue-800">
            Delta {formatSignedScoreDelta(deltaScore)}
          </span>
        ) : null}
      </div>
      {version.message ? (
        <p className="line-clamp-2 text-[11px] leading-4 text-neutral-500">
          {version.message}
        </p>
      ) : null}
    </article>
  );
}

function formatVersionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
