const idPattern = "^[a-z][a-z0-9_]*$";

const idSchema = {
  type: "string",
  pattern: idPattern
};

const nullableIdSchema = {
  type: ["string", "null"],
  pattern: idPattern
};

const roomTypeSchema = {
  type: "string",
  enum: [
    "entry",
    "hallway",
    "living",
    "kitchen",
    "dining",
    "bedroom",
    "bathroom",
    "wc",
    "ensuite",
    "storage",
    "laundry",
    "balcony",
    "utility",
    "other"
  ]
};

const edgeSchema = {
  type: "string",
  enum: ["top", "right", "bottom", "left"]
};

const nullableEdgeSchema = {
  type: ["string", "null"],
  enum: ["top", "right", "bottom", "left", "exterior", null]
};

const adjacencyTypeSchema = {
  type: "string",
  enum: ["required", "preferred", "avoid"]
};

const nullableNumberSchema = {
  type: ["number", "null"],
  exclusiveMinimum: 0
};

const planningPrioritySchema = {
  type: "string",
  enum: ["low", "medium", "high"]
};

const planningStringArraySchema = {
  type: "array",
  items: { type: "string", minLength: 2 }
};

export const planningSpecificationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", enum: ["planning-specification-v1"] },
    title: { type: "string", minLength: 3 },
    projectType: { type: "string", enum: ["concept", "new_build", "renovation"] },
    buildingType: {
      type: "string",
      enum: [
        "apartment",
        "house",
        "villa",
        "vacation_home",
        "tiny_house",
        "other_residential",
        "unsupported"
      ]
    },
    classification: { type: "string", enum: ["residential", "commercial", "unknown"] },
    floorCount: { type: "integer", minimum: 1, maximum: 10 },
    units: { type: "string", enum: ["m"] },
    targetArea: { type: ["number", "null"], minimum: 18, maximum: 500 },
    preferredDimensions: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            width: { type: "number", minimum: 3, maximum: 50 },
            height: { type: "number", minimum: 3, maximum: 50 }
          },
          required: ["width", "height"]
        },
        { type: "null" }
      ]
    },
    architecturalStyle: {
      type: "string",
      enum: ["modern", "contemporary", "minimalist", "traditional", "rustic", "luxury", "unspecified"]
    },
    userLanguage: { type: "string", enum: ["en", "tr", "other"] },
    household: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          enum: ["single", "couple", "family", "students", "multigenerational", "vacation", "unspecified"]
        },
        adults: { type: "integer", minimum: 0, maximum: 12 },
        children: { type: "integer", minimum: 0, maximum: 12 },
        regularGuests: { type: "integer", minimum: 0, maximum: 12 },
        accessibilityNeeds: planningStringArraySchema,
        lifestylePreferences: planningStringArraySchema,
        workFromHome: { type: "string", enum: ["none", "occasional", "dedicated"] },
        pets: { type: "string", enum: ["none", "cat", "dog", "multiple", "other", "unspecified"] }
      },
      required: [
        "profile",
        "adults",
        "children",
        "regularGuests",
        "accessibilityNeeds",
        "lifestylePreferences",
        "workFromHome",
        "pets"
      ]
    },
    priorities: {
      type: "object",
      additionalProperties: false,
      properties: {
        entertaining: planningPrioritySchema,
        cooking: planningPrioritySchema,
        privacy: planningPrioritySchema,
        daylight: planningPrioritySchema,
        storage: planningPrioritySchema,
        budget: planningPrioritySchema
      },
      required: ["entertaining", "cooking", "privacy", "daylight", "storage", "budget"]
    },
    requestedRooms: {
      type: "object",
      additionalProperties: false,
      properties: {
        bedrooms: { type: "integer", minimum: 0, maximum: 8 },
        bathrooms: { type: "integer", minimum: 0, maximum: 6 },
        balconies: { type: "integer", minimum: 0, maximum: 4 },
        office: { type: "boolean" },
        laundry: { type: "boolean" },
        pantry: { type: "boolean" },
        dining: { type: "boolean" },
        storage: { type: "boolean" },
        walkInCloset: { type: "boolean" },
        guestRoom: { type: "boolean" },
        ensuite: { type: "boolean" },
        openKitchen: { type: "boolean" },
        otherRooms: planningStringArraySchema
      },
      required: [
        "bedrooms",
        "bathrooms",
        "balconies",
        "office",
        "laundry",
        "pantry",
        "dining",
        "storage",
        "walkInCloset",
        "guestRoom",
        "ensuite",
        "openKitchen",
        "otherRooms"
      ]
    },
    roomRelationships: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 2 },
          to: { type: "string", minLength: 2 },
          relationship: { type: "string", enum: ["adjacent", "near", "connected", "separate", "avoid"] },
          priority: { type: "string", enum: ["must", "should", "avoid"] },
          reason: { type: "string", minLength: 3 }
        },
        required: ["from", "to", "relationship", "priority", "reason"]
      }
    },
    mustHaveConstraints: planningStringArraySchema,
    shouldHaveConstraints: planningStringArraySchema,
    avoidConstraints: planningStringArraySchema,
    neverConstraints: planningStringArraySchema,
    missingInformation: planningStringArraySchema,
    clarificationQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: idSchema,
          question: { type: "string", minLength: 5 },
          required: { type: "boolean" }
        },
        required: ["id", "question", "required"]
      }
    },
    unsupportedRequests: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          code: {
            type: "string",
            enum: [
              "cad_bim",
              "permit_legal",
              "structural_engineering",
              "three_dimensional_render",
              "multi_floor",
              "non_residential",
              "interior_only",
              "construction_drawings",
              "other"
            ]
          },
          message: { type: "string", minLength: 5 }
        },
        required: ["code", "message"]
      }
    },
    warnings: planningStringArraySchema,
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
    assumptions: planningStringArraySchema
  },
  required: [
    "schemaVersion",
    "title",
    "projectType",
    "buildingType",
    "classification",
    "floorCount",
    "units",
    "targetArea",
    "preferredDimensions",
    "architecturalStyle",
    "userLanguage",
    "household",
    "priorities",
    "requestedRooms",
    "roomRelationships",
    "mustHaveConstraints",
    "shouldHaveConstraints",
    "avoidConstraints",
    "neverConstraints",
    "missingInformation",
    "clarificationQuestions",
    "unsupportedRequests",
    "warnings",
    "confidenceScore",
    "assumptions"
  ]
};

const planDraftRoomSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: idSchema,
    name: { type: "string", minLength: 1 },
    type: roomTypeSchema,
    targetArea: nullableNumberSchema,
    targetWidth: nullableNumberSchema,
    targetHeight: nullableNumberSchema,
    isWetArea: { type: "boolean" },
    isExteriorPreferred: { type: "boolean" }
  },
  required: [
    "id",
    "name",
    "type",
    "targetArea",
    "targetWidth",
    "targetHeight",
    "isWetArea",
    "isExteriorPreferred"
  ]
};

const planDraftAdjacencySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    roomAId: idSchema,
    roomBId: idSchema,
    type: adjacencyTypeSchema,
    reason: { type: "string", minLength: 1 }
  },
  required: ["roomAId", "roomBId", "type", "reason"]
};

const planDraftOpeningSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["door", "window"] },
    roomId: idSchema,
    connectedRoomId: nullableIdSchema,
    preferredEdge: nullableEdgeSchema,
    width: { type: "number", exclusiveMinimum: 0 }
  },
  required: ["type", "roomId", "connectedRoomId", "preferredEdge", "width"]
};

const planDraftSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    units: { type: "string", enum: ["m"] },
    rooms: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: planDraftRoomSchema
    },
    adjacencies: {
      type: "array",
      maxItems: 30,
      items: planDraftAdjacencySchema
    },
    openings: {
      type: "array",
      maxItems: 24,
      items: planDraftOpeningSchema
    },
    assumptions: {
      type: "array",
      items: { type: "string", minLength: 1 }
    }
  },
  required: ["title", "units", "rooms", "adjacencies", "openings", "assumptions"]
};

const emptyParamsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
  required: []
};

const doorPlacementSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    roomId: idSchema,
    edge: edgeSchema,
    offset: { type: "number", minimum: 0 }
  },
  required: ["roomId", "edge", "offset"]
};

const windowPlacementSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    edge: edgeSchema,
    offset: { type: "number", minimum: 0 }
  },
  required: ["edge", "offset"]
};

const doorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: idSchema,
    type: { type: "string", enum: ["entry", "interior", "balcony"] },
    fromRoomId: idSchema,
    toRoomId: nullableIdSchema,
    width: { type: "number", exclusiveMinimum: 0 },
    placement: doorPlacementSchema,
    swing: { type: "string", enum: ["left", "right", "sliding", "unspecified"] }
  },
  required: ["id", "type", "fromRoomId", "toRoomId", "width", "placement", "swing"]
};

const windowWithoutRoomIdSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: idSchema,
    width: { type: "number", exclusiveMinimum: 0 },
    placement: windowPlacementSchema,
    sillHeight: { type: ["number", "null"], minimum: 0 }
  },
  required: ["id", "width", "placement", "sillHeight"]
};

function editActionVariant(
  type: string,
  properties: Record<string, unknown>,
  required: string[]
) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      id: idSchema,
      type: { type: "string", enum: [type] },
      reason: { type: "string", minLength: 1 },
      ...properties
    },
    required: ["id", "type", "reason", ...required]
  };
}

const editActionSchema = {
  anyOf: [
    editActionVariant(
      "add_room",
      {
        params: {
          type: "object",
          additionalProperties: false,
          properties: {
            room: planDraftRoomSchema,
            adjacency: {
              anyOf: [planDraftAdjacencySchema, { type: "null" }]
            }
          },
          required: ["room", "adjacency"]
        }
      },
      ["params"]
    ),
    editActionVariant(
      "remove_room",
      { roomId: idSchema, params: emptyParamsSchema },
      ["roomId", "params"]
    ),
    editActionVariant(
      "rename_room",
      {
        roomId: idSchema,
        params: {
          type: "object",
          additionalProperties: false,
          properties: { name: { type: "string", minLength: 1 } },
          required: ["name"]
        }
      },
      ["roomId", "params"]
    ),
    editActionVariant(
      "resize_room",
      {
        roomId: idSchema,
        params: {
          type: "object",
          additionalProperties: false,
          properties: {
            targetArea: { type: "number", exclusiveMinimum: 0 },
            lockAdjacentRooms: { type: ["boolean", "null"] }
          },
          required: ["targetArea", "lockAdjacentRooms"]
        }
      },
      ["roomId", "params"]
    ),
    editActionVariant(
      "set_room_dimensions",
      {
        roomId: idSchema,
        params: {
          type: "object",
          additionalProperties: false,
          properties: {
            width: { type: "number", exclusiveMinimum: 0 },
            height: { type: "number", exclusiveMinimum: 0 }
          },
          required: ["width", "height"]
        }
      },
      ["roomId", "params"]
    ),
    editActionVariant("set_adjacency", { params: planDraftAdjacencySchema }, ["params"]),
    editActionVariant(
      "remove_adjacency",
      {
        params: {
          type: "object",
          additionalProperties: false,
          properties: { adjacencyId: idSchema },
          required: ["adjacencyId"]
        }
      },
      ["params"]
    ),
    editActionVariant(
      "add_door",
      {
        params: {
          type: "object",
          additionalProperties: false,
          properties: { door: doorSchema },
          required: ["door"]
        }
      },
      ["params"]
    ),
    editActionVariant(
      "move_door",
      {
        params: {
          type: "object",
          additionalProperties: false,
          properties: { doorId: idSchema, placement: doorPlacementSchema },
          required: ["doorId", "placement"]
        }
      },
      ["params"]
    ),
    editActionVariant(
      "remove_door",
      {
        params: {
          type: "object",
          additionalProperties: false,
          properties: { doorId: idSchema },
          required: ["doorId"]
        }
      },
      ["params"]
    ),
    editActionVariant(
      "add_window",
      {
        roomId: idSchema,
        params: {
          type: "object",
          additionalProperties: false,
          properties: { window: windowWithoutRoomIdSchema },
          required: ["window"]
        }
      },
      ["roomId", "params"]
    ),
    editActionVariant(
      "move_window",
      {
        params: {
          type: "object",
          additionalProperties: false,
          properties: { windowId: idSchema, placement: windowPlacementSchema },
          required: ["windowId", "placement"]
        }
      },
      ["params"]
    ),
    editActionVariant(
      "remove_window",
      {
        params: {
          type: "object",
          additionalProperties: false,
          properties: { windowId: idSchema },
          required: ["windowId"]
        }
      },
      ["params"]
    ),
    editActionVariant("regenerate_layout", { params: emptyParamsSchema }, ["params"])
  ]
};

export const promptToPlanResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", enum: ["plan-generation-response-v1"] },
    status: { type: "string", enum: ["ok", "needs_clarification", "unsupported", "refused"] },
    planDraft: {
      anyOf: [planDraftSchema, { type: "null" }]
    },
    clarificationRequest: { type: ["string", "null"] },
    warnings: {
      type: "array",
      items: { type: "string", minLength: 1 }
    }
  },
  required: ["schemaVersion", "status", "planDraft", "clarificationRequest", "warnings"]
};

export const chatEditResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", enum: ["chat-edit-response-v1"] },
    status: { type: "string", enum: ["ok", "needs_clarification", "unsupported", "refused"] },
    actions: {
      type: "array",
      maxItems: 20,
      items: editActionSchema
    },
    requiresRelayout: { type: "boolean" },
    clarificationRequest: { type: ["string", "null"] },
    userFacingSummary: { type: "string", minLength: 1 }
  },
  required: [
    "schemaVersion",
    "status",
    "actions",
    "requiresRelayout",
    "clarificationRequest",
    "userFacingSummary"
  ]
};
