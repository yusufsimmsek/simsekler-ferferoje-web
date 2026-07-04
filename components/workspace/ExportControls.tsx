"use client";

import { useMemo, useState } from "react";
import { FileDown, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FloorPlan } from "@/lib/floor-plan/types";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import { exportPlanAsPdf, exportPlanAsPng } from "@/lib/export/client-export";

type ExportControlsProps = {
  plan: FloorPlan;
  compact?: boolean;
};

type ExportState =
  | {
      status: "idle";
      message: string | null;
      error: string | null;
    }
  | {
      status: "exporting_png" | "exporting_pdf";
      message: string | null;
      error: string | null;
    };

export function ExportControls({ plan, compact = false }: ExportControlsProps) {
  const [state, setState] = useState<ExportState>({
    status: "idle",
    message: null,
    error: null
  });
  const validation = useMemo(() => validateFloorPlan(plan), [plan]);
  const hasCriticalIssues =
    !validation.ok ||
    validation.summary.status === "invalid" ||
    validation.summary.issues.some((issue) => issue.severity === "critical");
  const disabled = hasCriticalIssues || state.status !== "idle";
  const disabledReason = hasCriticalIssues
    ? "Export is blocked until critical validation issues are resolved."
    : null;

  async function handleExport(format: "png" | "pdf") {
    setState({
      status: format === "png" ? "exporting_png" : "exporting_pdf",
      message: null,
      error: null
    });

    const result = format === "png" ? await exportPlanAsPng(plan) : await exportPlanAsPdf(plan);

    if (!result.ok) {
      setState({
        status: "idle",
        message: null,
        error: result.message
      });
      return;
    }

    setState({
      status: "idle",
      message: `${format.toUpperCase()} export ready: ${result.filename}`,
      error: null
    });
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          disabled={disabled}
          leftIcon={<FileImage className="h-4 w-4" />}
          onClick={() => void handleExport("png")}
          variant="secondary"
        >
          {state.status === "exporting_png" ? "PNG..." : "PNG"}
        </Button>
        <Button
          disabled={disabled}
          leftIcon={<FileText className="h-4 w-4" />}
          onClick={() => void handleExport("pdf")}
          variant="primary"
        >
          {state.status === "exporting_pdf" ? "PDF..." : "PDF"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={disabled}
          leftIcon={<FileImage className="h-4 w-4" />}
          onClick={() => void handleExport("png")}
          variant="secondary"
        >
          {state.status === "exporting_png" ? "Exporting..." : "Export PNG"}
        </Button>
        <Button
          disabled={disabled}
          leftIcon={<FileText className="h-4 w-4" />}
          onClick={() => void handleExport("pdf")}
          variant="primary"
        >
          {state.status === "exporting_pdf" ? "Exporting..." : "Export PDF"}
        </Button>
      </div>
      <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
        <FileDown className="mr-1 inline h-3.5 w-3.5" />
        Exports use the same validated render model as the editor and include the conceptual draft disclaimer.
      </p>
      {disabledReason ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {disabledReason}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700">
          {state.message}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
