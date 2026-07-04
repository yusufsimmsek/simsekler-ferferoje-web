import { pngExportRequestSchema } from "@/lib/schemas/export.schema";
import { createFloorPlanRenderModel } from "@/lib/render/render-model";
import { createFloorPlanSvgDocument } from "@/lib/render/export-renderer";
import type { PngExportResult } from "./types";
import {
  createExportFilename,
  createRoomSummary,
  requestValidationFailure,
  validateExportPlan
} from "./service";

export function createPngExport(input: unknown): PngExportResult {
  const request = pngExportRequestSchema.safeParse(input);

  if (!request.success) {
    return requestValidationFailure(request.error, "png");
  }

  const planValidation = validateExportPlan(request.data.plan);

  if (!planValidation.ok) {
    return {
      ...planValidation.failure,
      format: "png"
    };
  }

  const renderModel = createFloorPlanRenderModel(planValidation.plan, {
    includeGrid: true
  });
  const svg = createFloorPlanSvgDocument(renderModel, {
    includeRoomLabels: request.data.settings.includeRoomLabels,
    includeDimensions: request.data.settings.includeDimensions,
    includeDisclaimer: request.data.settings.includeDisclaimer
  });

  return {
    ok: true,
    code: "PNG_EXPORT_READY",
    format: "png",
    delivery: "client_png_from_svg",
    filename: createExportFilename(planValidation.plan, "png"),
    mimeType: "image/svg+xml",
    svg: svg.svg,
    width: request.data.settings.resolution === "high" ? svg.width * 2 : svg.width,
    height: request.data.settings.resolution === "high" ? svg.height * 2 : svg.height,
    disclaimer: planValidation.plan.metadata.disclaimer,
    validation: planValidation.validation,
    warnings: planValidation.warnings,
    roomSummary: createRoomSummary(planValidation.plan)
  };
}
