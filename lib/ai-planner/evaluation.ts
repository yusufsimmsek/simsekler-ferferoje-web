import {
  chatEditEvaluationFixtures,
  planningEvaluationFixtures,
  promptToPlanEvaluationFixtures,
  type ChatEditEvaluationFixture,
  type PlanningEvaluationFixture,
  type PromptEvaluationFixture
} from "./evaluation-fixtures";
import {
  runEditPlanWorkflow,
  type EditPlanWorkflowResult
} from "./edit-plan-workflow";
import {
  runGeneratePlanWorkflow,
  type GeneratePlanWorkflowResult
} from "./generate-plan-workflow";
import {
  createAiFailureSnapshot,
  createAiProviderMetadata,
  type AiFailureSnapshot,
  type AiProviderMetadata,
  type AiRequestType
} from "./observability";
import type { FloorPlan } from "@/lib/floor-plan/types";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";
import { twoPlusOneFixture } from "@/lib/floor-plan/fixtures";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import { mockPlanningProvider, validatePlanningSpecification } from "@/lib/planning";
import {
  planningConstraintFixtures,
  resolvePlanningConstraints,
  type PlanningConstraintFixture
} from "@/lib/planning";

export type AiEvaluationKind = "prompt_to_plan" | "chat_edit";

export type AiEvaluationResult = {
  id: string;
  title: string;
  kind: AiEvaluationKind;
  passed: boolean;
  expected: {
    ok: boolean;
    code: string;
  };
  actual: {
    ok: boolean;
    status: number;
    code: string;
    validationStatus: string;
    planId?: string;
    promptClassification?: string;
    actionTypes?: string[];
  };
  metadata: AiProviderMetadata;
  failure?: AiFailureSnapshot;
};

export type AiEvaluationReport = {
  schemaVersion: "ai-evaluation-report-v1";
  provider: "mock";
  results: AiEvaluationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

export type PlanningEvaluationResult = {
  id: string;
  title: string;
  passed: boolean;
  expectedOutcome: PlanningEvaluationFixture["expected"]["outcome"];
  actualOutcome: "ready" | "clarification" | "unsupported" | "invalid";
  issues: string[];
};

export type PlanningConstraintEvaluationResult = {
  id: string;
  title: string;
  passed: boolean;
  score: number | null;
  rating: string | null;
  conflicts: string[];
  compromises: string[];
  issues: string[];
};

const promptPreferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

export async function runPromptToPlanEvaluationFixture(
  fixture: PromptEvaluationFixture
): Promise<AiEvaluationResult> {
  const result = await runGeneratePlanWorkflow({
    schemaVersion: "plan-generation-request-v1",
    prompt: fixture.prompt,
    preferences: promptPreferences
  });
  const actual = actualFromGenerateResult(result);
  const metadata = metadataForResult({
    requestType: "prompt_to_plan",
    contractSchemaVersion: "plan-generation-response-v1",
    validationStatus: result.body.validation.status,
    errorCode: result.body.ok ? null : result.body.code,
    prompt: fixture.prompt
  });
  const floorPlanIsValid = result.body.ok ? validateFloorPlan(result.body.plan).ok : true;
  const passed =
    fixture.expected.ok === actual.ok &&
    fixture.expected.code === actual.code &&
    (fixture.expected.planId === undefined || fixture.expected.planId === actual.planId) &&
    (fixture.expected.promptClassification === undefined ||
      fixture.expected.promptClassification === actual.promptClassification) &&
    floorPlanIsValid;

  return withFailureSnapshot({
    fixture,
    kind: "prompt_to_plan",
    passed,
    result,
    actual,
    metadata,
    prompt: fixture.prompt
  });
}

export async function runChatEditEvaluationFixture(
  fixture: ChatEditEvaluationFixture
): Promise<AiEvaluationResult> {
  const currentPlan = basePlanForFixture(fixture);
  const beforeSnapshot = JSON.stringify(currentPlan);
  const result = await runEditPlanWorkflow({
    schemaVersion: "plan-edit-request-v1",
    message: fixture.message,
    currentPlan
  });
  const actual = actualFromEditResult(result);
  const metadata = metadataForResult({
    requestType: "chat_edit",
    contractSchemaVersion: "chat-edit-response-v1",
    validationStatus: result.body.validation.status,
    errorCode: result.body.ok ? null : result.body.code,
    prompt: fixture.message
  });
  const floorPlanIsValid = result.body.ok ? validateFloorPlan(result.body.plan).ok : true;
  const unsupportedKeptPlanUnchanged = result.body.ok || JSON.stringify(currentPlan) === beforeSnapshot;
  const passed =
    fixture.expected.ok === actual.ok &&
    fixture.expected.code === actual.code &&
    (fixture.expected.actionType === undefined ||
      actual.actionTypes?.includes(fixture.expected.actionType) === true) &&
    floorPlanIsValid &&
    unsupportedKeptPlanUnchanged;

  return withFailureSnapshot({
    fixture,
    kind: "chat_edit",
    passed,
    result,
    actual,
    metadata,
    prompt: fixture.message
  });
}

export async function runAiEvaluationFixtures(): Promise<AiEvaluationReport> {
  const promptResults = await Promise.all(
    promptToPlanEvaluationFixtures.map((fixture) => runPromptToPlanEvaluationFixture(fixture))
  );
  const editResults = await Promise.all(
    chatEditEvaluationFixtures.map((fixture) => runChatEditEvaluationFixture(fixture))
  );
  const results = [...promptResults, ...editResults];
  const passed = results.filter((result) => result.passed).length;

  return {
    schemaVersion: "ai-evaluation-report-v1",
    provider: "mock",
    results,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed
    }
  };
}

export async function runPlanningEvaluationFixture(
  fixture: PlanningEvaluationFixture
): Promise<PlanningEvaluationResult> {
  const specification = await mockPlanningProvider.createPlanningSpecification({
    prompt: fixture.prompt,
    preferences: promptPreferences
  });
  const validation = validatePlanningSpecification(specification);

  if (!validation.ok) {
    return {
      id: fixture.id,
      title: fixture.title,
      passed: false,
      expectedOutcome: fixture.expected.outcome,
      actualOutcome: "invalid",
      issues: validation.issues.map((issue) => issue.message)
    };
  }

  const actualOutcome = validation.data.unsupportedRequests.length > 0
    ? "unsupported" as const
    : validation.data.clarificationQuestions.length > 0
      ? "clarification" as const
      : "ready" as const;
  const expected = fixture.expected;
  const passed = actualOutcome === expected.outcome
    && (expected.buildingType === undefined || validation.data.buildingType === expected.buildingType)
    && (expected.bedrooms === undefined || validation.data.requestedRooms.bedrooms === expected.bedrooms)
    && (expected.openKitchen === undefined || validation.data.requestedRooms.openKitchen === expected.openKitchen)
    && (expected.office === undefined || validation.data.requestedRooms.office === expected.office)
    && (expected.daylightPriority === undefined || validation.data.priorities.daylight === expected.daylightPriority)
    && (expected.accessibilityNeed === undefined || validation.data.household.accessibilityNeeds.includes(expected.accessibilityNeed))
    && (expected.pets === undefined || validation.data.household.pets === expected.pets);

  return {
    id: fixture.id,
    title: fixture.title,
    passed,
    expectedOutcome: expected.outcome,
    actualOutcome,
    issues: passed ? [] : ["Planning fixture output did not match its expected normalized intent."]
  };
}

export async function runPlanningEvaluationFixtures() {
  return Promise.all(
    planningEvaluationFixtures.map((fixture) => runPlanningEvaluationFixture(fixture))
  );
}

export function runPlanningConstraintEvaluationFixture(
  fixture: PlanningConstraintFixture
): PlanningConstraintEvaluationResult {
  const result = resolvePlanningConstraints(fixture.specification);

  if (!result.ok) {
    return {
      id: fixture.id,
      title: fixture.title,
      passed: false,
      score: null,
      rating: null,
      conflicts: [],
      compromises: [],
      issues: result.issues
    };
  }

  const conflictCodes = result.data.conflicts.map((conflict) => conflict.code);
  const compromiseCodes = result.data.compromises.map(
    (compromise) => compromise.code
  );
  const expected = fixture.expected;
  const passed =
    (expected.minimumScore === undefined ||
      result.data.feasibility.overallScore >= expected.minimumScore) &&
    (expected.maximumRating === undefined ||
      ratingOrder(result.data.feasibility.rating) <=
        ratingOrder(expected.maximumRating)) &&
    (expected.conflictCode === undefined ||
      conflictCodes.includes(expected.conflictCode)) &&
    (expected.compromiseCode === undefined ||
      compromiseCodes.includes(expected.compromiseCode));

  return {
    id: fixture.id,
    title: fixture.title,
    passed,
    score: result.data.feasibility.overallScore,
    rating: result.data.feasibility.rating,
    conflicts: conflictCodes,
    compromises: compromiseCodes,
    issues: passed
      ? []
      : ["Constraint evaluation output did not match its deterministic expectation."]
  };
}

export function runPlanningConstraintEvaluationFixtures() {
  return planningConstraintFixtures.map((fixture) =>
    runPlanningConstraintEvaluationFixture(fixture)
  );
}

function metadataForResult(input: {
  requestType: AiRequestType;
  contractSchemaVersion: string;
  validationStatus: AiProviderMetadata["validationStatus"];
  errorCode: string | null;
  prompt: string;
}) {
  return createAiProviderMetadata({
    provider: "mock",
    model: null,
    mode: "mock_default",
    requestType: input.requestType,
    latencyMs: null,
    contractSchemaVersion: input.contractSchemaVersion,
    validationStatus: input.validationStatus,
    errorCode: input.errorCode,
    prompt: input.prompt,
    includePromptPreview: true
  });
}

function actualFromGenerateResult(result: GeneratePlanWorkflowResult): AiEvaluationResult["actual"] {
  if (result.body.ok) {
    return {
      ok: true,
      status: result.status,
      code: result.body.code,
      validationStatus: result.body.validation.status,
      planId: result.body.plan.id,
      promptClassification: result.body.meta.promptClassification
    };
  }

  return {
    ok: false,
    status: result.status,
    code: result.body.code,
    validationStatus: result.body.validation.status
  };
}

function actualFromEditResult(result: EditPlanWorkflowResult): AiEvaluationResult["actual"] {
  if (result.body.ok) {
    return {
      ok: true,
      status: result.status,
      code: result.body.code,
      validationStatus: result.body.validation.status,
      planId: result.body.plan.id,
      actionTypes: result.body.actions.map((action) => action.type)
    };
  }

  return {
    ok: false,
    status: result.status,
    code: result.body.code,
    validationStatus: result.body.validation.status
  };
}

function withFailureSnapshot(input: {
  fixture: PromptEvaluationFixture | ChatEditEvaluationFixture;
  kind: AiEvaluationKind;
  passed: boolean;
  result: GeneratePlanWorkflowResult | EditPlanWorkflowResult;
  actual: AiEvaluationResult["actual"];
  metadata: AiProviderMetadata;
  prompt: string;
}): AiEvaluationResult {
  const expected = {
    ok: input.fixture.expected.ok,
    code: input.fixture.expected.code
  };

  return {
    id: input.fixture.id,
    title: input.fixture.title,
    kind: input.kind,
    passed: input.passed,
    expected,
    actual: input.actual,
    metadata: input.metadata,
    ...(!input.passed
      ? {
          failure: createAiFailureSnapshot({
            metadata: input.metadata,
            prompt: input.prompt,
            issues: input.result.body.validation.issues,
            warnings: input.result.body.warnings
          })
        }
      : {})
  };
}

function basePlanForFixture(fixture: ChatEditEvaluationFixture): FloorPlan {
  if (fixture.basePlan === "two_plus_one") {
    return structuredClone(twoPlusOneFixture);
  }

  return structuredClone(mockFloorPlan);
}

function ratingOrder(
  rating: "highly_feasible" | "feasible" | "constrained" | "low"
) {
  if (rating === "low") return 0;
  if (rating === "constrained") return 1;
  if (rating === "feasible") return 2;
  return 3;
}
