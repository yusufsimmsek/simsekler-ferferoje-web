import { z } from "zod";
import {
  floorPlanSchema,
  idSchema,
  validationIssueSchema
} from "@/lib/schemas/floor-plan.schema";
import { layoutQualityReportSchema } from "./quality-schema";

export const layoutCandidateSchemaVersion = "layout-candidate-v1" as const;
export const layoutOptimizationReportSchemaVersion =
  "layout-optimization-report-v1" as const;

export const layoutCandidateStrategySchema = z.enum([
  "base_public_band",
  "private_zone_first",
  "wide_public_core",
  "service_core",
  "balcony_living_edge",
  "office_quiet_buffer"
]);

export const candidateVariationSchema = z
  .object({
    roomOrdering: z.string().trim().min(3).max(180),
    publicPrivateZoning: z.string().trim().min(3).max(180),
    kitchenPlacement: z.string().trim().min(3).max(180),
    balconyPlacement: z.string().trim().min(3).max(180),
    officePlacement: z.string().trim().min(3).max(180),
    hallwayStrategy: z.string().trim().min(3).max(180),
    circulationStrategy: z.string().trim().min(3).max(180)
  })
  .strict();

const candidateMetadataSchema = z
  .object({
    generatedBy: z.literal("deterministic-layout-candidate-generator-v1"),
    layoutEngine: z.literal("rectangular-grid-v1"),
    deterministic: z.literal(true),
    order: z.number().int().min(1).max(12)
  })
  .strict();

export const layoutCandidateSchema = z
  .object({
    schemaVersion: z.literal(layoutCandidateSchemaVersion),
    id: idSchema,
    label: z.string().trim().min(3).max(80),
    strategy: layoutCandidateStrategySchema,
    variation: candidateVariationSchema,
    plan: floorPlanSchema,
    warnings: z.array(z.string().trim().min(1).max(400)).max(80),
    metadata: candidateMetadataSchema
  })
  .strict();

export const rejectedLayoutCandidateSchema = z
  .object({
    id: idSchema,
    label: z.string().trim().min(3).max(80),
    strategy: layoutCandidateStrategySchema,
    reason: z.string().trim().min(3).max(400),
    issues: z.array(validationIssueSchema).min(1).max(80)
  })
  .strict();

export const evaluatedLayoutCandidateSchema = layoutCandidateSchema
  .extend({
    quality: layoutQualityReportSchema
  })
  .strict();

export const layoutCandidateScoreRowSchema = z
  .object({
    rank: z.number().int().min(1),
    candidateId: idSchema,
    label: z.string().trim().min(3).max(80),
    strategy: layoutCandidateStrategySchema,
    overallScore: z.number().finite().min(0).max(100),
    relationshipSatisfactionScore: z.number().finite().min(0).max(100),
    circulationScore: z.number().finite().min(0).max(100),
    roomBalanceScore: z.number().finite().min(0).max(100),
    geometryScore: z.number().finite().min(0).max(100),
    warningCount: z.number().int().nonnegative(),
    selected: z.boolean()
  })
  .strict();

export const selectedLayoutCandidateSchema = z
  .object({
    id: idSchema,
    label: z.string().trim().min(3).max(80),
    strategy: layoutCandidateStrategySchema,
    overallScore: z.number().finite().min(0).max(100),
    relationshipSatisfactionScore: z.number().finite().min(0).max(100),
    circulationScore: z.number().finite().min(0).max(100),
    roomBalanceScore: z.number().finite().min(0).max(100),
    selectionReason: z.string().trim().min(5).max(400)
  })
  .strict();

export const layoutOptimizationReportSchema = z
  .object({
    schemaVersion: z.literal(layoutOptimizationReportSchemaVersion),
    candidateCount: z.number().int().min(0).max(12),
    validCandidateCount: z.number().int().min(0).max(12),
    rejectedCandidateCount: z.number().int().min(0).max(12),
    bestScore: z.number().finite().min(0).max(100),
    selectedCandidate: selectedLayoutCandidateSchema,
    rejectedCandidates: z.array(rejectedLayoutCandidateSchema).max(12),
    scoreComparisonTable: z.array(layoutCandidateScoreRowSchema).min(1).max(12),
    metadata: z
      .object({
        optimizer: z.literal("deterministic-layout-optimizer-v1"),
        candidateGenerator: z.literal(
          "deterministic-layout-candidate-generator-v1"
        ),
        qualityAnalyzer: z.literal("deterministic-layout-quality-analyzer-v1"),
        deterministic: z.literal(true),
        tieBreakers: z.array(z.string().trim().min(3).max(80)).min(4).max(6)
      })
      .strict()
  })
  .strict()
  .superRefine((report, ctx) => {
    if (report.validCandidateCount + report.rejectedCandidateCount !== report.candidateCount) {
      ctx.addIssue({
        code: "custom",
        path: ["candidateCount"],
        message: "candidateCount must equal validCandidateCount plus rejectedCandidateCount."
      });
    }

    const selectedRows = report.scoreComparisonTable.filter((row) => row.selected);

    if (selectedRows.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["scoreComparisonTable"],
        message: "Exactly one score comparison row must be selected."
      });
    }

    if (selectedRows[0] && selectedRows[0].candidateId !== report.selectedCandidate.id) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedCandidate", "id"],
        message: "selectedCandidate must match the selected score row."
      });
    }
  });

export type LayoutCandidateSchema = z.infer<typeof layoutCandidateSchema>;
export type EvaluatedLayoutCandidateSchema = z.infer<
  typeof evaluatedLayoutCandidateSchema
>;
export type RejectedLayoutCandidateSchema = z.infer<
  typeof rejectedLayoutCandidateSchema
>;
export type LayoutOptimizationReportSchema = z.infer<
  typeof layoutOptimizationReportSchema
>;
