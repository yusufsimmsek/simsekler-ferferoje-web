import type { ZodError } from "zod";
import type { FloorPlan, ValidationIssue, ValidationSummary } from "@/lib/floor-plan/types";
import { validateFloorPlan, zodErrorToValidationIssues } from "@/lib/floor-plan/validation";
import type { RoomSummaryItem, ExportFailure, ExportFormat } from "./types";

export type PublicExportFailure = Omit<ExportFailure, "developerMessage"> & {
  requestId: string;
};

export function validateExportPlan(plan: FloorPlan): ExportPlanValidationResult {
  const validation = validateFloorPlan(plan);

  if (!validation.ok) {
    return {
      ok: false,
      failure: exportFailure({
        code: "EXPORT_INVALID_PLAN",
        format: "unknown",
        message: "Export is blocked because the floor plan failed validation.",
        developerMessage: "FloorPlan failed validateFloorPlan before export rendering.",
        retryable: false,
        issues: validation.issues,
        warnings: []
      })
    };
  }

  if (validation.summary.status === "invalid") {
    return {
      ok: false,
      failure: exportFailure({
        code: "EXPORT_INVALID_PLAN",
        format: "unknown",
        message: "Export is blocked because the floor plan has critical validation issues.",
        developerMessage: "FloorPlan validation summary status is invalid.",
        retryable: false,
        issues: validation.summary.issues,
        warnings: []
      })
    };
  }

  return {
    ok: true,
    plan: validation.data,
    validation: validation.summary,
    warnings: uniqueWarnings([
      ...(validation.data.layout.warnings ?? []),
      ...validation.summary.issues.map((issue) => issue.message)
    ])
  };
}

export type ExportPlanValidationResult =
  | {
      ok: true;
      plan: FloorPlan;
      validation: ValidationSummary;
      warnings: string[];
    }
  | {
      ok: false;
      failure: ExportFailure;
    };

export function requestValidationFailure(
  error: ZodError,
  format: ExportFormat | "unknown"
): ExportFailure {
  const issues = zodErrorToValidationIssues(error, "export-request");

  return exportFailure({
    code: "INVALID_EXPORT_REQUEST",
    format,
    message: "Export request does not match the required contract.",
    developerMessage: "Request failed export request schema validation.",
    retryable: true,
    issues,
    warnings: []
  });
}

export function exportFailure(input: {
  code: ExportFailure["code"];
  format: ExportFormat | "unknown";
  message: string;
  developerMessage: string;
  retryable: boolean;
  issues?: ValidationIssue[];
  warnings?: string[];
}): ExportFailure {
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
    ok: false,
    code: input.code,
    format: input.format,
    message: input.message,
    developerMessage: input.developerMessage,
    retryable: input.retryable,
    validation: {
      status: "invalid",
      issues
    },
    issues,
    warnings: input.warnings ?? []
  };
}

export function toPublicExportFailure(
  failure: ExportFailure,
  requestId: string
): PublicExportFailure {
  const issues = failure.issues.map((issue) => ({
    ...issue,
    message: failure.message
  }));

  return {
    ok: false,
    code: failure.code,
    format: failure.format,
    message: failure.message,
    requestId,
    retryable: failure.retryable,
    validation: {
      ...failure.validation,
      issues
    },
    issues,
    warnings: failure.warnings
  };
}

export function createRoomSummary(plan: FloorPlan): RoomSummaryItem[] {
  return plan.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    type: room.type,
    area: room.area,
    dimensions: `${formatNumber(room.layout.width)} x ${formatNumber(room.layout.height)} m`
  }));
}

export function createExportFilename(plan: FloorPlan, extension: string) {
  return `${slugify(plan.title || plan.id)}-${plan.id}.${extension}`;
}

export function uniqueWarnings(warnings: string[]) {
  return Array.from(new Set(warnings.filter((warning) => warning.trim().length > 0)));
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "floor-plan";
}
