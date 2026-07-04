import { z } from "zod";
import {
  adjacencyTypeSchema,
  doorPlacementSchema,
  doorSchema,
  idSchema,
  openingPlacementSchema,
  roomTypeSchema,
  windowSchema
} from "./floor-plan.schema";

export const planGenerationRequestSchema = z
  .object({
    schemaVersion: z.literal("plan-generation-request-v1"),
    prompt: z.string().trim().min(1),
    preferences: z
      .object({
        units: z.literal("m"),
        maxRooms: z.number().int().positive().max(12),
        style: z.literal("simple-residential"),
        rectangularRoomsOnly: z.literal(true)
      })
      .strict()
  })
  .strict();

export const planDraftRoomSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    type: roomTypeSchema,
    targetArea: z.number().finite().positive().optional(),
    targetWidth: z.number().finite().positive().optional(),
    targetHeight: z.number().finite().positive().optional(),
    isWetArea: z.boolean(),
    isExteriorPreferred: z.boolean()
  })
  .strict()
  .superRefine((room, ctx) => {
    if (room.targetArea === undefined && (room.targetWidth === undefined || room.targetHeight === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["targetArea"],
        message: "Plan draft rooms need targetArea or targetWidth plus targetHeight."
      });
    }
  });

export const planDraftAdjacencySchema = z
  .object({
    roomAId: idSchema,
    roomBId: idSchema,
    type: adjacencyTypeSchema,
    reason: z.string().trim().min(1)
  })
  .strict()
  .superRefine((adjacency, ctx) => {
    if (adjacency.roomAId === adjacency.roomBId) {
      ctx.addIssue({
        code: "custom",
        path: ["roomBId"],
        message: "Adjacency must reference two different rooms."
      });
    }
  });

export const planDraftOpeningSchema = z
  .object({
    type: z.enum(["door", "window"]),
    roomId: idSchema,
    connectedRoomId: idSchema.optional(),
    preferredEdge: z.enum(["top", "right", "bottom", "left", "exterior"]).optional(),
    width: z.number().finite().positive()
  })
  .strict();

export const planDraftSchema = z
  .object({
    title: z.string().trim().min(1),
    units: z.literal("m"),
    rooms: z.array(planDraftRoomSchema).min(1).max(12),
    adjacencies: z.array(planDraftAdjacencySchema).max(30),
    openings: z.array(planDraftOpeningSchema).max(24).default([]),
    assumptions: z.array(z.string().trim().min(1))
  })
  .strict()
  .superRefine((draft, ctx) => {
    const roomIds = new Set<string>();

    draft.rooms.forEach((room, index) => {
      if (roomIds.has(room.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["rooms", index, "id"],
          message: `Duplicate room id ${room.id}.`
        });
      }

      roomIds.add(room.id);
    });

    draft.adjacencies.forEach((adjacency, index) => {
      if (!roomIds.has(adjacency.roomAId)) {
        ctx.addIssue({
          code: "custom",
          path: ["adjacencies", index, "roomAId"],
          message: `Adjacency references missing room ${adjacency.roomAId}.`
        });
      }

      if (!roomIds.has(adjacency.roomBId)) {
        ctx.addIssue({
          code: "custom",
          path: ["adjacencies", index, "roomBId"],
          message: `Adjacency references missing room ${adjacency.roomBId}.`
        });
      }
    });

    draft.openings.forEach((opening, index) => {
      if (!roomIds.has(opening.roomId)) {
        ctx.addIssue({
          code: "custom",
          path: ["openings", index, "roomId"],
          message: `Opening references missing room ${opening.roomId}.`
        });
      }

      if (opening.connectedRoomId && !roomIds.has(opening.connectedRoomId)) {
        ctx.addIssue({
          code: "custom",
          path: ["openings", index, "connectedRoomId"],
          message: `Opening references missing connectedRoomId ${opening.connectedRoomId}.`
        });
      }
    });
  });

export const promptToPlanAiResponseSchema = z
  .object({
    schemaVersion: z.literal("plan-generation-response-v1"),
    status: z.enum(["ok", "needs_clarification", "unsupported", "refused"]),
    planDraft: planDraftSchema.nullable(),
    clarificationRequest: z.string().trim().min(1).nullable(),
    warnings: z.array(z.string().trim().min(1))
  })
  .strict()
  .superRefine((response, ctx) => {
    if (response.status === "ok" && response.planDraft === null) {
      ctx.addIssue({
        code: "custom",
        path: ["planDraft"],
        message: "Successful plan generation responses must include planDraft."
      });
    }

    if (response.status === "needs_clarification" && !response.clarificationRequest) {
      ctx.addIssue({
        code: "custom",
        path: ["clarificationRequest"],
        message: "Clarification responses must include clarificationRequest."
      });
    }
  });

const editActionBase = {
  id: idSchema,
  reason: z.string().trim().min(1)
};

const emptyParamsSchema = z.object({}).strict();

export const editActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...editActionBase,
      type: z.literal("add_room"),
      params: z
        .object({
          room: planDraftRoomSchema,
          adjacency: planDraftAdjacencySchema.optional()
        })
        .strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("remove_room"),
      roomId: idSchema,
      params: emptyParamsSchema
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("rename_room"),
      roomId: idSchema,
      params: z.object({ name: z.string().trim().min(1) }).strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("resize_room"),
      roomId: idSchema,
      params: z
        .object({
          targetArea: z.number().finite().positive(),
          lockAdjacentRooms: z.boolean().optional()
        })
        .strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("set_room_dimensions"),
      roomId: idSchema,
      params: z
        .object({
          width: z.number().finite().positive(),
          height: z.number().finite().positive()
        })
        .strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("set_adjacency"),
      params: planDraftAdjacencySchema
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("remove_adjacency"),
      params: z.object({ adjacencyId: idSchema }).strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("add_door"),
      params: z.object({ door: doorSchema }).strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("move_door"),
      params: z.object({ doorId: idSchema, placement: doorPlacementSchema }).strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("remove_door"),
      params: z.object({ doorId: idSchema }).strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("add_window"),
      roomId: idSchema,
      params: z
        .object({
          window: windowSchema.omit({ roomId: true })
        })
        .strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("move_window"),
      params: z.object({ windowId: idSchema, placement: openingPlacementSchema.omit({ roomId: true }) }).strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("remove_window"),
      params: z.object({ windowId: idSchema }).strict()
    })
    .strict(),
  z
    .object({
      ...editActionBase,
      type: z.literal("regenerate_layout"),
      params: emptyParamsSchema
    })
    .strict()
]);

export const chatEditRequestSchema = z
  .object({
    schemaVersion: z.literal("chat-edit-request-v1"),
    message: z.string().trim().min(1),
    currentPlanId: idSchema.optional()
  })
  .strict();

export const chatEditResponseSchema = z
  .object({
    schemaVersion: z.literal("chat-edit-response-v1"),
    status: z.enum(["ok", "needs_clarification", "unsupported", "refused"]),
    actions: z.array(editActionSchema).max(20),
    requiresRelayout: z.boolean(),
    clarificationRequest: z.string().trim().min(1).nullable(),
    userFacingSummary: z.string().trim().min(1)
  })
  .strict()
  .superRefine((response, ctx) => {
    if (response.status === "ok" && response.actions.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["actions"],
        message: "Successful chat edit responses must include at least one action."
      });
    }

    if (response.status === "needs_clarification" && !response.clarificationRequest) {
      ctx.addIssue({
        code: "custom",
        path: ["clarificationRequest"],
        message: "Clarification responses must include clarificationRequest."
      });
    }

    if (response.actions.length === 0 && response.requiresRelayout) {
      ctx.addIssue({
        code: "custom",
        path: ["requiresRelayout"],
        message: "requiresRelayout cannot be true when there are no actions."
      });
    }
  });

export type PlanGenerationRequestSchema = z.infer<typeof planGenerationRequestSchema>;
export type PlanDraftRoom = z.infer<typeof planDraftRoomSchema>;
export type PlanDraftAdjacency = z.infer<typeof planDraftAdjacencySchema>;
export type PlanDraftOpening = z.infer<typeof planDraftOpeningSchema>;
export type PlanDraft = z.infer<typeof planDraftSchema>;
export type PromptToPlanAiResponse = z.infer<typeof promptToPlanAiResponseSchema>;
export type EditAction = z.infer<typeof editActionSchema>;
export type ChatEditRequestSchema = z.infer<typeof chatEditRequestSchema>;
export type ChatEditResponse = z.infer<typeof chatEditResponseSchema>;
