import { z } from "zod";

const idPattern = /^[a-z][a-z0-9_]*$/;
const areaTolerance = 0.01;

type RectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RoomLike = {
  id: string;
  layout: RectLike;
};

type EdgeValue = "top" | "right" | "bottom" | "left";

export const idSchema = z
  .string()
  .min(1)
  .regex(idPattern, "IDs must use lowercase letters, numbers, and underscores.");

export const edgeSchema = z.enum(["top", "right", "bottom", "left"]);

export const roomTypeSchema = z.enum([
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
]);

export const doorTypeSchema = z.enum(["entry", "interior", "balcony"]);
export const doorSwingSchema = z.enum(["left", "right", "sliding", "unspecified"]);
export const adjacencyTypeSchema = z.enum(["required", "preferred", "avoid"]);
export const validationSeveritySchema = z.enum(["info", "warning", "critical"]);
export const validationStatusSchema = z.enum(["valid", "valid_with_warnings", "invalid"]);

export const rectSchema = z
  .object({
    x: z.number().finite().nonnegative(),
    y: z.number().finite().nonnegative(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive()
  })
  .strict();

export const roomSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    type: roomTypeSchema,
    level: z.literal(1),
    layout: rectSchema,
    area: z.number().finite().positive(),
    minArea: z.number().finite().positive().optional(),
    targetArea: z.number().finite().positive().optional(),
    isWetArea: z.boolean(),
    isExteriorPreferred: z.boolean(),
    notes: z.array(z.string())
  })
  .strict()
  .superRefine((room, ctx) => {
    const computedArea = room.layout.width * room.layout.height;

    if (Math.abs(room.area - computedArea) > areaTolerance) {
      ctx.addIssue({
        code: "custom",
        path: ["area"],
        message: `Room area must match width * height. Expected ${computedArea}, received ${room.area}.`
      });
    }

    if (room.minArea !== undefined && room.area + areaTolerance < room.minArea) {
      ctx.addIssue({
        code: "custom",
        path: ["minArea"],
        message: "Room area must be greater than or equal to minArea."
      });
    }
  });

export const openingPlacementSchema = z
  .object({
    roomId: idSchema.optional(),
    edge: edgeSchema,
    offset: z.number().finite().nonnegative()
  })
  .strict();

export const doorPlacementSchema = openingPlacementSchema.extend({
  roomId: idSchema
});

export const doorSchema = z
  .object({
    id: idSchema,
    type: doorTypeSchema,
    fromRoomId: idSchema,
    toRoomId: idSchema.nullable(),
    width: z.number().finite().positive(),
    placement: doorPlacementSchema,
    swing: doorSwingSchema
  })
  .strict()
  .superRefine((door, ctx) => {
    if (door.type === "entry" && door.toRoomId !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["toRoomId"],
        message: "Entry doors must use toRoomId: null."
      });
    }

    if (door.type !== "entry" && door.toRoomId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["toRoomId"],
        message: "Interior and balcony doors must connect two rooms."
      });
    }
  });

export const windowSchema = z
  .object({
    id: idSchema,
    roomId: idSchema,
    width: z.number().finite().positive(),
    placement: openingPlacementSchema.omit({ roomId: true }),
    sillHeight: z.number().finite().nonnegative().nullable()
  })
  .strict();

export const adjacencySchema = z
  .object({
    id: idSchema,
    roomAId: idSchema,
    roomBId: idSchema,
    type: adjacencyTypeSchema,
    reason: z.string().trim().min(1),
    satisfied: z.boolean()
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

export const layoutMetadataSchema = z
  .object({
    engine: z.enum(["rectangular-grid-v1", "placeholder-layout-v1"]),
    gridSize: z.number().finite().positive(),
    strategy: z.string().trim().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    warnings: z.array(z.string().trim().min(1)).optional()
  })
  .strict();

export const validationIssueSchema = z
  .object({
    id: idSchema,
    severity: validationSeveritySchema,
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
    targetId: idSchema.optional(),
    path: z.array(z.union([z.string(), z.number()])).optional()
  })
  .strict();

export const validationSummarySchema = z
  .object({
    status: validationStatusSchema,
    issues: z.array(validationIssueSchema)
  })
  .strict()
  .superRefine((summary, ctx) => {
    const hasCritical = summary.issues.some((issue) => issue.severity === "critical");
    const hasWarning = summary.issues.some((issue) => issue.severity === "warning");

    if (summary.status === "valid" && summary.issues.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Validation status cannot be valid when issues are present."
      });
    }

    if (summary.status === "valid_with_warnings" && !hasWarning && !hasCritical) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "valid_with_warnings requires at least one warning or critical issue."
      });
    }

    if (summary.status === "invalid" && !hasCritical) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "invalid requires at least one critical issue."
      });
    }
  });

export const floorPlanMetadataSchema = z
  .object({
    createdBy: z.enum(["ai", "mock", "user"]),
    source: z.enum(["prompt", "chat-edit", "mock"]),
    promptSummary: z.string().trim().min(1),
    disclaimer: z.string().trim().min(1)
  })
  .strict();

export const floorPlanSchema = z
  .object({
    schemaVersion: z.literal("floor-plan-v1"),
    id: idSchema,
    projectId: idSchema,
    title: z.string().trim().min(1),
    units: z.literal("m"),
    precision: z.literal("conceptual"),
    bounds: rectSchema,
    rooms: z.array(roomSchema).min(1).max(12),
    doors: z.array(doorSchema).max(24),
    windows: z.array(windowSchema).max(24),
    adjacencies: z.array(adjacencySchema).max(30),
    layout: layoutMetadataSchema,
    assumptions: z.array(z.string().trim().min(1)),
    validation: validationSummarySchema,
    metadata: floorPlanMetadataSchema
  })
  .strict()
  .superRefine((plan, ctx) => {
    const roomIds = new Set(plan.rooms.map((room) => room.id));

    addDuplicateIdIssues("rooms", plan.rooms, ctx);
    addDuplicateIdIssues("doors", plan.doors, ctx);
    addDuplicateIdIssues("windows", plan.windows, ctx);
    addDuplicateIdIssues("adjacencies", plan.adjacencies, ctx);

    plan.rooms.forEach((room, index) => {
      if (!rectFitsWithin(room.layout, plan.bounds)) {
        ctx.addIssue({
          code: "custom",
          path: ["rooms", index, "layout"],
          message: `Room ${room.id} must fit within plan bounds.`
        });
      }
    });

    for (let i = 0; i < plan.rooms.length; i += 1) {
      for (let j = i + 1; j < plan.rooms.length; j += 1) {
        if (rectanglesOverlap(plan.rooms[i].layout, plan.rooms[j].layout)) {
          ctx.addIssue({
            code: "custom",
            path: ["rooms", j, "layout"],
            message: `Room ${plan.rooms[j].id} overlaps ${plan.rooms[i].id}.`
          });
        }
      }
    }

    plan.adjacencies.forEach((adjacency, index) => {
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

      if (adjacency.type === "required" && !adjacency.satisfied) {
        ctx.addIssue({
          code: "custom",
          path: ["adjacencies", index, "satisfied"],
          message: "Required adjacencies must be satisfied in a validated FloorPlan."
        });
      }
    });

    plan.doors.forEach((door, index) => {
      const fromRoom = plan.rooms.find((room) => room.id === door.fromRoomId);
      const toRoom = door.toRoomId
        ? plan.rooms.find((room) => room.id === door.toRoomId)
        : null;
      const placementRoom = plan.rooms.find((room) => room.id === door.placement.roomId);

      if (!fromRoom) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", index, "fromRoomId"],
          message: `Door references missing fromRoomId ${door.fromRoomId}.`
        });
      }

      if (door.toRoomId && !toRoom) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", index, "toRoomId"],
          message: `Door references missing toRoomId ${door.toRoomId}.`
        });
      }

      if (!placementRoom) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", index, "placement", "roomId"],
          message: `Door placement references missing room ${door.placement.roomId}.`
        });
        return;
      }

      if (
        door.placement.roomId !== door.fromRoomId &&
        door.placement.roomId !== door.toRoomId
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", index, "placement", "roomId"],
          message: "Door placement room must be one of the connected rooms."
        });
      }

      if (!openingFitsEdge(door.width, door.placement.offset, door.placement.edge, placementRoom)) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", index, "placement", "offset"],
          message: "Door placement must fit on the selected room edge."
        });
      }

      if (door.type === "entry" && !isExteriorRoomEdge(placementRoom, door.placement.edge, plan.rooms, plan.bounds)) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", index, "placement", "edge"],
          message: "Entry doors must be placed on an exterior room edge."
        });
      }

      if (door.type !== "entry" && fromRoom && toRoom && !roomsShareEdge(fromRoom, toRoom)) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", index],
          message: "Interior and balcony doors must connect rooms that share an edge."
        });
      }
    });

    plan.windows.forEach((window, index) => {
      const room = plan.rooms.find((candidate) => candidate.id === window.roomId);

      if (!room) {
        ctx.addIssue({
          code: "custom",
          path: ["windows", index, "roomId"],
          message: `Window references missing room ${window.roomId}.`
        });
        return;
      }

      if (!openingFitsEdge(window.width, window.placement.offset, window.placement.edge, room)) {
        ctx.addIssue({
          code: "custom",
          path: ["windows", index, "placement", "offset"],
          message: "Window placement must fit on the selected room edge."
        });
      }

      if (!isExteriorRoomEdge(room, window.placement.edge, plan.rooms, plan.bounds)) {
        ctx.addIssue({
          code: "custom",
          path: ["windows", index, "placement", "edge"],
          message: "Windows must be placed on exterior room edges."
        });
      }
    });
  });

function addDuplicateIdIssues(
  collectionName: string,
  items: Array<{ id: string }>,
  ctx: z.RefinementCtx
) {
  const seen = new Set<string>();

  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: "custom",
        path: [collectionName, index, "id"],
        message: `Duplicate ${collectionName} id ${item.id}.`
      });
    }

    seen.add(item.id);
  });
}

function rectFitsWithin(rect: RectLike, bounds: RectLike) {
  return (
    rect.x >= bounds.x &&
    rect.y >= bounds.y &&
    rect.x + rect.width <= bounds.x + bounds.width + areaTolerance &&
    rect.y + rect.height <= bounds.y + bounds.height + areaTolerance
  );
}

function rectanglesOverlap(a: RectLike, b: RectLike) {
  return !(
    a.x + a.width <= b.x + areaTolerance ||
    b.x + b.width <= a.x + areaTolerance ||
    a.y + a.height <= b.y + areaTolerance ||
    b.y + b.height <= a.y + areaTolerance
  );
}

function openingFitsEdge(width: number, offset: number, edge: EdgeValue, room: RoomLike) {
  return offset + width <= roomEdgeLength(room, edge) + areaTolerance;
}

function roomEdgeLength(room: RoomLike, edge: EdgeValue) {
  return edge === "top" || edge === "bottom" ? room.layout.width : room.layout.height;
}

function roomsShareEdge(a: RoomLike, b: RoomLike) {
  const aRight = a.layout.x + a.layout.width;
  const bRight = b.layout.x + b.layout.width;
  const aBottom = a.layout.y + a.layout.height;
  const bBottom = b.layout.y + b.layout.height;

  const shareVerticalEdge =
    (nearlyEqual(aRight, b.layout.x) || nearlyEqual(bRight, a.layout.x)) &&
    intervalsOverlap(a.layout.y, aBottom, b.layout.y, bBottom);

  const shareHorizontalEdge =
    (nearlyEqual(aBottom, b.layout.y) || nearlyEqual(bBottom, a.layout.y)) &&
    intervalsOverlap(a.layout.x, aRight, b.layout.x, bRight);

  return shareVerticalEdge || shareHorizontalEdge;
}

function isExteriorRoomEdge(room: RoomLike, edge: EdgeValue, rooms: RoomLike[], bounds: RectLike) {
  const roomRight = room.layout.x + room.layout.width;
  const roomBottom = room.layout.y + room.layout.height;
  const boundsRight = bounds.x + bounds.width;
  const boundsBottom = bounds.y + bounds.height;

  if (edge === "top" && nearlyEqual(room.layout.y, bounds.y)) return true;
  if (edge === "right" && nearlyEqual(roomRight, boundsRight)) return true;
  if (edge === "bottom" && nearlyEqual(roomBottom, boundsBottom)) return true;
  if (edge === "left" && nearlyEqual(room.layout.x, bounds.x)) return true;

  return !rooms.some((candidate) => {
    if (candidate.id === room.id) return false;

    if (edge === "top") {
      return (
        nearlyEqual(candidate.layout.y + candidate.layout.height, room.layout.y) &&
        intervalsOverlap(candidate.layout.x, candidate.layout.x + candidate.layout.width, room.layout.x, roomRight)
      );
    }

    if (edge === "right") {
      return (
        nearlyEqual(candidate.layout.x, roomRight) &&
        intervalsOverlap(candidate.layout.y, candidate.layout.y + candidate.layout.height, room.layout.y, roomBottom)
      );
    }

    if (edge === "bottom") {
      return (
        nearlyEqual(candidate.layout.y, roomBottom) &&
        intervalsOverlap(candidate.layout.x, candidate.layout.x + candidate.layout.width, room.layout.x, roomRight)
      );
    }

    return (
      nearlyEqual(candidate.layout.x + candidate.layout.width, room.layout.x) &&
      intervalsOverlap(candidate.layout.y, candidate.layout.y + candidate.layout.height, room.layout.y, roomBottom)
    );
  });
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd) - areaTolerance;
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) <= areaTolerance;
}

export type Edge = z.infer<typeof edgeSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type DoorType = z.infer<typeof doorTypeSchema>;
export type DoorSwing = z.infer<typeof doorSwingSchema>;
export type AdjacencyType = z.infer<typeof adjacencyTypeSchema>;
export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;
export type ValidationStatus = z.infer<typeof validationStatusSchema>;
export type Rect = z.infer<typeof rectSchema>;
export type Room = z.infer<typeof roomSchema>;
export type OpeningPlacement = z.infer<typeof openingPlacementSchema>;
export type Door = z.infer<typeof doorSchema>;
export type Window = z.infer<typeof windowSchema>;
export type Adjacency = z.infer<typeof adjacencySchema>;
export type LayoutMetadata = z.infer<typeof layoutMetadataSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationSummary = z.infer<typeof validationSummarySchema>;
export type FloorPlan = z.infer<typeof floorPlanSchema>;
