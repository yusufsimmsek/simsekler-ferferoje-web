import type { ValidationIssue } from "@/lib/floor-plan/types";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import type {
  StoredGeneratedProject,
  StoredPlanVersion,
  StorageLike
} from "./generated-plan-storage";
import {
  addStoredPlanVersion,
  createStoredPlanVersion,
  getValidStoredPlanVersions,
  notifyGeneratedProjectStorageUpdated,
  saveGeneratedProject
} from "./generated-plan-storage";

export type RestoreProjectVersionSuccess = {
  ok: true;
  project: StoredGeneratedProject;
  restoredVersion: StoredPlanVersion;
  warnings: string[];
};

export type RestoreProjectVersionError = {
  ok: false;
  code:
    | "VERSION_NOT_FOUND"
    | "INVALID_VERSION_PLAN"
    | "INVALID_CURRENT_PLAN";
  message: string;
  developerMessage: string;
  issues: ValidationIssue[];
  warnings: string[];
};

export type RestoreProjectVersionResult =
  | RestoreProjectVersionSuccess
  | RestoreProjectVersionError;

export function restoreGeneratedProjectVersion(input: {
  project: StoredGeneratedProject;
  versionId: string;
  storage: StorageLike;
  now?: () => string;
}): RestoreProjectVersionResult {
  const versions = getValidStoredPlanVersions(input.project);
  const selectedVersion = versions.find(
    (version) => version.versionId === input.versionId
  );

  if (!selectedVersion) {
    return {
      ok: false,
      code: "VERSION_NOT_FOUND",
      message: "That saved version is no longer available.",
      developerMessage:
        "Requested version was missing or was filtered during local history validation.",
      issues: [],
      warnings: input.project.warnings
    };
  }

  const selectedPlanValidation = validateFloorPlan(selectedVersion.plan);

  if (!selectedPlanValidation.ok) {
    return {
      ok: false,
      code: "INVALID_VERSION_PLAN",
      message: "That saved version could not be restored because its plan is invalid.",
      developerMessage:
        "Selected history version failed FloorPlan validation during restore.",
      issues: selectedPlanValidation.issues,
      warnings: selectedVersion.warnings
    };
  }

  const restoredAt = input.now?.() ?? new Date().toISOString();
  const currentPlanValidation = validateFloorPlan(input.project.plan);
  const projectWithRestoreSource = currentPlanValidation.ok
    ? addStoredPlanVersion(
        input.project,
        createStoredPlanVersion({
          project: input.project,
          sourceType: "restore",
          label: `Before restore: ${createVersionLabel(input.project.plan.title)}`,
          message: `Restored local version "${selectedVersion.label}".`,
          createdAt: restoredAt,
          plan: currentPlanValidation.data,
          quality: input.project.metadata?.quality,
          optimization: input.project.metadata?.optimization,
          editQualityDelta: input.project.metadata?.lastEditQualityDelta,
          warnings: input.project.warnings
        })
      )
    : input.project;

  const updatedProject: StoredGeneratedProject = {
    ...projectWithRestoreSource,
    plan: selectedPlanValidation.data,
    aiSummary: `Restored local version "${selectedVersion.label}".`,
    warnings: selectedVersion.warnings,
    metadata: {
      ...projectWithRestoreSource.metadata,
      quality: selectedVersion.quality,
      optimization: selectedVersion.optimization,
      lastEditQualityDelta: selectedVersion.editQualityDelta,
      updatedAt: restoredAt
    }
  };
  const savedProject = saveGeneratedProject(input.storage, updatedProject);

  notifyGeneratedProjectStorageUpdated();

  return {
    ok: true,
    project: savedProject,
    restoredVersion: selectedVersion,
    warnings: savedProject.warnings
  };
}

function createVersionLabel(label: string) {
  const normalized = label.replace(/\s+/g, " ").trim();

  if (normalized.length <= 42) return normalized;

  return `${normalized.slice(0, 39)}...`;
}
