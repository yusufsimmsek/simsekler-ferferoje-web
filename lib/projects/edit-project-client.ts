import type {
  EditAction,
  FloorPlan,
  ValidationIssue,
  ValidationSummary
} from "@/lib/floor-plan/types";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import type {
  EditQualityDeltaReport,
  LayoutOptimizationReport,
  LayoutQualityReport
} from "@/lib/planning";
import type { StoredGeneratedProject, StorageLike } from "./generated-plan-storage";
import {
  addStoredPlanVersion,
  createStoredPlanVersion,
  notifyGeneratedProjectStorageUpdated,
  saveGeneratedProject
} from "./generated-plan-storage";

export type EditProjectRequest = {
  message: string;
  project: StoredGeneratedProject;
};

export type EditProjectSuccess = {
  ok: true;
  project: StoredGeneratedProject;
  userFacingSummary: string;
  warnings: string[];
  actions: EditAction[];
  qualityDelta?: EditQualityDeltaReport;
};

export type EditProjectError = {
  ok: false;
  code:
    | "EMPTY_EDIT_MESSAGE"
    | "NETWORK_ERROR"
    | "API_ERROR"
    | "INVALID_RESPONSE"
    | "INVALID_PLAN";
  message: string;
  developerMessage: string;
  retryable: boolean;
  issues: ValidationIssue[];
  warnings: string[];
};

export type EditProjectResult = EditProjectSuccess | EditProjectError;

type EditPlanSuccessResponse = {
  ok: true;
  code: "PLAN_EDITED";
  provider: ApiProviderName;
  schemaVersion: "plan-edit-response-v1";
  plan: FloorPlan;
  actions: EditAction[];
  validation: ValidationSummary;
  warnings: string[];
  userFacingSummary: string;
  meta: {
    mock: boolean;
    requiresRelayout: boolean;
    layoutMode: "layout-engine-v1";
    touchedRoomIds: string[];
    providerMode?: string;
    model?: string | null;
    qualityBefore?: LayoutQualityReport;
    qualityAfter?: LayoutQualityReport;
    qualityDelta?: EditQualityDeltaReport;
    optimization?: LayoutOptimizationReport | null;
    selectedCandidate?: {
      id: string;
      label: string;
      strategy: string;
      overallScore: number;
      relationshipSatisfactionScore: number;
      circulationScore: number;
      roomBalanceScore: number;
      selectionReason: string;
    };
  };
};

type EditPlanErrorResponse = {
  ok: false;
  code: string;
  provider: ApiProviderName;
  message: string;
  developerMessage?: string;
  requestId?: string;
  retryable: boolean;
  validation: ValidationSummary;
  issues: ValidationIssue[];
  warnings: string[];
  aiStatus?: string;
};

type ApiProviderName =
  | "mock"
  | "ollama"
  | "lmstudio"
  | "openai-compatible-local"
  | "openai";

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export async function editGeneratedProjectWithMessage(input: {
  request: EditProjectRequest;
  storage: StorageLike;
  fetcher?: FetchLike;
}): Promise<EditProjectResult> {
  const message = input.request.message.trim();

  if (!message) {
    return {
      ok: false,
      code: "EMPTY_EDIT_MESSAGE",
      message: "Enter an edit request first.",
      developerMessage: "Edit message was empty after trimming.",
      retryable: true,
      issues: [],
      warnings: []
    };
  }

  const currentPlanValidation = validateFloorPlan(input.request.project.plan);

  if (!currentPlanValidation.ok) {
    return {
      ok: false,
      code: "INVALID_PLAN",
      message: "The current plan must be valid before it can be edited.",
      developerMessage: "Stored project plan failed client-side validation before edit.",
      retryable: false,
      issues: currentPlanValidation.issues,
      warnings: input.request.project.warnings
    };
  }

  const fetcher = input.fetcher ?? fetch;
  let response: Awaited<ReturnType<FetchLike>>;

  try {
    response = await fetcher("/api/plan/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: "plan-edit-request-v1",
        message,
        currentPlan: currentPlanValidation.data
      })
    });
  } catch (error) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: "Could not reach the mock edit pipeline.",
      developerMessage: error instanceof Error ? error.message : "Unknown fetch failure.",
      retryable: true,
      issues: [],
      warnings: []
    };
  }

  const payload = await response.json().catch((): unknown => null);

  if (!response.ok) {
    const apiError = isEditPlanErrorResponse(payload) ? payload : null;

    return {
      ok: false,
      code: "API_ERROR",
      message: apiError?.message ?? "Plan edit failed.",
      developerMessage:
        apiError?.developerMessage ??
        `Edit API returned HTTP ${response.status}${apiError?.requestId ? ` (${apiError.requestId})` : ""}.`,
      retryable: apiError?.retryable ?? true,
      issues: apiError?.issues ?? [],
      warnings: apiError?.warnings ?? []
    };
  }

  if (!isEditPlanSuccessResponse(payload)) {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      message: "The edit pipeline returned an unexpected response.",
      developerMessage: "Response did not match the stable PLAN_EDITED client contract.",
      retryable: true,
      issues: [],
      warnings: []
    };
  }

  const updatedPlanValidation = validateFloorPlan(payload.plan);

  if (!updatedPlanValidation.ok) {
    return {
      ok: false,
      code: "INVALID_PLAN",
      message: "The edited plan failed client-side validation.",
      developerMessage: "Edited FloorPlan did not pass validateFloorPlan in the edit flow.",
      retryable: true,
      issues: updatedPlanValidation.issues,
      warnings: payload.warnings
    };
  }

  const updatedAt = new Date().toISOString();
  const projectWithHistory = addStoredPlanVersion(
    input.request.project,
    createStoredPlanVersion({
      project: input.request.project,
      sourceType: "chat-edit",
      label: `Before edit: ${createVersionLabel(message)}`,
      message,
      createdAt: updatedAt,
      plan: currentPlanValidation.data,
      quality:
        payload.meta.qualityBefore ?? input.request.project.metadata?.quality,
      optimization: input.request.project.metadata?.optimization,
      editQualityDelta: payload.meta.qualityDelta,
      warnings: input.request.project.warnings
    })
  );
  const updatedProject: StoredGeneratedProject = {
    ...projectWithHistory,
    plan: updatedPlanValidation.data,
    aiSummary: payload.userFacingSummary,
    warnings: uniqueWarnings(payload.warnings),
    metadata: {
      ...projectWithHistory.metadata,
      quality: payload.meta.qualityAfter ?? input.request.project.metadata?.quality,
      optimization: payload.meta.optimization ?? null,
      lastEditQualityDelta: payload.meta.qualityDelta,
      updatedAt
    }
  };

  saveGeneratedProject(input.storage, updatedProject);
  notifyGeneratedProjectStorageUpdated();

  return {
    ok: true,
    project: updatedProject,
    userFacingSummary: payload.userFacingSummary,
    warnings: updatedProject.warnings,
    actions: payload.actions,
    qualityDelta: payload.meta.qualityDelta
  };
}

function isEditPlanSuccessResponse(value: unknown): value is EditPlanSuccessResponse {
  if (!value || typeof value !== "object") return false;

  return (
    "ok" in value &&
    value.ok === true &&
    "code" in value &&
    value.code === "PLAN_EDITED" &&
    "plan" in value &&
    "actions" in value &&
    "userFacingSummary" in value &&
    typeof value.userFacingSummary === "string"
  );
}

function isEditPlanErrorResponse(value: unknown): value is EditPlanErrorResponse {
  if (!value || typeof value !== "object") return false;

  return (
    "ok" in value &&
    value.ok === false &&
    "message" in value &&
    typeof value.message === "string"
  );
}

function uniqueWarnings(warnings: string[]) {
  return Array.from(new Set(warnings.filter((warning) => warning.trim().length > 0)));
}

function createVersionLabel(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (normalized.length <= 42) return normalized;

  return `${normalized.slice(0, 39)}...`;
}
