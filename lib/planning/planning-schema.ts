import { z } from "zod";

export const planningSchemaVersion = "planning-specification-v1" as const;

export const planningPrioritySchema = z.enum(["low", "medium", "high"]);
export const planningProjectTypeSchema = z.enum(["concept", "new_build", "renovation"]);
export const planningBuildingTypeSchema = z.enum([
  "apartment",
  "house",
  "villa",
  "vacation_home",
  "tiny_house",
  "other_residential",
  "unsupported"
]);
export const planningClassificationSchema = z.enum([
  "residential",
  "commercial",
  "unknown"
]);
export const planningStyleSchema = z.enum([
  "modern",
  "contemporary",
  "minimalist",
  "traditional",
  "rustic",
  "luxury",
  "unspecified"
]);
export const planningLanguageSchema = z.enum(["en", "tr", "other"]);

export const planningPreferredDimensionsSchema = z
  .object({
    width: z.number().finite().min(3).max(50),
    height: z.number().finite().min(3).max(50)
  })
  .strict();

export const planningHouseholdSchema = z
  .object({
    profile: z.enum([
      "single",
      "couple",
      "family",
      "students",
      "multigenerational",
      "vacation",
      "unspecified"
    ]),
    adults: z.number().int().min(0).max(12),
    children: z.number().int().min(0).max(12),
    regularGuests: z.number().int().min(0).max(12),
    accessibilityNeeds: z.array(z.string().trim().min(2).max(120)).max(12),
    lifestylePreferences: z.array(z.string().trim().min(2).max(120)).max(20),
    workFromHome: z.enum(["none", "occasional", "dedicated"]),
    pets: z.enum(["none", "cat", "dog", "multiple", "other", "unspecified"])
  })
  .strict();

export const planningPrioritiesSchema = z
  .object({
    entertaining: planningPrioritySchema,
    cooking: planningPrioritySchema,
    privacy: planningPrioritySchema,
    daylight: planningPrioritySchema,
    storage: planningPrioritySchema,
    budget: planningPrioritySchema
  })
  .strict();

export const planningRequestedRoomsSchema = z
  .object({
    bedrooms: z.number().int().min(0).max(8),
    bathrooms: z.number().int().min(0).max(6),
    balconies: z.number().int().min(0).max(4),
    office: z.boolean(),
    laundry: z.boolean(),
    pantry: z.boolean(),
    dining: z.boolean(),
    storage: z.boolean(),
    walkInCloset: z.boolean(),
    guestRoom: z.boolean(),
    ensuite: z.boolean(),
    openKitchen: z.boolean(),
    otherRooms: z.array(z.string().trim().min(2).max(80)).max(8)
  })
  .strict();

export const planningRoomRelationshipSchema = z
  .object({
    from: z.string().trim().min(2).max(80),
    to: z.string().trim().min(2).max(80),
    relationship: z.enum(["adjacent", "near", "connected", "separate", "avoid"]),
    priority: z.enum(["must", "should", "avoid"]),
    reason: z.string().trim().min(3).max(240)
  })
  .strict()
  .superRefine((relationship, ctx) => {
    if (relationship.from === relationship.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "Room relationship endpoints must be different."
      });
    }
  });

export const planningUnsupportedRequestSchema = z
  .object({
    code: z.enum([
      "cad_bim",
      "permit_legal",
      "structural_engineering",
      "three_dimensional_render",
      "multi_floor",
      "non_residential",
      "interior_only",
      "construction_drawings",
      "other"
    ]),
    message: z.string().trim().min(5).max(300)
  })
  .strict();

export const planningClarificationQuestionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/),
    question: z.string().trim().min(5).max(240),
    required: z.boolean()
  })
  .strict();

const constraintArraySchema = z.array(z.string().trim().min(3).max(240)).max(20);

export const planningSpecificationSchema = z
  .object({
    schemaVersion: z.literal(planningSchemaVersion),
    title: z.string().trim().min(3).max(160),
    projectType: planningProjectTypeSchema,
    buildingType: planningBuildingTypeSchema,
    classification: planningClassificationSchema,
    floorCount: z.number().int().min(1).max(10),
    units: z.literal("m"),
    targetArea: z.number().finite().min(18).max(500).nullable(),
    preferredDimensions: planningPreferredDimensionsSchema.nullable(),
    architecturalStyle: planningStyleSchema,
    userLanguage: planningLanguageSchema,
    household: planningHouseholdSchema,
    priorities: planningPrioritiesSchema,
    requestedRooms: planningRequestedRoomsSchema,
    roomRelationships: z.array(planningRoomRelationshipSchema).max(30),
    mustHaveConstraints: constraintArraySchema,
    shouldHaveConstraints: constraintArraySchema,
    avoidConstraints: constraintArraySchema,
    neverConstraints: constraintArraySchema,
    missingInformation: z.array(z.string().trim().min(3).max(160)).max(20),
    clarificationQuestions: z.array(planningClarificationQuestionSchema).max(10),
    unsupportedRequests: z.array(planningUnsupportedRequestSchema).max(10),
    warnings: z.array(z.string().trim().min(3).max(300)).max(20),
    confidenceScore: z.number().finite().min(0).max(1),
    assumptions: z.array(z.string().trim().min(3).max(300)).max(30)
  })
  .strict()
  .superRefine((specification, ctx) => {
    if (specification.floorCount !== 1 && specification.unsupportedRequests.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["unsupportedRequests"],
        message: "Multi-floor requests must be recorded as unsupported for the residential MVP."
      });
    }

    if (
      specification.classification !== "residential" &&
      specification.unsupportedRequests.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["unsupportedRequests"],
        message: "Non-residential or unknown requests must include an unsupported request."
      });
    }

    if (
      specification.buildingType === "unsupported" &&
      specification.unsupportedRequests.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["unsupportedRequests"],
        message: "Unsupported building types must include an unsupported request."
      });
    }

    if (
      specification.missingInformation.length > 0 &&
      specification.clarificationQuestions.length === 0 &&
      specification.unsupportedRequests.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["clarificationQuestions"],
        message: "Missing planning information must produce at least one clarification question."
      });
    }

    if (
      specification.clarificationQuestions.length > 0 &&
      specification.confidenceScore > 0.69
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["confidenceScore"],
        message: "Planning specifications requiring clarification cannot exceed 0.69 confidence."
      });
    }
  });

export type PlanningSpecificationSchema = z.infer<typeof planningSpecificationSchema>;
