import type { AiPlannerProvider } from "./provider";
import { mockAiPlannerProvider } from "./mock-provider";
import { classifyMockPrompt, type MockPromptFixtureKey } from "./mock-prompt-classifier";
import type { AiProviderName } from "./config";
import {
  createAiProviderMetadata,
  logAiProviderEvent
} from "./observability";
import { planGenerationRequestSchema } from "@/lib/schemas/ai-contracts.schema";
import { promptToPlanAiResponseSchema } from "@/lib/schemas/ai-contracts.schema";
import type { PromptToPlanAiResponse } from "@/lib/schemas/ai-contracts.schema";
import type {
  FloorPlan,
  ValidationIssue,
  ValidationSummary
} from "@/lib/floor-plan/types";
import {
  validateFloorPlan,
  zodErrorToValidationIssues
} from "@/lib/floor-plan/validation";
import {
  mapResolvedPlanningSpecificationToPlanDraft,
  normalizePlanningSpecification,
  PlanningProviderValidationError,
  resolvePlanningConstraints,
  optimizeFloorPlanLayout,
  planningSpecificationFromPrompt,
  validatePlanningSpecification
} from "@/lib/planning";
import type {
  LayoutOptimizationReport,
  LayoutQualityReport,
  PlanningProvider,
  PlanningValidationIssue,
  ResolvedPlanningSpecification
} from "@/lib/planning";

export type GeneratePlanProviderName = AiProviderName;

export type GeneratePlanErrorCode =
  | "INVALID_GENERATE_REQUEST"
  | "AI_PROVIDER_FAILED"
  | "AI_SCHEMA_MISMATCH"
  | "AI_UNSUPPORTED_REQUEST"
  | "AI_NEEDS_CLARIFICATION"
  | "AI_REFUSED"
  | "MOCK_FIXTURE_NOT_FOUND"
  | "LAYOUT_FAILED"
  | "LAYOUT_OPTIMIZATION_FAILED"
  | "LAYOUT_QUALITY_ANALYSIS_FAILED"
  | "FLOOR_PLAN_VALIDATION_FAILED";

export type GeneratePlanSuccessBody = {
  ok: true;
  code: "PLAN_GENERATED";
  provider: GeneratePlanProviderName;
  schemaVersion: "plan-generation-response-v1";
  plan: FloorPlan;
  ai: PromptToPlanAiResponse;
  validation: ValidationSummary;
  warnings: string[];
  meta: {
    mock: boolean;
    promptClassification: string;
    classificationReason: string;
    layoutMode: "layout-engine-v1";
    providerMode: string;
    model: string | null;
    planning: GeneratePlanPlanningMetadata;
    quality: LayoutQualityReport;
    optimization: LayoutOptimizationReport;
  };
};

export type GeneratePlanPlanningMetadata = {
  schemaVersion: "resolved-planning-specification-v1";
  confidence: number;
  feasibilityScore: number;
  feasibilityRating: ResolvedPlanningSpecification["feasibility"]["rating"];
  complexityScore: number;
  warnings: string[];
  conflicts: Array<{
    code: string;
    severity: "warning" | "critical";
    message: string;
  }>;
  compromises: string[];
  assumptions: string[];
  recommendations: string[];
  clarificationRecommendations: string[];
};

export type GeneratePlanErrorBody = {
  ok: false;
  code: GeneratePlanErrorCode;
  provider: GeneratePlanProviderName;
  message: string;
  developerMessage: string;
  retryable: boolean;
  validation: ValidationSummary;
  issues: ValidationIssue[];
  warnings: string[];
  aiStatus?: PromptToPlanAiResponse["status"];
  planning?: GeneratePlanPlanningMetadata;
};

export type GeneratePlanWorkflowResult = {
  status: number;
  body: GeneratePlanSuccessBody | GeneratePlanErrorBody;
};

export async function runGeneratePlanWorkflow(
  input: unknown,
  options: {
    provider?: AiPlannerProvider;
    providerName?: GeneratePlanProviderName;
    providerMode?: string;
    model?: string | null;
    planningProvider?: PlanningProvider;
  } = {}
): Promise<GeneratePlanWorkflowResult> {
  const provider = options.provider ?? mockAiPlannerProvider;
  const providerName = options.providerName ?? "mock";
  const providerMode = options.providerMode ?? providerModeForName(providerName);
  const model = options.model ?? null;
  const startedAt = Date.now();
  const requestParse = planGenerationRequestSchema.safeParse(input);
  const observeResult = (result: GeneratePlanWorkflowResult): GeneratePlanWorkflowResult => {
    logAiProviderEvent(
      createAiProviderMetadata({
        provider: result.body.provider,
        model,
        mode: providerMode,
        requestType: "prompt_to_plan",
        latencyMs: Date.now() - startedAt,
        contractSchemaVersion: result.body.ok
          ? result.body.schemaVersion
          : "plan-generation-response-v1",
        validationStatus: result.body.validation.status,
        errorCode: result.body.ok ? null : result.body.code,
        prompt: requestParse.success ? requestParse.data.prompt : undefined,
        includePromptPreview: true
      })
    );

    return result;
  };

  if (!requestParse.success) {
    const issues = zodErrorToValidationIssues(requestParse.error, "generate-request");

    return observeResult(errorResult({
      status: 400,
      provider: providerName,
      code: "INVALID_GENERATE_REQUEST",
      message: "Generate plan request must include a non-empty prompt and MVP preferences.",
      developerMessage: "Request body failed planGenerationRequestSchema validation.",
      retryable: true,
      issues
    }));
  }

  const deterministicPromptGuard = planningSpecificationFromPrompt(requestParse.data.prompt);

  if (deterministicPromptGuard.unsupportedRequests.length > 0) {
    const unsupportedWarnings = uniqueWarnings([
      ...deterministicPromptGuard.warnings,
      ...deterministicPromptGuard.unsupportedRequests.map((request) => request.message)
    ]);

    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "AI_UNSUPPORTED_REQUEST",
      message: userFriendlyUnsupportedPromptMessage(unsupportedWarnings),
      developerMessage:
        "Deterministic prompt guard blocked an unsupported request before provider execution.",
      retryable: false,
      warnings: unsupportedWarnings,
      aiStatus: "unsupported"
    }));
  }

  if (deterministicPromptGuard.clarificationQuestions.length > 0) {
    const clarificationMessage = deterministicPromptGuard.clarificationQuestions
      .map((question) => question.question)
      .join(" ");

    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "AI_NEEDS_CLARIFICATION",
      message: clarificationMessage || "More detail is needed to generate a plan.",
      developerMessage:
        "Deterministic prompt guard requires clarification before provider execution.",
      retryable: true,
      warnings: deterministicPromptGuard.warnings,
      aiStatus: "needs_clarification"
    }));
  }

  let planningResponse: unknown;

  try {
    if (options.planningProvider) {
      planningResponse = await options.planningProvider.createPlanningSpecification(requestParse.data);
    } else if (provider.createPlanningSpecification) {
      planningResponse = await provider.createPlanningSpecification(requestParse.data);
    } else {
      planningResponse = await provider.generatePlan(requestParse.data);
    }
  } catch (error) {
    if (error instanceof PlanningProviderValidationError) {
      return observeResult(errorResult({
        status: 502,
        provider: providerName,
        code: "AI_SCHEMA_MISMATCH",
        message: "The AI planning response did not match the required PlanningSpecification schema.",
        developerMessage: error.message,
        retryable: true,
        issues: planningIssuesToValidationIssues(error.issues)
      }));
    }

    return observeResult(errorResult({
      status: 502,
      provider: providerName,
      code: "AI_PROVIDER_FAILED",
      message: "Plan generation failed before a valid response was produced.",
      developerMessage: getSafeErrorDetail(error),
      retryable: true
    }));
  }

  const planningValidation = validatePlanningSpecification(planningResponse);

  if (!planningValidation.ok) {
    return observeResult(errorResult({
      status: 502,
      provider: providerName,
      code: "AI_SCHEMA_MISMATCH",
      message: "The AI planning response did not match the required PlanningSpecification schema.",
      developerMessage: "Provider output failed planningSpecificationSchema validation.",
      retryable: true,
      issues: planningIssuesToValidationIssues(planningValidation.issues)
    }));
  }

  const planningSpecification = normalizePlanningSpecification(planningValidation.data);

  if (planningSpecification.unsupportedRequests.length > 0) {
    const unsupportedWarnings = uniqueWarnings([
      ...planningSpecification.warnings,
      ...planningSpecification.unsupportedRequests.map((request) => request.message)
    ]);

    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "AI_UNSUPPORTED_REQUEST",
      message: userFriendlyUnsupportedPromptMessage(unsupportedWarnings),
      developerMessage: "PlanningSpecification recorded one or more unsupported requests.",
      retryable: false,
      warnings: unsupportedWarnings,
      aiStatus: "unsupported"
    }));
  }

  if (planningSpecification.clarificationQuestions.length > 0) {
    const clarificationMessage = planningSpecification.clarificationQuestions
      .map((question) => question.question)
      .join(" ");

    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "AI_NEEDS_CLARIFICATION",
      message: clarificationMessage || "More detail is needed to generate a plan.",
      developerMessage: "PlanningSpecification requires clarification before draft mapping.",
      retryable: true,
      warnings: planningSpecification.warnings,
      aiStatus: "needs_clarification"
    }));
  }

  const resolutionResult = resolvePlanningConstraints(planningSpecification);

  if (!resolutionResult.ok) {
    return observeResult(errorResult({
      status: 502,
      provider: providerName,
      code: "AI_SCHEMA_MISMATCH",
      message: "The planning specification could not be resolved into a deterministic room program.",
      developerMessage: resolutionResult.issues.join(" "),
      retryable: true,
      warnings: resolutionResult.warnings
    }));
  }

  const resolvedPlanning = resolutionResult.data;
  const planningMetadata = createPlanningMetadata(resolvedPlanning);
  const clarificationItem = resolvedPlanning.unresolvedItems.find(
    (item) => item.clarificationQuestion
  );

  if (
    resolvedPlanning.feasibility.rating === "low" ||
    clarificationItem
  ) {
    return observeResult(errorResult({
      status: 422,
      provider: providerName,
      code: "AI_NEEDS_CLARIFICATION",
      message:
        clarificationItem?.clarificationQuestion ??
        "The requested room program is too constrained. Clarify priorities, remove optional rooms, or increase the target area.",
      developerMessage:
        `Constraint resolution returned ${resolvedPlanning.feasibility.overallScore}/100 feasibility with ${resolvedPlanning.unresolvedItems.length} unresolved item(s).`,
      retryable: true,
      warnings: resolvedPlanning.warnings,
      aiStatus: "needs_clarification",
      planning: planningMetadata
    }));
  }

  const mappingResult = mapResolvedPlanningSpecificationToPlanDraft(
    resolvedPlanning
  );

  if (!mappingResult.ok) {
    return observeResult(errorResult({
      status: 502,
      provider: providerName,
      code: "AI_SCHEMA_MISMATCH",
      message: "The planning specification could not be converted into a semantic floor plan draft.",
      developerMessage: mappingResult.issues.join(" "),
      retryable: true,
      warnings: mappingResult.warnings
    }));
  }

  const aiResponse = promptToPlanAiResponseSchema.parse({
    schemaVersion: "plan-generation-response-v1",
    status: "ok",
    planDraft: mappingResult.draft,
    clarificationRequest: null,
    warnings: uniqueWarnings([
      ...resolvedPlanning.warnings,
      ...mappingResult.warnings
    ])
  });

  const identity = resolvePlanIdentity({
    providerName,
    prompt: requestParse.data.prompt
  });

  if (identity.kind === "unsupported") {
    return observeResult(errorResult({
      status: 500,
      provider: providerName,
      code: "MOCK_FIXTURE_NOT_FOUND",
      message: "The mock pipeline could not resolve a semantic floor plan draft.",
      developerMessage: "AI response was ok, but the deterministic classifier returned unsupported.",
      retryable: true,
      warnings: aiResponse.warnings
    }));
  }

  const optimizationResult = optimizeFloorPlanLayout({
    draft: mappingResult.draft,
    planning: resolvedPlanning,
    planId: identity.planId,
    projectId: identity.projectId,
    promptSummary: requestParse.data.prompt,
    createdBy: createdByForProvider(providerName),
    source: "prompt"
  });

  if (!optimizationResult.ok) {
    return observeResult(errorResult({
      status: 500,
      provider: providerName,
      code: "LAYOUT_OPTIMIZATION_FAILED",
      message: "The layout optimizer could not select a valid floor plan candidate.",
      developerMessage: optimizationResult.issues.map((issue) => issue.message).join(" "),
      retryable: true,
      issues: optimizationResult.issues,
      warnings: uniqueWarnings([...aiResponse.warnings, ...optimizationResult.warnings])
    }));
  }

  const floorPlanValidation = validateFloorPlan(optimizationResult.plan);

  if (!floorPlanValidation.ok) {
    return observeResult(errorResult({
      status: 500,
      provider: providerName,
      code: "LAYOUT_FAILED",
      message: "The selected layout candidate failed final floor plan validation.",
      developerMessage: "Optimized layout failed floorPlanSchema validation.",
      retryable: true,
      issues: floorPlanValidation.issues,
      warnings: uniqueWarnings([
        ...aiResponse.warnings,
        ...optimizationResult.warnings
      ])
    }));
  }

  const qualityReport = optimizationResult.quality;

  return observeResult({
    status: 200,
    body: {
      ok: true,
      code: "PLAN_GENERATED",
      provider: providerName,
      schemaVersion: aiResponse.schemaVersion,
      plan: floorPlanValidation.data,
      ai: aiResponse,
      validation: floorPlanValidation.summary,
      warnings: uniqueWarnings([
        ...aiResponse.warnings,
        ...identity.classificationWarnings,
        ...optimizationResult.warnings,
        ...(floorPlanValidation.data.layout.warnings ?? []),
        ...qualityReport.warnings.map((warning) => warning.message),
        ...floorPlanValidation.summary.issues.map((issue) => issue.message)
      ]),
      meta: {
        mock: providerName === "mock",
        promptClassification: identity.promptClassification,
        classificationReason: identity.classificationReason,
        layoutMode: "layout-engine-v1",
        providerMode,
        model,
        planning: planningMetadata,
        quality: qualityReport,
        optimization: optimizationResult.metadata
      }
    }
  });
}

function errorResult(input: {
  status: number;
  provider: GeneratePlanProviderName;
  code: GeneratePlanErrorCode;
  message: string;
  developerMessage: string;
  retryable: boolean;
  issues?: ValidationIssue[];
  warnings?: string[];
  aiStatus?: PromptToPlanAiResponse["status"];
  planning?: GeneratePlanPlanningMetadata;
}): GeneratePlanWorkflowResult {
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
      aiStatus: input.aiStatus,
      planning: input.planning
    }
  };
}

function createPlanningMetadata(
  resolution: ResolvedPlanningSpecification
): GeneratePlanPlanningMetadata {
  return {
    schemaVersion: resolution.schemaVersion,
    confidence: resolution.normalizedSpecification.confidenceScore,
    feasibilityScore: resolution.feasibility.overallScore,
    feasibilityRating: resolution.feasibility.rating,
    complexityScore: resolution.feasibility.complexityScore,
    warnings: resolution.warnings,
    conflicts: resolution.conflicts.map((conflict) => ({
      code: conflict.code,
      severity: conflict.severity,
      message: conflict.message
    })),
    compromises: resolution.compromises.map(
      (compromise) => compromise.description
    ),
    assumptions: resolution.assumptions,
    recommendations: resolution.recommendations.map(
      (recommendation) => recommendation.message
    ),
    clarificationRecommendations: uniqueWarnings([
      ...resolution.unresolvedItems.flatMap((item) =>
        item.clarificationQuestion ? [item.clarificationQuestion] : []
      ),
      ...resolution.recommendations
        .filter((recommendation) => recommendation.code.includes("clarify"))
        .map((recommendation) => recommendation.message)
    ])
  };
}

function uniqueWarnings(warnings: string[]) {
  return Array.from(new Set(warnings.filter((warning) => warning.trim().length > 0)));
}

function planningIssuesToValidationIssues(
  issues: PlanningValidationIssue[]
): ValidationIssue[] {
  return issues.map((issue, index) => ({
    id: `issue_planning_specification_${index + 1}`,
    severity: "critical",
    code: issue.code,
    message: issue.message,
    path: issue.path
  }));
}

function userFriendlyUnsupportedPromptMessage(warnings: string[]) {
  const firstWarning = warnings.find((warning) => warning.trim().length > 0);
  const suggestion = warnings.find((warning) => warning.includes("Try:"));
  const scopeReason = warnings.find((warning) => !warning.includes("Try:"));

  if (scopeReason && suggestion) {
    return `${scopeReason} ${suggestion}`;
  }

  return (
    firstWarning ??
    'This MVP supports simple one-floor 2D rectangular residential plans only. Try: "Create a simple 2+1 apartment with living room, kitchen, bathroom, and balcony."'
  );
}

function getSafeErrorDetail(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Provider threw an unknown error.";
}

function planIdForClassification(fixtureKey: MockPromptFixtureKey) {
  if (fixtureKey === "1plus1") return "plan_simple_1plus1";
  if (fixtureKey === "2plus1" || fixtureKey === "fallback_generic") return "plan_2plus1";
  return "plan_3plus1";
}

function projectIdForClassification(fixtureKey: MockPromptFixtureKey) {
  if (fixtureKey === "1plus1") return "project_fixture_1plus1";
  if (fixtureKey === "2plus1" || fixtureKey === "fallback_generic") return "project_fixture_2plus1";
  return "project_fixture_3plus1";
}

function resolvePlanIdentity(input: {
  providerName: GeneratePlanProviderName;
  prompt: string;
}):
  | {
      kind: "ready";
      planId: string;
      projectId: string;
      promptClassification: string;
      classificationReason: string;
      classificationWarnings: string[];
    }
  | {
      kind: "unsupported";
    } {
  if (input.providerName === "mock") {
    const classification = classifyMockPrompt(input.prompt);

    if (classification.kind !== "fixture") {
      return {
        kind: "unsupported"
      };
    }

    return {
      kind: "ready",
      planId: planIdForClassification(classification.fixtureKey),
      projectId: projectIdForClassification(classification.fixtureKey),
      promptClassification: classification.fixtureKey,
      classificationReason: classification.reason,
      classificationWarnings: classification.warnings
    };
  }

  const promptHash = stableHash(input.prompt);

  return {
    kind: "ready",
    planId: `plan_${providerSlug(input.providerName)}_${promptHash}`,
    projectId: `project_${providerSlug(input.providerName)}_${promptHash}`,
    promptClassification: `${input.providerName}_structured_output`,
    classificationReason:
      `${providerDisplayName(input.providerName)} structured output produced a validated semantic plan draft.`,
    classificationWarnings: []
  };
}

function providerModeForName(providerName: GeneratePlanProviderName) {
  if (providerName === "mock") return "mock_default";
  if (providerName === "openai-compatible-local") return "openai_compatible_local";
  return providerName;
}

function createdByForProvider(providerName: GeneratePlanProviderName) {
  return providerName === "mock" ? "mock" : "ai";
}

function providerSlug(providerName: GeneratePlanProviderName) {
  return providerName.replace(/[^a-z0-9]+/g, "_");
}

function providerDisplayName(providerName: GeneratePlanProviderName) {
  if (providerName === "ollama") return "Ollama";
  if (providerName === "lmstudio") return "LM Studio";
  if (providerName === "openai-compatible-local") return "OpenAI-compatible local";
  if (providerName === "openai") return "OpenAI";
  return "Mock";
}

function stableHash(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return Math.abs(hash >>> 0).toString(36);
}
