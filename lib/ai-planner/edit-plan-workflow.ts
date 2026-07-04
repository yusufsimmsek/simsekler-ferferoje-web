import { z } from "zod";
import { applyEditActionsToPlanDraft } from "./apply-edit-actions";
import type { AiPlannerProvider } from "./provider";
import { mockAiPlannerProvider } from "./mock-provider";
import { classifyMockChatEdit } from "./mock-chat-edit-classifier";
import type { AiProviderName } from "./config";
import {
  createAiProviderMetadata,
  logAiProviderEvent
} from "./observability";
import { floorPlanSchema } from "@/lib/schemas/floor-plan.schema";
import { planDraftSchema } from "@/lib/schemas/ai-contracts.schema";
import type {
  ChatEditResponse,
  FloorPlan,
  ValidationIssue,
  ValidationSummary
} from "@/lib/floor-plan/types";
import {
  validateChatEditResponse,
  validateFloorPlan,
  zodErrorToValidationIssues
} from "@/lib/floor-plan/validation";
import { floorPlanToPlanDraft } from "@/lib/floor-plan/draft";
import { generateFloorPlanLayout } from "@/lib/layout-engine/generate-layout";
import {
  analyzeLayoutQuality,
  createEditQualityDeltaReport,
  createEditResolvedPlanningFromDraft,
  formatSignedScoreDelta,
  optimizeFloorPlanLayout,
  topEditQualityDeltaReason
} from "@/lib/planning";
import type {
  EditQualityDeltaReport,
  LayoutOptimizationReport,
  LayoutQualityReport
} from "@/lib/planning";

const planEditRequestSchema = z
  .object({
    schemaVersion: z.literal("plan-edit-request-v1"),
    message: z.string().trim().min(1),
    currentPlan: floorPlanSchema
  })
  .strict();

export type PlanEditRequest = z.infer<typeof planEditRequestSchema>;

export type EditPlanProviderName = AiProviderName;

export type EditPlanErrorCode =
  | "INVALID_EDIT_REQUEST"
  | "EDIT_PROVIDER_FAILED"
  | "EDIT_SCHEMA_MISMATCH"
  | "EDIT_UNSUPPORTED_COMMAND"
  | "EDIT_NEEDS_CLARIFICATION"
  | "EDIT_REFUSED"
  | "EDIT_INVALID_ACTION"
  | "EDIT_UNKNOWN_TARGET"
  | "EDIT_LAYOUT_FAILED"
  | "EDIT_QUALITY_ANALYSIS_FAILED";

export type EditPlanSelectedCandidateMetadata = {
  id: string;
  label: string;
  strategy: string;
  overallScore: number;
  relationshipSatisfactionScore: number;
  circulationScore: number;
  roomBalanceScore: number;
  selectionReason: string;
};

export type EditPlanSuccessBody = {
  ok: true;
  code: "PLAN_EDITED";
  provider: EditPlanProviderName;
  schemaVersion: "plan-edit-response-v1";
  plan: FloorPlan;
  ai: ChatEditResponse;
  actions: ChatEditResponse["actions"];
  validation: ValidationSummary;
  warnings: string[];
  userFacingSummary: string;
  meta: {
    mock: boolean;
    requiresRelayout: boolean;
    layoutMode: "layout-engine-v1";
    touchedRoomIds: string[];
    providerMode: string;
    model: string | null;
    qualityBefore: LayoutQualityReport;
    qualityAfter: LayoutQualityReport;
    qualityDelta: EditQualityDeltaReport;
    optimization: LayoutOptimizationReport | null;
    selectedCandidate: EditPlanSelectedCandidateMetadata;
  };
};

export type EditPlanErrorBody = {
  ok: false;
  code: EditPlanErrorCode;
  provider: EditPlanProviderName;
  message: string;
  developerMessage: string;
  retryable: boolean;
  validation: ValidationSummary;
  issues: ValidationIssue[];
  warnings: string[];
  aiStatus?: ChatEditResponse["status"];
};

export type EditPlanWorkflowResult = {
  status: number;
  body: EditPlanSuccessBody | EditPlanErrorBody;
};

export async function runEditPlanWorkflow(
  input: unknown,
  options: {
    provider?: AiPlannerProvider;
    providerName?: EditPlanProviderName;
    providerMode?: string;
    model?: string | null;
    layoutOptimizer?: typeof optimizeFloorPlanLayout;
  } = {}
): Promise<EditPlanWorkflowResult> {
  const provider = options.provider ?? mockAiPlannerProvider;
  const providerName = options.providerName ?? "mock";
  const providerMode = options.providerMode ?? providerModeForName(providerName);
  const model = options.model ?? null;
  const startedAt = Date.now();
  const requestParse = planEditRequestSchema.safeParse(input);
  const observeResult = (result: EditPlanWorkflowResult): EditPlanWorkflowResult => {
    logAiProviderEvent(
      createAiProviderMetadata({
        provider: result.body.provider,
        model,
        mode: providerMode,
        requestType: "chat_edit",
        latencyMs: Date.now() - startedAt,
        contractSchemaVersion: "chat-edit-response-v1",
        validationStatus: result.body.validation.status,
        errorCode: result.body.ok ? null : result.body.code,
        prompt: requestParse.success ? requestParse.data.message : undefined,
        includePromptPreview: true
      })
    );

    return result;
  };

  if (!requestParse.success) {
    const issues = zodErrorToValidationIssues(requestParse.error, "edit-request");

    return observeResult(errorResult({
      status: 400,
      provider: providerName,
      code: "INVALID_EDIT_REQUEST",
      message: "Edit request must include a valid current plan and a non-empty message.",
      developerMessage: "Request body failed planEditRequestSchema validation.",
      retryable: true,
      issues
    }));
  }

  let aiResponse: unknown;

  if (usesLocalProvider(providerName)) {
    aiResponse = classifyMockChatEdit({
      message: requestParse.data.message,
      currentPlan: requestParse.data.currentPlan
    }).response;
  } else {
    try {
      aiResponse = await provider.editPlan({
        schemaVersion: "chat-edit-request-v1",
        message: requestParse.data.message,
        currentPlan: requestParse.data.currentPlan
      });
    } catch (error) {
      return observeResult(errorResult({
        status: 502,
        provider: providerName,
        code: "EDIT_PROVIDER_FAILED",
        message: "Plan edit failed before a valid response was produced.",
        developerMessage: getSafeErrorDetail(error),
        retryable: true
      }));
    }
  }

  const aiValidation = validateChatEditResponse(aiResponse);

  if (!aiValidation.ok) {
    return observeResult(errorResult({
      status: 502,
      provider: providerName,
      code: "EDIT_SCHEMA_MISMATCH",
      message: "The edit response did not match the required structured action schema.",
      developerMessage: "Provider output failed chatEditResponseSchema validation.",
      retryable: true,
      issues: aiValidation.issues
    }));
  }

  if (aiValidation.data.status === "unsupported") {
    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "EDIT_UNSUPPORTED_COMMAND",
      message: aiValidation.data.userFacingSummary,
      developerMessage: "AI provider returned unsupported.",
      retryable: true,
      aiStatus: aiValidation.data.status
    }));
  }

  if (aiValidation.data.status === "needs_clarification") {
    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "EDIT_NEEDS_CLARIFICATION",
      message: aiValidation.data.clarificationRequest ?? aiValidation.data.userFacingSummary,
      developerMessage: "Edit classifier requested clarification.",
      retryable: true,
      aiStatus: aiValidation.data.status
    }));
  }

  if (aiValidation.data.status === "refused") {
    return observeResult(errorResult({
      status: 403,
      provider: providerName,
      code: "EDIT_REFUSED",
      message: aiValidation.data.userFacingSummary,
      developerMessage: "Edit classifier refused the request.",
      retryable: false,
      aiStatus: aiValidation.data.status
    }));
  }

  const beforeDraft = floorPlanToPlanDraft(requestParse.data.currentPlan);
  const beforePlanning = createEditResolvedPlanningFromDraft(beforeDraft);
  const beforeQualityResult = analyzeLayoutQuality({
    planning: beforePlanning,
    plan: requestParse.data.currentPlan
  });

  if (!beforeQualityResult.ok) {
    return observeResult(errorResult({
      status: 500,
      provider: providerName,
      code: "EDIT_QUALITY_ANALYSIS_FAILED",
      message: "The current plan could not be evaluated before applying the edit.",
      developerMessage: beforeQualityResult.issues.join(" "),
      retryable: true,
      aiStatus: aiValidation.data.status
    }));
  }

  const applyResult = applyEditActionsToPlanDraft({
    currentPlan: requestParse.data.currentPlan,
    actions: aiValidation.data.actions
  });

  if (!applyResult.ok) {
    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: actionIssuesCode(applyResult.issues),
      message: "The edit could not be applied safely to the current plan.",
      developerMessage: applyResult.issues.map((issue) => issue.message).join(" "),
      retryable: true,
      issues: applyResult.issues,
      aiStatus: aiValidation.data.status
    }));
  }

  const draftValidation = planDraftSchema.safeParse(applyResult.draft);

  if (!draftValidation.success) {
    const issues = zodErrorToValidationIssues(draftValidation.error, "edit-draft");

    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "EDIT_INVALID_ACTION",
      message: "The edit produced an invalid semantic plan draft.",
      developerMessage: "Edited PlanDraft failed planDraftSchema validation.",
      retryable: true,
      issues,
      aiStatus: aiValidation.data.status
    }));
  }

  const afterPlanning = createEditResolvedPlanningFromDraft(draftValidation.data);
  const layoutOptimizer = options.layoutOptimizer ?? optimizeFloorPlanLayout;
  const optimizationResult = layoutOptimizer({
    draft: draftValidation.data,
    planning: afterPlanning,
    planId: requestParse.data.currentPlan.id,
    projectId: requestParse.data.currentPlan.projectId,
    promptSummary: requestParse.data.currentPlan.metadata.promptSummary,
    createdBy: createdByForProvider(providerName),
    source: "chat-edit"
  });
  const fallbackLayoutResult = optimizationResult.ok
    ? null
    : generateFloorPlanLayout({
        draft: draftValidation.data,
        planId: requestParse.data.currentPlan.id,
        projectId: requestParse.data.currentPlan.projectId,
        promptSummary: requestParse.data.currentPlan.metadata.promptSummary,
        createdBy: createdByForProvider(providerName),
        source: "chat-edit"
      });
  const selectedLayout = optimizationResult.ok
    ? {
        plan: optimizationResult.plan,
        warnings: optimizationResult.warnings,
        quality: optimizationResult.quality,
        optimization: optimizationResult.metadata,
        selectedCandidate: optimizationResult.metadata.selectedCandidate
      }
    : {
        plan: fallbackLayoutResult!.plan,
        warnings: uniqueWarnings([
          ...fallbackLayoutResult!.warnings,
          ...optimizationResult.warnings,
          "Optimizer could not select a candidate, so direct deterministic relayout was used."
        ]),
        quality: null,
        optimization: null,
        selectedCandidate: null
      };
  const floorPlanValidation = validateFloorPlan(selectedLayout.plan);

  if (!floorPlanValidation.ok) {
    return observeResult(errorResult({
      status: 500,
      provider: providerName,
      code: "EDIT_LAYOUT_FAILED",
      message: "The edited plan could not be converted into valid geometry.",
      developerMessage: "Edited layout failed floorPlanSchema validation.",
      retryable: true,
      issues: floorPlanValidation.issues,
      warnings: selectedLayout.warnings,
      aiStatus: aiValidation.data.status
    }));
  }

  const afterQualityResult = selectedLayout.quality
    ? {
        ok: true as const,
        report: selectedLayout.quality,
        issues: []
      }
    : analyzeLayoutQuality({
        planning: afterPlanning,
        plan: floorPlanValidation.data
      });

  if (!afterQualityResult.ok) {
    return observeResult(errorResult({
      status: 500,
      provider: providerName,
      code: "EDIT_QUALITY_ANALYSIS_FAILED",
      message: "The edited plan could not be evaluated after relayout.",
      developerMessage: afterQualityResult.issues.join(" "),
      retryable: true,
      warnings: selectedLayout.warnings,
      aiStatus: aiValidation.data.status
    }));
  }

  const qualityBefore = beforeQualityResult.report;
  const qualityAfter = afterQualityResult.report;
  const qualityDelta = createEditQualityDeltaReport({
    before: qualityBefore,
    after: qualityAfter
  });
  const selectedCandidate: EditPlanSelectedCandidateMetadata =
    selectedLayout.selectedCandidate ?? {
      id: "direct_fallback",
      label: "Direct fallback",
      strategy: "direct_deterministic_layout",
      overallScore: qualityAfter.overallScore,
      relationshipSatisfactionScore: qualityAfter.relationshipSatisfactionScore,
      circulationScore: qualityAfter.circulationScore,
      roomBalanceScore: qualityAfter.roomBalanceScore,
      selectionReason:
        "Used only because the layout optimizer did not produce a valid candidate."
    };
  const userFacingSummary = buildEditSummaryWithQuality({
    summary: aiValidation.data.userFacingSummary,
    delta: qualityDelta,
    optimization: selectedLayout.optimization
  });

  return observeResult({
    status: 200,
    body: {
      ok: true,
      code: "PLAN_EDITED",
      provider: providerName,
      schemaVersion: "plan-edit-response-v1",
      plan: floorPlanValidation.data,
      ai: aiValidation.data,
      actions: aiValidation.data.actions,
      validation: floorPlanValidation.summary,
      warnings: uniqueWarnings([
        ...selectedLayout.warnings,
        ...(floorPlanValidation.data.layout.warnings ?? []),
        ...qualityAfter.warnings.map((warning) => warning.message),
        ...(qualityDelta.scoreDelta < -0.01
          ? ["Layout quality decreased after this valid edit. Review warnings before export."]
          : []),
        ...floorPlanValidation.summary.issues.map((issue) => issue.message)
      ]),
      userFacingSummary,
      meta: {
        mock: providerName === "mock",
        requiresRelayout: aiValidation.data.requiresRelayout,
        layoutMode: "layout-engine-v1",
        touchedRoomIds: applyResult.touchedRoomIds,
        providerMode,
        model,
        qualityBefore,
        qualityAfter,
        qualityDelta,
        optimization: selectedLayout.optimization,
        selectedCandidate
      }
    }
  });
}

function errorResult(input: {
  status: number;
  provider: EditPlanProviderName;
  code: EditPlanErrorCode;
  message: string;
  developerMessage: string;
  retryable: boolean;
  issues?: ValidationIssue[];
  warnings?: string[];
  aiStatus?: ChatEditResponse["status"];
}): EditPlanWorkflowResult {
  const issues =
    input.issues && input.issues.length > 0
      ? input.issues
      : [
          {
            id: `issue_${input.code.toLowerCase()}`,
            severity: "critical" as const,
            code: input.code,
            message: input.developerMessage
          }
        ];

  return {
    status: input.status,
    body: {
      ok: false,
      code: input.code,
      provider: input.provider,
      message: input.message,
      developerMessage: input.developerMessage,
      retryable: input.retryable,
      validation: {
        status: "invalid",
        issues
      },
      issues,
      warnings: input.warnings ?? [],
      aiStatus: input.aiStatus
    }
  };
}

function actionIssuesCode(issues: ValidationIssue[]): EditPlanErrorCode {
  return issues.some((issue) => issue.code === "EDIT_UNKNOWN_TARGET")
    ? "EDIT_UNKNOWN_TARGET"
    : "EDIT_INVALID_ACTION";
}

function providerModeForName(providerName: EditPlanProviderName) {
  if (providerName === "mock") return "mock_default";
  if (providerName === "openai-compatible-local") return "openai_compatible_local";
  return providerName;
}

function createdByForProvider(providerName: EditPlanProviderName) {
  return providerName === "mock" ? "mock" : "ai";
}

function usesLocalProvider(providerName: EditPlanProviderName) {
  return (
    providerName === "ollama" ||
    providerName === "lmstudio" ||
    providerName === "openai-compatible-local"
  );
}

function uniqueWarnings(warnings: string[]) {
  return Array.from(new Set(warnings.filter((warning) => warning.trim().length > 0)));
}

function getSafeErrorDetail(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Provider threw an unknown error.";
}

function buildEditSummaryWithQuality(input: {
  summary: string;
  delta: EditQualityDeltaReport;
  optimization: LayoutOptimizationReport | null;
}) {
  const candidateCopy = input.optimization
    ? `Optimizer selected ${input.optimization.selectedCandidate.label} from ${input.optimization.candidateCount} candidates.`
    : "Direct fallback layout was used because optimization was unavailable.";
  const qualityWarning = input.delta.scoreDelta < -0.01
    ? "Quality decreased, so review the warnings before export."
    : "";

  return [
    input.summary,
    `Quality ${input.delta.beforeOverallScore} -> ${input.delta.afterOverallScore} (${formatSignedScoreDelta(input.delta.scoreDelta)}).`,
    topEditQualityDeltaReason(input.delta),
    candidateCopy,
    qualityWarning
  ]
    .filter(Boolean)
    .join(" ");
}
