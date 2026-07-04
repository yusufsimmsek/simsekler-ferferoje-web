import { z } from "zod";
import { idSchema, roomTypeSchema } from "@/lib/schemas/floor-plan.schema";
import { planningSpecificationSchema } from "./planning-schema";

export const resolvedPlanningSchemaVersion =
  "resolved-planning-specification-v1" as const;

export const planningZoneSchema = z.enum([
  "public",
  "private",
  "service",
  "circulation",
  "outdoor"
]);

export const resolvedRoomProgramItemSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(100),
    type: roomTypeSchema,
    source: z.enum(["default", "requested", "required"]),
    priority: z.enum(["essential", "preferred", "optional"]),
    zone: planningZoneSchema,
    minimumArea: z.number().finite().positive().max(100),
    baseTargetArea: z.number().finite().positive().max(150),
    isWetArea: z.boolean(),
    isExteriorPreferred: z.boolean(),
    daylightPriority: z.enum(["required", "preferred", "not_required"]),
    quietPriority: z.enum(["high", "medium", "low"])
  })
  .strict()
  .superRefine((room, ctx) => {
    if (room.baseTargetArea < room.minimumArea) {
      ctx.addIssue({
        code: "custom",
        path: ["baseTargetArea"],
        message: "Resolved room baseTargetArea cannot be lower than minimumArea."
      });
    }
  });

export const mergedSpaceSchema = z
  .object({
    primaryRoomId: idSchema,
    mergedUse: z.string().trim().min(2).max(80),
    reason: z.string().trim().min(5).max(300)
  })
  .strict();

export const resolvedRoomProgramSchema = z
  .object({
    rooms: z.array(resolvedRoomProgramItemSchema).min(1).max(12),
    omittedRooms: z.array(z.string().trim().min(2).max(100)).max(20),
    mergedSpaces: z.array(mergedSpaceSchema).max(10),
    requestedRoomCount: z.number().int().min(1).max(40),
    resolvedRoomCount: z.number().int().min(1).max(12),
    targetArea: z.number().finite().min(18).max(500).nullable(),
    targetUsableArea: z.number().finite().min(12).max(450),
    estimatedMinimumArea: z.number().finite().positive().max(500),
    circulationAllowance: z.number().finite().min(0.05).max(0.3)
  })
  .strict()
  .superRefine((program, ctx) => {
    if (program.resolvedRoomCount !== program.rooms.length) {
      ctx.addIssue({
        code: "custom",
        path: ["resolvedRoomCount"],
        message: "resolvedRoomCount must equal the number of resolved rooms."
      });
    }

    const ids = new Set<string>();

    program.rooms.forEach((room, index) => {
      if (ids.has(room.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["rooms", index, "id"],
          message: `Duplicate resolved room id ${room.id}.`
        });
      }

      ids.add(room.id);
    });
  });

export const resolvedConstraintSchema = z
  .object({
    id: idSchema,
    ruleId: idSchema,
    kind: z.enum(["must", "should", "avoid", "never"]),
    statement: z.string().trim().min(3).max(300),
    source: z.enum(["system", "user", "inferred"]),
    status: z.enum(["applied", "compromised", "unresolved"]),
    rationale: z.string().trim().min(3).max(400)
  })
  .strict();

export const relationshipGraphNodeSchema = z
  .object({
    roomId: idSchema,
    roomType: roomTypeSchema,
    zone: planningZoneSchema,
    daylightPriority: z.enum(["required", "preferred", "not_required"]),
    quietPriority: z.enum(["high", "medium", "low"])
  })
  .strict();

export const relationshipGraphEdgeSchema = z
  .object({
    id: idSchema,
    fromRoomId: idSchema,
    toRoomId: idSchema,
    relationship: z.enum(["adjacent", "near", "connected", "separate", "avoid"]),
    priority: z.enum(["required", "preferred", "avoid"]),
    ruleId: idSchema,
    reason: z.string().trim().min(3).max(300)
  })
  .strict()
  .superRefine((edge, ctx) => {
    if (edge.fromRoomId === edge.toRoomId) {
      ctx.addIssue({
        code: "custom",
        path: ["toRoomId"],
        message: "Relationship graph edges must connect two different rooms."
      });
    }
  });

export const relationshipGraphSchema = z
  .object({
    nodes: z.array(relationshipGraphNodeSchema).min(1).max(12),
    edges: z.array(relationshipGraphEdgeSchema).max(40)
  })
  .strict()
  .superRefine((graph, ctx) => {
    const roomIds = new Set(graph.nodes.map((node) => node.roomId));

    graph.edges.forEach((edge, index) => {
      if (!roomIds.has(edge.fromRoomId)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "fromRoomId"],
          message: `Relationship graph references missing room ${edge.fromRoomId}.`
        });
      }

      if (!roomIds.has(edge.toRoomId)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "toRoomId"],
          message: `Relationship graph references missing room ${edge.toRoomId}.`
        });
      }
    });
  });

export const feasibilityComponentSchema = z
  .object({
    score: z.number().finite().min(0).max(100),
    weight: z.number().finite().min(0).max(1),
    rationale: z.array(z.string().trim().min(3).max(300)).min(1).max(10)
  })
  .strict();

export const feasibilityScoreSchema = z
  .object({
    overallScore: z.number().finite().min(0).max(100),
    rating: z.enum(["highly_feasible", "feasible", "constrained", "low"]),
    complexityScore: z.number().finite().min(0).max(100),
    breakdown: z
      .object({
        roomProgram: feasibilityComponentSchema,
        area: feasibilityComponentSchema,
        adjacency: feasibilityComponentSchema,
        daylight: feasibilityComponentSchema,
        privacy: feasibilityComponentSchema,
        accessibility: feasibilityComponentSchema,
        complexityFeasibility: feasibilityComponentSchema,
        confidence: feasibilityComponentSchema
      })
      .strict()
  })
  .strict();

export const planningConflictSchema = z
  .object({
    id: idSchema,
    code: z.enum([
      "room_program_exceeds_area",
      "room_count_exceeds_mvp",
      "multiple_balconies_small_area",
      "luxury_program_insufficient_area",
      "accessibility_small_area",
      "office_heavy_program_insufficient_area",
      "open_and_separate_kitchen",
      "unsupported_request_leak",
      "unresolved_request_leak"
    ]),
    severity: z.enum(["warning", "critical"]),
    message: z.string().trim().min(5).max(400),
    affectedItems: z.array(z.string().trim().min(1).max(100)).max(20),
    resolution: z.string().trim().min(3).max(400).nullable()
  })
  .strict();

export const planningCompromiseSchema = z
  .object({
    id: idSchema,
    code: z.enum([
      "reduce_balcony_count",
      "combine_dining_with_living",
      "combine_office_with_guest",
      "reduce_service_space_priority",
      "omit_optional_room",
      "suggest_larger_area",
      "request_clarification"
    ]),
    action: z.enum(["merge", "reduce", "omit", "recommend", "clarify"]),
    description: z.string().trim().min(5).max(400),
    affectedRooms: z.array(z.string().trim().min(1).max(100)).max(20),
    applied: z.boolean()
  })
  .strict();

export const planningRecommendationSchema = z
  .object({
    id: idSchema,
    code: z.string().regex(/^[a-z][a-z0-9_]*$/),
    priority: z.enum(["low", "medium", "high"]),
    message: z.string().trim().min(5).max(400)
  })
  .strict();

export const unresolvedPlanningItemSchema = z
  .object({
    id: idSchema,
    code: z.string().regex(/^[a-z][a-z0-9_]*$/),
    message: z.string().trim().min(5).max(400),
    clarificationQuestion: z.string().trim().min(5).max(300).nullable()
  })
  .strict();

export const resolvedPlanningSpecificationSchema = z
  .object({
    schemaVersion: z.literal(resolvedPlanningSchemaVersion),
    originalPlanningSummary: z
      .object({
        schemaVersion: z.literal("planning-specification-v1"),
        title: z.string().trim().min(3).max(160),
        buildingType: z.string().trim().min(3).max(80),
        targetArea: z.number().finite().min(18).max(500).nullable(),
        requestedRoomCount: z.number().int().min(0).max(40),
        confidenceScore: z.number().finite().min(0).max(1),
        unsupportedRequestCount: z.number().int().min(0).max(10),
        clarificationQuestionCount: z.number().int().min(0).max(10)
      })
      .strict(),
    normalizedSpecification: planningSpecificationSchema,
    resolvedRoomProgram: resolvedRoomProgramSchema,
    resolvedConstraints: z.array(resolvedConstraintSchema).max(60),
    relationshipGraph: relationshipGraphSchema,
    feasibility: feasibilityScoreSchema,
    conflicts: z.array(planningConflictSchema).max(30),
    compromises: z.array(planningCompromiseSchema).max(30),
    warnings: z.array(z.string().trim().min(3).max(400)).max(60),
    assumptions: z.array(z.string().trim().min(3).max(400)).max(60),
    recommendations: z.array(planningRecommendationSchema).max(30),
    unresolvedItems: z.array(unresolvedPlanningItemSchema).max(30),
    metadata: z
      .object({
        resolver: z.literal("deterministic-constraint-resolver-v1"),
        ruleSetVersion: z.literal("planning-constraint-rules-v1"),
        inputSchemaVersion: z.literal("planning-specification-v1"),
        deterministic: z.literal(true),
        sourceConfidence: z.number().finite().min(0).max(1)
      })
      .strict()
  })
  .strict();

export type ResolvedPlanningSpecificationSchema = z.infer<
  typeof resolvedPlanningSpecificationSchema
>;
