import type { ZodError } from "zod";
import { planningSpecificationSchema } from "./planning-schema";
import type { PlanningSpecification } from "./planning-types";

export type PlanningValidationIssue = {
  code: string;
  message: string;
  path: Array<string | number>;
};

export type PlanningValidationResult =
  | {
      ok: true;
      data: PlanningSpecification;
      issues: [];
    }
  | {
      ok: false;
      data: null;
      issues: PlanningValidationIssue[];
    };

export function validatePlanningSpecification(input: unknown): PlanningValidationResult {
  const result = planningSpecificationSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      data: null,
      issues: planningZodIssues(result.error)
    };
  }

  return {
    ok: true,
    data: result.data,
    issues: []
  };
}

function planningZodIssues(error: ZodError): PlanningValidationIssue[] {
  return error.issues.map((issue) => ({
    code: issue.code.toUpperCase(),
    message: issue.message,
    path: issue.path.map((segment) => String(segment))
  }));
}
