import type { ZodError, ZodType } from "zod";
import {
  floorPlanSchema,
  type FloorPlan,
  type ValidationIssue,
  type ValidationSummary
} from "@/lib/schemas/floor-plan.schema";
import {
  chatEditResponseSchema,
  promptToPlanAiResponseSchema,
  type ChatEditResponse,
  type PromptToPlanAiResponse
} from "@/lib/schemas/ai-contracts.schema";

export type ContractValidationResult<T> =
  | {
      ok: true;
      data: T;
      summary: ValidationSummary;
    }
  | {
      ok: false;
      data: null;
      summary: ValidationSummary;
      issues: ValidationIssue[];
    };

export type FloorPlanValidationResult = ContractValidationResult<FloorPlan>;

export function validateWithSchema<T>(
  input: unknown,
  schema: ZodType<T>,
  source = "schema"
): ContractValidationResult<T> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const issues = zodErrorToValidationIssues(parsed.error, source);

    return {
      ok: false,
      data: null,
      issues,
      summary: {
        status: "invalid",
        issues
      }
    };
  }

  return {
    ok: true,
    data: parsed.data,
    summary: getValidationSummary(parsed.data)
  };
}

export function validateFloorPlan(input: unknown): FloorPlanValidationResult {
  return validateWithSchema(input, floorPlanSchema, "floor-plan");
}

export function validateFloorPlanPlaceholder(input: unknown): FloorPlanValidationResult {
  return validateFloorPlan(input);
}

export function validatePromptToPlanAiResponse(
  input: unknown
): ContractValidationResult<PromptToPlanAiResponse> {
  return validateWithSchema(input, promptToPlanAiResponseSchema, "prompt-to-plan-ai-response");
}

export function validateChatEditResponse(
  input: unknown
): ContractValidationResult<ChatEditResponse> {
  return validateWithSchema(input, chatEditResponseSchema, "chat-edit-response");
}

export function zodErrorToValidationIssues(error: ZodError, source = "schema") {
  return error.issues.map((issue, index): ValidationIssue => {
    const path = issue.path.map((segment) =>
      typeof segment === "symbol" ? String(segment) : segment
    );

    return {
      id: `issue_${source.replace(/[^a-z0-9_]/gi, "_").toLowerCase()}_${index + 1}`,
      severity: "critical",
      code: issue.code.toUpperCase(),
      message: issue.message,
      path
    };
  });
}

function getValidationSummary<T>(data: T): ValidationSummary {
  if (
    data &&
    typeof data === "object" &&
    "validation" in data &&
    data.validation &&
    typeof data.validation === "object" &&
    "status" in data.validation &&
    "issues" in data.validation
  ) {
    return data.validation as ValidationSummary;
  }

  return {
    status: "valid",
    issues: []
  };
}
