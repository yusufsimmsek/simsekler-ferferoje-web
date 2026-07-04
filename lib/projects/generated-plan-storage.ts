import type { FloorPlan, ValidationIssue } from "@/lib/floor-plan/types";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import { layoutOptimizationReportSchema } from "@/lib/planning/candidate-schema";
import { editQualityDeltaReportSchema } from "@/lib/planning/edit-quality-delta-schema";
import { layoutQualityReportSchema } from "@/lib/planning/quality-schema";
import type {
  EditQualityDeltaReport,
  LayoutOptimizationReport,
  LayoutQualityReport
} from "@/lib/planning";

export const generatedProjectStoreVersion = 1;
export const generatedProjectPlanVersionSchemaVersion =
  "project-plan-version-v1" as const;
export const generatedProjectVersionHistoryLimit = 10;
export const generatedPlanStorageKey = "ai-floor-plan-generator.generated-projects.v1";
export const generatedPlanStorageUpdatedEvent =
  "ai-floor-plan-generator.generated-projects.updated";

export type StoredPlanVersionSourceType =
  | "initial-generation"
  | "chat-edit"
  | "restore";

export type StoredPlanVersion = {
  schemaVersion: typeof generatedProjectPlanVersionSchemaVersion;
  versionId: string;
  createdAt: string;
  label: string;
  sourceType: StoredPlanVersionSourceType;
  message: string | null;
  plan: FloorPlan;
  quality?: LayoutQualityReport;
  optimization?: LayoutOptimizationReport | null;
  editQualityDelta?: EditQualityDeltaReport;
  warnings: string[];
};

export type StoredGeneratedProject = {
  projectId: string;
  plan: FloorPlan;
  projectName: string | null;
  prompt: string;
  aiSummary: string;
  warnings: string[];
  createdAt: string;
  metadata?: StoredGeneratedProjectMetadata;
  versions?: StoredPlanVersion[];
};

export type StoredGeneratedProjectMetadata = {
  quality?: LayoutQualityReport;
  optimization?: LayoutOptimizationReport | null;
  lastEditQualityDelta?: EditQualityDeltaReport;
  updatedAt?: string;
};

export type GeneratedProjectStore = {
  version: typeof generatedProjectStoreVersion;
  projects: Record<string, StoredGeneratedProject>;
  lastProjectId: string | null;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type GeneratedPlanStorageResult =
  | {
      ok: true;
      project: StoredGeneratedProject;
      fallback: false;
    }
  | {
      ok: false;
      project: null;
      fallback: true;
      message: string;
      issues: ValidationIssue[];
    };

export type GeneratedProjectStoreReadResult =
  | {
      ok: true;
      store: GeneratedProjectStore;
      message: null;
      issues: [];
    }
  | {
      ok: false;
      store: GeneratedProjectStore;
      message: string;
      issues: ValidationIssue[];
    };

export type GeneratedProjectListResult = {
  projects: StoredGeneratedProject[];
  message: string | null;
  issues: ValidationIssue[];
};

export function createEmptyGeneratedProjectStore(): GeneratedProjectStore {
  return {
    version: generatedProjectStoreVersion,
    projects: {},
    lastProjectId: null
  };
}

export function saveGeneratedProject(
  storage: StorageLike,
  project: StoredGeneratedProject
) {
  const store = readGeneratedProjectStore(storage);
  const normalizedProject = normalizeStoredGeneratedProject(project);

  store.projects[project.projectId] = normalizedProject;
  store.lastProjectId = normalizedProject.projectId;
  storage.setItem(generatedPlanStorageKey, JSON.stringify(store));

  return normalizedProject;
}

export function loadGeneratedProject(
  storage: StorageLike,
  projectId: string
): GeneratedPlanStorageResult {
  const readResult = readGeneratedProjectStoreResult(storage);
  const store = readResult.store;

  if (!readResult.ok) {
    return {
      ok: false,
      project: null,
      fallback: true,
      message: readResult.message,
      issues: readResult.issues
    };
  }

  const project = store.projects[projectId];

  if (!project) {
    return {
      ok: false,
      project: null,
      fallback: true,
      message: "No generated project found in temporary browser storage.",
      issues: []
    };
  }

  if (!isStoredGeneratedProject(project)) {
    return {
      ok: false,
      project: null,
      fallback: true,
      message: "Stored generated project data was incomplete. Showing the demo fallback plan.",
      issues: [
        storageIssue(
          "STORED_PROJECT_INVALID",
          "Stored generated project did not match the MVP localStorage project shape."
        )
      ]
    };
  }

  if (project.plan.schemaVersion !== "floor-plan-v1") {
    return {
      ok: false,
      project: null,
      fallback: true,
      message: "Stored project uses an unsupported floor plan schema version. Showing the demo fallback plan.",
      issues: [
        storageIssue(
          "FLOOR_PLAN_SCHEMA_VERSION_MISMATCH",
          `Expected floor-plan-v1, received ${String(project.plan.schemaVersion)}.`
        )
      ]
    };
  }

  const validation = validateFloorPlan(project.plan);

  if (!validation.ok) {
    return {
      ok: false,
      project: null,
      fallback: true,
      message: "Stored generated project failed floor plan validation.",
      issues: validation.issues
    };
  }

  return {
    ok: true,
    project: {
      ...project,
      plan: validation.data,
      metadata: normalizeProjectMetadata(project.metadata),
      versions: normalizeProjectVersions(project.versions)
    },
    fallback: false
  };
}

export function listGeneratedProjects(storage: StorageLike): GeneratedProjectListResult {
  const readResult = readGeneratedProjectStoreResult(storage);

  if (!readResult.ok) {
    return {
      projects: [],
      message: readResult.message,
      issues: readResult.issues
    };
  }

  const projects = Object.values(readResult.store.projects)
    .filter(isStoredGeneratedProject)
    .flatMap((project) => {
      const validation = validateFloorPlan(project.plan);

      if (!validation.ok) return [];

      return [
        {
          ...project,
          plan: validation.data,
          metadata: normalizeProjectMetadata(project.metadata),
          versions: normalizeProjectVersions(project.versions)
        }
      ];
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    projects,
    message: null,
    issues: []
  };
}

export function readGeneratedProjectStore(storage: StorageLike): GeneratedProjectStore {
  return readGeneratedProjectStoreResult(storage).store;
}

export function createStoredPlanVersion(input: {
  project: StoredGeneratedProject;
  sourceType: StoredPlanVersionSourceType;
  label: string;
  message?: string | null;
  createdAt?: string;
  versionId?: string;
  plan?: FloorPlan;
  quality?: LayoutQualityReport;
  optimization?: LayoutOptimizationReport | null;
  editQualityDelta?: EditQualityDeltaReport;
  warnings?: string[];
}): StoredPlanVersion {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const plan = input.plan ?? input.project.plan;

  return {
    schemaVersion: generatedProjectPlanVersionSchemaVersion,
    versionId:
      input.versionId ??
      createVersionId({
        projectId: input.project.projectId,
        createdAt,
        sourceType: input.sourceType,
        label: input.label
      }),
    createdAt,
    label: input.label,
    sourceType: input.sourceType,
    message: input.message ?? null,
    plan,
    quality: input.quality ?? input.project.metadata?.quality,
    optimization:
      input.optimization !== undefined
        ? input.optimization
        : input.project.metadata?.optimization,
    editQualityDelta:
      input.editQualityDelta ?? input.project.metadata?.lastEditQualityDelta,
    warnings: input.warnings ?? input.project.warnings
  };
}

export function addStoredPlanVersion(
  project: StoredGeneratedProject,
  version: StoredPlanVersion
): StoredGeneratedProject {
  return {
    ...project,
    versions: boundVersions([
      version,
      ...normalizeProjectVersions(project.versions)
    ])
  };
}

export function getValidStoredPlanVersions(project: StoredGeneratedProject) {
  return normalizeProjectVersions(project.versions);
}

export function readGeneratedProjectStoreResult(
  storage: StorageLike
): GeneratedProjectStoreReadResult {
  const raw = storage.getItem(generatedPlanStorageKey);

  if (!raw) {
    return {
      ok: true,
      store: createEmptyGeneratedProjectStore(),
      message: null,
      issues: []
    };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isGeneratedProjectStore(parsed)) {
      return {
        ok: false,
        store: createEmptyGeneratedProjectStore(),
        message: "Temporary project storage uses an unsupported schema version. Showing the demo fallback plan.",
        issues: [
          storageIssue(
            "PROJECT_STORE_SCHEMA_VERSION_MISMATCH",
            "Generated project store did not match version 1."
          )
        ]
      };
    }

    return {
      ok: true,
      store: parsed,
      message: null,
      issues: []
    };
  } catch {
    return {
      ok: false,
      store: createEmptyGeneratedProjectStore(),
      message: "Temporary project storage could not be read. Showing the demo fallback plan.",
      issues: [
        storageIssue(
          "PROJECT_STORE_CORRUPTED_JSON",
          "Generated project store contained invalid JSON."
        )
      ]
    };
  }
}

export function clearGeneratedProjects(storage: StorageLike) {
  storage.removeItem(generatedPlanStorageKey);
}

export function notifyGeneratedProjectStorageUpdated() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(generatedPlanStorageUpdatedEvent));
}

function isGeneratedProjectStore(value: unknown): value is GeneratedProjectStore {
  if (!value || typeof value !== "object") return false;
  if (!("version" in value) || value.version !== generatedProjectStoreVersion) return false;
  if (!("projects" in value) || !value.projects || typeof value.projects !== "object") return false;
  if (!("lastProjectId" in value)) return false;

  return true;
}

function isStoredGeneratedProject(value: unknown): value is StoredGeneratedProject {
  if (!value || typeof value !== "object") return false;

  return (
    "projectId" in value &&
    typeof value.projectId === "string" &&
    "plan" in value &&
    Boolean(value.plan) &&
    "projectName" in value &&
    (typeof value.projectName === "string" || value.projectName === null) &&
    "prompt" in value &&
    typeof value.prompt === "string" &&
    "aiSummary" in value &&
    typeof value.aiSummary === "string" &&
    "warnings" in value &&
    Array.isArray(value.warnings) &&
    "createdAt" in value &&
    typeof value.createdAt === "string"
  );
}

function normalizeStoredGeneratedProject(
  project: StoredGeneratedProject
): StoredGeneratedProject {
  return {
    ...project,
    metadata: normalizeProjectMetadata(project.metadata),
    versions: normalizeProjectVersions(project.versions)
  };
}

function normalizeProjectMetadata(
  value: StoredGeneratedProject["metadata"] | unknown
): StoredGeneratedProject["metadata"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as NonNullable<StoredGeneratedProject["metadata"]>;

  return {
    quality: normalizeQuality(candidate.quality),
    optimization: normalizeOptimization(candidate.optimization),
    lastEditQualityDelta: normalizeEditQualityDelta(candidate.lastEditQualityDelta),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined
  };
}

function normalizeProjectVersions(value: unknown): StoredPlanVersion[] {
  if (!Array.isArray(value)) return [];

  return boundVersions(value.flatMap((item) => {
    const normalized = normalizeProjectVersion(item);

    return normalized ? [normalized] : [];
  }));
}

function normalizeProjectVersion(value: unknown): StoredPlanVersion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("schemaVersion" in value) || value.schemaVersion !== generatedProjectPlanVersionSchemaVersion) {
    return null;
  }
  if (!("versionId" in value) || typeof value.versionId !== "string") return null;
  if (!("createdAt" in value) || typeof value.createdAt !== "string") return null;
  if (!("label" in value) || typeof value.label !== "string") return null;
  if (!("sourceType" in value) || !isPlanVersionSourceType(value.sourceType)) return null;
  if (!("plan" in value)) return null;

  const planValidation = validateFloorPlan(value.plan);

  if (!planValidation.ok) return null;

  const candidate = value as StoredPlanVersion;

  return {
    schemaVersion: generatedProjectPlanVersionSchemaVersion,
    versionId: candidate.versionId,
    createdAt: candidate.createdAt,
    label: candidate.label,
    sourceType: candidate.sourceType,
    message: typeof candidate.message === "string" ? candidate.message : null,
    plan: planValidation.data,
    quality: normalizeQuality(candidate.quality),
    optimization: normalizeOptimization(candidate.optimization),
    editQualityDelta: normalizeEditQualityDelta(candidate.editQualityDelta),
    warnings: Array.isArray(candidate.warnings)
      ? candidate.warnings.filter((warning) => typeof warning === "string")
      : []
  };
}

function boundVersions(versions: StoredPlanVersion[]) {
  return Array.from(
    new Map(versions.map((version) => [version.versionId, version])).values()
  )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, generatedProjectVersionHistoryLimit);
}

function normalizeQuality(value: unknown) {
  const parsed = layoutQualityReportSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

function normalizeOptimization(value: unknown) {
  if (value === null) return null;

  const parsed = layoutOptimizationReportSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

function normalizeEditQualityDelta(value: unknown) {
  const parsed = editQualityDeltaReportSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

function isPlanVersionSourceType(
  value: unknown
): value is StoredPlanVersionSourceType {
  return (
    value === "initial-generation" ||
    value === "chat-edit" ||
    value === "restore"
  );
}

function createVersionId(input: {
  projectId: string;
  createdAt: string;
  sourceType: StoredPlanVersionSourceType;
  label: string;
}) {
  return `version_${stableHash([
    input.projectId,
    input.createdAt,
    input.sourceType,
    input.label
  ].join(":"))}`;
}

function stableHash(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return Math.abs(hash >>> 0).toString(36);
}

function storageIssue(code: string, message: string): ValidationIssue {
  return {
    id: `issue_storage_${code.toLowerCase()}`,
    severity: "warning",
    code,
    message
  };
}
