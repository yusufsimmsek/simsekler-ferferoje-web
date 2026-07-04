import { z } from "zod";
import { floorPlanSchema } from "./floor-plan.schema";

const commonExportSettingsSchema = z
  .object({
    includeRoomLabels: z.boolean(),
    includeDimensions: z.boolean(),
    includeDisclaimer: z.literal(true)
  })
  .strict();

export const pngExportRequestSchema = z
  .object({
    schemaVersion: z.literal("export-request-v1"),
    format: z.literal("png"),
    plan: floorPlanSchema,
    settings: commonExportSettingsSchema
      .extend({
        resolution: z.enum(["standard", "high"])
      })
      .strict()
  })
  .strict();

export const pdfExportRequestSchema = z
  .object({
    schemaVersion: z.literal("export-request-v1"),
    format: z.literal("pdf"),
    plan: floorPlanSchema,
    settings: commonExportSettingsSchema
      .extend({
        pageSize: z.literal("a4"),
        orientation: z.literal("landscape"),
        includeRoomSchedule: z.boolean(),
        includeWarnings: z.boolean()
      })
      .strict()
  })
  .strict();

export const exportRequestSchema = z.discriminatedUnion("format", [
  pngExportRequestSchema,
  pdfExportRequestSchema
]);

export type PngExportRequest = z.infer<typeof pngExportRequestSchema>;
export type PdfExportRequest = z.infer<typeof pdfExportRequestSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
