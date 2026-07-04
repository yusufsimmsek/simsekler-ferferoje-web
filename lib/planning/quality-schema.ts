import { z } from "zod";
import { idSchema } from "@/lib/schemas/floor-plan.schema";

export const layoutQualitySchemaVersion = "layout-quality-report-v1" as const;

export const qualityRatingSchema = z.enum([
  "excellent",
  "good",
  "fair",
  "poor"
]);

export const qualityMetricSchema = z
  .object({
    score: z.number().finite().min(0).max(100),
    weight: z.number().finite().min(0).max(1),
    rationale: z.array(z.string().trim().min(3).max(400)).min(1).max(12)
  })
  .strict();

export const relationshipConstraintResultSchema = z
  .object({
    relationshipId: idSchema,
    ruleId: idSchema,
    fromRoomId: idSchema,
    toRoomId: idSchema,
    expectedRelationship: z.enum([
      "adjacent",
      "near",
      "connected",
      "separate",
      "avoid"
    ]),
    actualRelationship: z.enum([
      "connected",
      "adjacent",
      "near",
      "separated",
      "missing_room"
    ]),
    priority: z.enum(["required", "preferred", "avoid"]),
    status: z.enum(["satisfied", "partial", "failed"]),
    score: z.number().finite().min(0).max(100),
    evidence: z.string().trim().min(3).max(400)
  })
  .strict();

export const layoutQualityWarningSchema = z
  .object({
    id: idSchema,
    code: z.enum([
      "balcony_isolated",
      "office_not_quiet",
      "excessive_circulation",
      "bathroom_access_poor",
      "bedroom_privacy_low",
      "daylight_opportunity_missing",
      "awkward_tiny_room",
      "poor_room_balance",
      "layout_not_compact",
      "relationship_failed",
      "geometry_overlap",
      "room_outside_bounds",
      "accessibility_constrained"
    ]),
    severity: z.enum(["info", "warning", "critical"]),
    message: z.string().trim().min(5).max(400),
    roomIds: z.array(idSchema).max(12)
  })
  .strict();

export const layoutQualityRecommendationSchema = z
  .object({
    id: idSchema,
    code: z.enum([
      "move_balcony_to_living",
      "separate_office_from_public_zone",
      "reduce_hallway_area",
      "improve_bathroom_access",
      "increase_bedroom_privacy",
      "add_daylight_opening",
      "enlarge_tiny_room",
      "rebalance_room_areas",
      "compact_layout",
      "enlarge_kitchen",
      "combine_rooms",
      "increase_target_area",
      "review_failed_relationship"
    ]),
    priority: z.enum(["low", "medium", "high"]),
    message: z.string().trim().min(5).max(400),
    roomIds: z.array(idSchema).max(12)
  })
  .strict();

export const layoutQualityReportSchema = z
  .object({
    schemaVersion: z.literal(layoutQualitySchemaVersion),
    overallScore: z.number().finite().min(0).max(100),
    rating: qualityRatingSchema,
    relationshipSatisfactionScore: z.number().finite().min(0).max(100),
    circulationScore: z.number().finite().min(0).max(100),
    privacyScore: z.number().finite().min(0).max(100),
    daylightScore: z.number().finite().min(0).max(100),
    accessibilityScore: z.number().finite().min(0).max(100),
    efficiencyScore: z.number().finite().min(0).max(100),
    adjacencyScore: z.number().finite().min(0).max(100),
    geometryScore: z.number().finite().min(0).max(100),
    roomBalanceScore: z.number().finite().min(0).max(100),
    metricDetails: z
      .object({
        relationshipSatisfaction: qualityMetricSchema,
        circulation: qualityMetricSchema,
        privacy: qualityMetricSchema,
        daylight: qualityMetricSchema,
        accessibility: qualityMetricSchema,
        efficiency: qualityMetricSchema,
        adjacency: qualityMetricSchema,
        geometry: qualityMetricSchema,
        roomBalance: qualityMetricSchema
      })
      .strict(),
    warnings: z.array(layoutQualityWarningSchema).max(60),
    recommendations: z.array(layoutQualityRecommendationSchema).max(60),
    failedConstraints: z.array(relationshipConstraintResultSchema).max(40),
    satisfiedConstraints: z.array(relationshipConstraintResultSchema).max(40),
    metadata: z
      .object({
        analyzer: z.literal("deterministic-layout-quality-analyzer-v1"),
        relationshipScorer: z.literal("relationship-satisfaction-v1"),
        inputPlanSchemaVersion: z.literal("floor-plan-v1"),
        inputPlanningSchemaVersion: z.literal(
          "resolved-planning-specification-v1"
        ),
        deterministic: z.literal(true)
      })
      .strict()
  })
  .strict()
  .superRefine((report, ctx) => {
    const detailPairs = [
      [
        report.relationshipSatisfactionScore,
        report.metricDetails.relationshipSatisfaction.score,
        "relationshipSatisfactionScore"
      ],
      [report.circulationScore, report.metricDetails.circulation.score, "circulationScore"],
      [report.privacyScore, report.metricDetails.privacy.score, "privacyScore"],
      [report.daylightScore, report.metricDetails.daylight.score, "daylightScore"],
      [report.accessibilityScore, report.metricDetails.accessibility.score, "accessibilityScore"],
      [report.efficiencyScore, report.metricDetails.efficiency.score, "efficiencyScore"],
      [report.adjacencyScore, report.metricDetails.adjacency.score, "adjacencyScore"],
      [report.geometryScore, report.metricDetails.geometry.score, "geometryScore"],
      [report.roomBalanceScore, report.metricDetails.roomBalance.score, "roomBalanceScore"]
    ] as const;

    detailPairs.forEach(([topLevel, detail, path]) => {
      if (Math.abs(topLevel - detail) > 0.01) {
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: `${path} must match its metricDetails score.`
        });
      }
    });
  });

export type LayoutQualityReportSchema = z.infer<
  typeof layoutQualityReportSchema
>;
