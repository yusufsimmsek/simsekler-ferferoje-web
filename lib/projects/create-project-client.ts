import type { FloorPlan, ValidationIssue, ValidationSummary } from "@/lib/floor-plan/types";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import type {
  LayoutOptimizationReport,
  LayoutQualityReport
} from "@/lib/planning";
import type { StoredGeneratedProject, StorageLike } from "./generated-plan-storage";
import {
  addStoredPlanVersion,
  createStoredPlanVersion,
  saveGeneratedProject
} from "./generated-plan-storage";

export type CreateProjectRequest = {
  prompt: string;
  projectName?: string;
};

export type CreateProjectSuccess = {
  ok: true;
  project: StoredGeneratedProject;
  warnings: string[];
};

export type CreateProjectError = {
  ok: false;
  code:
    | "EMPTY_PROMPT"
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

export type CreateProjectResult = CreateProjectSuccess | CreateProjectError;

type GeneratePlanSuccessResponse = {
  ok: true;
  code: "PLAN_GENERATED";
  provider: ApiProviderName;
  schemaVersion: "plan-generation-response-v1";
  plan: FloorPlan;
  validation: ValidationSummary;
  warnings: string[];
  meta: {
    mock: boolean;
    promptClassification: string;
    classificationReason: string;
    layoutMode: "layout-engine-v1";
    providerMode?: string;
    model?: string | null;
    planning?: {
      schemaVersion: "resolved-planning-specification-v1";
      confidence: number;
      feasibilityScore: number;
      feasibilityRating: "highly_feasible" | "feasible" | "constrained" | "low";
      complexityScore: number;
      warnings: string[];
      compromises: string[];
      assumptions: string[];
      recommendations: string[];
      clarificationRecommendations: string[];
    };
    quality?: LayoutQualityReport;
    optimization?: LayoutOptimizationReport;
  };
};

type GeneratePlanErrorResponse = {
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

export async function createProjectFromPrompt(input: {
  request: CreateProjectRequest;
  storage: StorageLike;
  fetcher?: FetchLike;
  now?: () => string;
}): Promise<CreateProjectResult> {
  const prompt = input.request.prompt.trim();

  if (!prompt) {
    return {
      ok: false,
      code: "EMPTY_PROMPT",
      message: "Describe the layout you want to generate.",
      developerMessage: "Prompt was empty after trimming.",
      retryable: true,
      issues: [],
      warnings: []
    };
  }

  const fetcher = input.fetcher ?? fetch;
  let response: Awaited<ReturnType<FetchLike>>;

  try {
    response = await fetcher("/api/plan/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: "plan-generation-request-v1",
        prompt,
        preferences: {
          units: "m",
          maxRooms: 12,
          style: "simple-residential",
          rectangularRoomsOnly: true
        }
      })
    });
  } catch (error) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: "Could not reach the mock floor plan generator.",
      developerMessage: error instanceof Error ? error.message : "Unknown fetch failure.",
      retryable: true,
      issues: [],
      warnings: []
    };
  }

  const payload = await response.json().catch((): unknown => null);

  if (!response.ok) {
    const apiError = isGeneratePlanErrorResponse(payload) ? payload : null;

    return {
      ok: false,
      code: "API_ERROR",
      message: apiError?.message ?? "Plan generation failed.",
      developerMessage:
        apiError?.developerMessage ??
        `Generate API returned HTTP ${response.status}${apiError?.requestId ? ` (${apiError.requestId})` : ""}.`,
      retryable: apiError?.retryable ?? true,
      issues: apiError?.issues ?? [],
      warnings: apiError?.warnings ?? []
    };
  }

  if (!isGeneratePlanSuccessResponse(payload)) {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      message: "The generator returned an unexpected response.",
      developerMessage: "Response did not match the stable PLAN_GENERATED client contract.",
      retryable: true,
      issues: [],
      warnings: []
    };
  }

  const validation = validateFloorPlan(payload.plan);

  if (!validation.ok) {
    return {
      ok: false,
      code: "INVALID_PLAN",
      message: "The generated plan failed client-side validation.",
      developerMessage: "Generated FloorPlan did not pass validateFloorPlan in the create flow.",
      retryable: true,
      issues: validation.issues,
      warnings: payload.warnings
    };
  }

  const createdAt = input.now?.() ?? new Date().toISOString();
  const projectWithoutHistory: StoredGeneratedProject = {
    projectId: validation.data.projectId,
    plan: validation.data,
    projectName: input.request.projectName?.trim() || null,
    prompt,
    aiSummary: payload.meta.classificationReason,
    warnings: payload.warnings,
    createdAt,
    metadata: {
      quality: payload.meta.quality,
      optimization: payload.meta.optimization,
      updatedAt: createdAt
    }
  };
  const project = addStoredPlanVersion(
    projectWithoutHistory,
    createStoredPlanVersion({
      project: projectWithoutHistory,
      sourceType: "initial-generation",
      label: "Initial generation",
      message: prompt,
      createdAt,
      plan: validation.data,
      quality: payload.meta.quality,
      optimization: payload.meta.optimization,
      warnings: payload.warnings
    })
  );

  saveGeneratedProject(input.storage, project);

  return {
    ok: true,
    project,
    warnings: payload.warnings
  };
}

function isGeneratePlanSuccessResponse(value: unknown): value is GeneratePlanSuccessResponse {
  if (!value || typeof value !== "object") return false;

  return (
    "ok" in value &&
    value.ok === true &&
    "code" in value &&
    value.code === "PLAN_GENERATED" &&
    "plan" in value &&
    "meta" in value &&
    Boolean(value.meta)
  );
}

function isGeneratePlanErrorResponse(value: unknown): value is GeneratePlanErrorResponse {
  if (!value || typeof value !== "object") return false;

  return (
    "ok" in value &&
    value.ok === false &&
    "message" in value &&
    typeof value.message === "string"
  );
}
