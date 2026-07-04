import { z } from "zod";
import {
  layoutQualityRecommendationSchema,
  layoutQualityWarningSchema,
  qualityRatingSchema
} from "./quality-schema";

export const editQualityDeltaSchemaVersion = "edit-quality-delta-v1" as const;

export const editQualityMetricNameSchema = z.enum([
  "relationshipSatisfaction",
  "circulation",
  "privacy",
  "daylight",
  "accessibility",
  "efficiency",
  "adjacency",
  "geometry",
  "roomBalance"
]);

export const editQualityMetricDeltaSchema = z
  .object({
    metric: editQualityMetricNameSchema,
    label: z.string().trim().min(3).max(80),
    beforeScore: z.number().finite().min(0).max(100),
    afterScore: z.number().finite().min(0).max(100),
    delta: z.number().finite().min(-100).max(100)
  })
  .strict();

export const editQualityDeltaReportSchema = z
  .object({
    schemaVersion: z.literal(editQualityDeltaSchemaVersion),
    beforeOverallScore: z.number().finite().min(0).max(100),
    afterOverallScore: z.number().finite().min(0).max(100),
    scoreDelta: z.number().finite().min(-100).max(100),
    ratingBefore: qualityRatingSchema,
    ratingAfter: qualityRatingSchema,
    improvedMetrics: z.array(editQualityMetricDeltaSchema).max(9),
    worsenedMetrics: z.array(editQualityMetricDeltaSchema).max(9),
    unchangedMetrics: z.array(editQualityMetricDeltaSchema).max(9),
    relationshipSatisfactionDelta: z.number().finite().min(-100).max(100),
    circulationDelta: z.number().finite().min(-100).max(100),
    privacyDelta: z.number().finite().min(-100).max(100),
    daylightDelta: z.number().finite().min(-100).max(100),
    roomBalanceDelta: z.number().finite().min(-100).max(100),
    warningsAdded: z.array(layoutQualityWarningSchema).max(60),
    warningsResolved: z.array(layoutQualityWarningSchema).max(60),
    recommendationsAdded: z.array(layoutQualityRecommendationSchema).max(60),
    recommendationsResolved: z.array(layoutQualityRecommendationSchema).max(60),
    summary: z.string().trim().min(10).max(500)
  })
  .strict()
  .superRefine((report, ctx) => {
    if (Math.abs(report.scoreDelta - (report.afterOverallScore - report.beforeOverallScore)) > 0.01) {
      ctx.addIssue({
        code: "custom",
        path: ["scoreDelta"],
        message: "scoreDelta must equal afterOverallScore minus beforeOverallScore."
      });
    }

    const metricNames = new Set([
      ...report.improvedMetrics,
      ...report.worsenedMetrics,
      ...report.unchangedMetrics
    ].map((metric) => metric.metric));

    if (metricNames.size !== 9) {
      ctx.addIssue({
        code: "custom",
        path: ["improvedMetrics"],
        message: "Every tracked quality metric must appear exactly once across improved, worsened, and unchanged metrics."
      });
    }
  });

export type EditQualityDeltaReportSchema = z.infer<
  typeof editQualityDeltaReportSchema
>;
export type EditQualityMetricDeltaSchema = z.infer<
  typeof editQualityMetricDeltaSchema
>;
