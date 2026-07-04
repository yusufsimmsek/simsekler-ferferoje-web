import type { ValidationIssue, ValidationSummary } from "@/lib/floor-plan/types";
import {
  createApiRequestId,
  jsonRouteMaxBodyBytes,
  readJsonRequest,
  type JsonRequestResult,
  type PublicApiErrorBody
} from "@/lib/api/json-route-guard";

export { createApiRequestId } from "@/lib/api/json-route-guard";

export const aiPlanRouteMaxBodyBytes = jsonRouteMaxBodyBytes;

export type PublicAiPlanErrorBody = PublicApiErrorBody & {
  aiStatus?: string;
};

export type AiPlanJsonRequestResult = JsonRequestResult;

type AiWorkflowErrorBody = {
  ok: false;
  code: string;
  message: string;
  developerMessage?: string;
  retryable: boolean;
  validation: ValidationSummary;
  issues: ValidationIssue[];
  warnings: string[];
  aiStatus?: string;
};

export async function readAiPlanJsonRequest(
  request: Request,
  options: {
    requestId?: string;
    maxBytes?: number;
  } = {}
): Promise<AiPlanJsonRequestResult> {
  return readJsonRequest(request, options);
}

export function toPublicAiPlanErrorBody(
  body: AiWorkflowErrorBody,
  requestId: string = createApiRequestId()
): PublicAiPlanErrorBody {
  const issues = sanitizeIssues(body.issues, body);

  return {
    ok: false,
    code: body.code,
    message: body.message,
    requestId,
    retryable: body.retryable,
    validation: {
      ...body.validation,
      issues
    },
    issues,
    warnings: body.warnings,
    aiStatus: body.aiStatus
  };
}

function sanitizeIssues(
  issues: ValidationIssue[],
  body: AiWorkflowErrorBody
): ValidationIssue[] {
  if (issues.length === 0) {
    return [
      {
        id: `issue_${body.code.toLowerCase()}`,
        severity: "critical",
        code: body.code,
        message: body.message
      }
    ];
  }

  return issues.map((issue) => ({
    ...issue,
    message: body.message
  }));
}
