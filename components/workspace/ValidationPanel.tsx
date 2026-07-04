import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ValidationIssue } from "@/lib/floor-plan/types";
import { StatusChip } from "@/components/ui/StatusChip";

type ValidationPanelProps = {
  issues: ValidationIssue[];
  warnings?: string[];
};

export function ValidationPanel({ issues, warnings = [] }: ValidationPanelProps) {
  const uniqueWarnings = Array.from(new Set(warnings.filter(Boolean)));
  const hasWarnings = uniqueWarnings.length > 0 || issues.length > 0;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950">Plan validation</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Geometry and contract checks for the current plan.
          </p>
        </div>
        <StatusChip tone={hasWarnings ? "warning" : "success"}>
          {hasWarnings ? `${issues.length + uniqueWarnings.length} notices` : "Valid"}
        </StatusChip>
      </div>

      {!hasWarnings ? (
        <div className="flex items-start gap-2 border-l-2 border-green-500 bg-green-50 px-3 py-2 text-xs text-green-900">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          No validation issues in the current plan. Export is available.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {issues.map((issue) => (
            <div
              className={
                issue.severity === "critical"
                  ? "border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-900"
                  : "border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              }
              key={issue.id}
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                {issue.code}
              </div>
              <p className="mt-1 leading-5">{issue.message}</p>
            </div>
          ))}
          {uniqueWarnings.map((warning) => (
            <div
              className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
              key={warning}
            >
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
