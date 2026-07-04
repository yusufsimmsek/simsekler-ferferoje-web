import type {
  PlanDraft,
  PlanDraftAdjacency,
  PlanDraftRoom,
  RoomType
} from "@/lib/floor-plan/types";
import { createPlanningFixture } from "./planning-fixtures";
import { resolvedPlanningSpecificationSchema } from "./resolved-planning-schema";
import type {
  PlanningRelationshipEdge,
  ResolvedPlanningSpecification,
  ResolvedRoomProgramItem
} from "./resolved-planning-types";

export function createEditResolvedPlanningFromDraft(
  draft: PlanDraft
): ResolvedPlanningSpecification {
  const totalTargetArea = sum(
    draft.rooms.map((room) => roomTargetArea(room))
  );
  const targetArea = clamp(Math.ceil(totalTargetArea / 0.88), 18, 500);
  const specification = createPlanningFixture({
    title: draft.title,
    targetArea,
    requestedRooms: {
      bedrooms: countRooms(draft.rooms, "bedroom"),
      bathrooms: Math.max(
        1,
        countRooms(draft.rooms, "bathroom") + countRooms(draft.rooms, "ensuite")
      ),
      balconies: countRooms(draft.rooms, "balcony"),
      office: draft.rooms.some(isOfficeLikeRoom),
      laundry: draft.rooms.some((room) => room.type === "laundry"),
      pantry: draft.rooms.some((room) => room.id.includes("pantry")),
      dining: draft.rooms.some((room) => room.type === "dining"),
      storage: draft.rooms.some((room) => room.type === "storage"),
      ensuite: draft.rooms.some((room) => room.type === "ensuite"),
      openKitchen: hasLivingKitchenRelationship(draft),
      otherRooms: draft.rooms
        .filter(isOtherRequestedRoom)
        .map((room) => room.name)
    },
    assumptions: [
      ...draft.assumptions,
      "Chat edit quality scoring reconstructed planning intent from the current semantic room draft."
    ],
    roomRelationships: draft.adjacencies.map((adjacency) => ({
      from: roomReferenceFor(draft, adjacency.roomAId),
      to: roomReferenceFor(draft, adjacency.roomBId),
      relationship: adjacency.type === "avoid" ? "avoid" : "near",
      priority:
        adjacency.type === "required"
          ? "must"
          : adjacency.type === "avoid"
            ? "avoid"
            : "should",
      reason: adjacency.reason
    }))
  });
  const resolvedRooms = draft.rooms.map(toResolvedRoom);
  const targetUsableArea = clamp(totalTargetArea, 12, 450);
  const estimatedMinimumArea = sum(
    resolvedRooms.map((room) => room.minimumArea)
  );
  const relationshipGraph = {
    nodes: resolvedRooms.map((room) => ({
      roomId: room.id,
      roomType: room.type,
      zone: room.zone,
      daylightPriority: room.daylightPriority,
      quietPriority: room.quietPriority
    })),
    edges: buildRelationshipEdges(draft).slice(0, 40)
  };
  const resolvedConstraints = relationshipGraph.edges.map((edge, index) => ({
    id: `constraint_edit_${index + 1}`,
    ruleId: edge.ruleId,
    kind:
      edge.priority === "required"
        ? "must" as const
        : edge.priority === "avoid"
          ? "avoid" as const
          : "should" as const,
    statement: edge.reason,
    source: "inferred" as const,
    status: "applied" as const,
    rationale:
      "Inferred from the validated current floor plan and chat-edit semantic draft."
  }));
  const feasibility = neutralFeasibilityScore({
    roomCount: resolvedRooms.length,
    targetArea,
    estimatedMinimumArea
  });
  const parsed = resolvedPlanningSpecificationSchema.parse({
    schemaVersion: "resolved-planning-specification-v1",
    originalPlanningSummary: {
      schemaVersion: specification.schemaVersion,
      title: specification.title,
      buildingType: specification.buildingType,
      targetArea: specification.targetArea,
      requestedRoomCount: draft.rooms.length,
      confidenceScore: specification.confidenceScore,
      unsupportedRequestCount: 0,
      clarificationQuestionCount: 0
    },
    normalizedSpecification: specification,
    resolvedRoomProgram: {
      rooms: resolvedRooms,
      omittedRooms: [],
      mergedSpaces: [],
      requestedRoomCount: draft.rooms.length,
      resolvedRoomCount: resolvedRooms.length,
      targetArea,
      targetUsableArea,
      estimatedMinimumArea,
      circulationAllowance: 0.12
    },
    resolvedConstraints,
    relationshipGraph,
    feasibility,
    conflicts: [],
    compromises: [],
    warnings: [
      "Planning context for chat edit quality scoring was reconstructed from the current semantic draft."
    ],
    assumptions: [
      ...specification.assumptions,
      "Edit quality scoring is conceptual and deterministic."
    ],
    recommendations: [],
    unresolvedItems: [],
    metadata: {
      resolver: "deterministic-constraint-resolver-v1",
      ruleSetVersion: "planning-constraint-rules-v1",
      inputSchemaVersion: "planning-specification-v1",
      deterministic: true,
      sourceConfidence: 0.82
    }
  });

  return parsed;
}

function toResolvedRoom(room: PlanDraftRoom): ResolvedRoomProgramItem {
  const baseTargetArea = clamp(roomTargetArea(room), 1, 150);
  const minimumArea = clamp(
    minimumAreaForRoom(room, baseTargetArea),
    1,
    Math.min(baseTargetArea, 100)
  );

  return {
    id: room.id,
    name: room.name,
    type: room.type,
    source: isDefaultRoom(room) ? "default" : isRequiredRoom(room) ? "required" : "requested",
    priority: priorityForRoom(room),
    zone: zoneForRoom(room),
    minimumArea,
    baseTargetArea: Math.max(baseTargetArea, minimumArea),
    isWetArea: room.isWetArea,
    isExteriorPreferred: room.isExteriorPreferred,
    daylightPriority: daylightPriorityForRoom(room),
    quietPriority: quietPriorityForRoom(room)
  };
}

function buildRelationshipEdges(draft: PlanDraft): PlanningRelationshipEdge[] {
  const edges: Array<Omit<PlanningRelationshipEdge, "id">> = [];
  const roomIds = new Set(draft.rooms.map((room) => room.id));
  const living = firstRoomOfType(draft.rooms, "living");
  const kitchen = firstRoomOfType(draft.rooms, "kitchen");
  const hallOrEntry =
    firstRoomOfType(draft.rooms, "hallway") ?? firstRoomOfType(draft.rooms, "entry");

  if (hallOrEntry && living) {
    edges.push({
      fromRoomId: hallOrEntry.id,
      toRoomId: living.id,
      relationship: "connected",
      priority: "required",
      ruleId: "rule_primary_circulation",
      reason: "Primary circulation should connect to the living room."
    });
  }

  if (living && kitchen) {
    edges.push({
      fromRoomId: living.id,
      toRoomId: kitchen.id,
      relationship: hasLivingKitchenRelationship(draft) ? "connected" : "near",
      priority: hasLivingKitchenRelationship(draft) ? "required" : "preferred",
      ruleId: hasLivingKitchenRelationship(draft)
        ? "rule_open_kitchen_connection"
        : "rule_kitchen_near_living",
      reason: "Kitchen should remain close to the living room after editing."
    });
  }

  draft.rooms
    .filter((room) => room.type === "balcony")
    .forEach((balcony) => {
      if (!living) return;
      edges.push({
        fromRoomId: living.id,
        toRoomId: balcony.id,
        relationship: "connected",
        priority: "required",
        ruleId: "rule_balcony_living_connection",
        reason: "Balcony should connect to the living room."
      });
    });

  draft.rooms
    .filter((room) => room.type === "bedroom")
    .forEach((bedroom) => {
      if (!hallOrEntry) return;
      edges.push({
        fromRoomId: hallOrEntry.id,
        toRoomId: bedroom.id,
        relationship: "near",
        priority: "preferred",
        ruleId: "rule_bedroom_private_zone",
        reason: "Bedrooms should remain near circulation."
      });
    });

  draft.rooms
    .filter((room) => ["bathroom", "wc", "ensuite"].includes(room.type))
    .forEach((bathroom) => {
      if (!hallOrEntry) return;
      edges.push({
        fromRoomId: hallOrEntry.id,
        toRoomId: bathroom.id,
        relationship: "near",
        priority: "preferred",
        ruleId: "rule_bathroom_access",
        reason: "Bathrooms should remain accessible from circulation."
      });
    });

  draft.rooms.filter(isOfficeLikeRoom).forEach((office) => {
    if (!living) return;
    edges.push({
      fromRoomId: office.id,
      toRoomId: living.id,
      relationship: "avoid",
      priority: "avoid",
      ruleId: "rule_office_quiet_daylight",
      reason: "Office should be quieter than the living zone."
    });
  });

  draft.adjacencies.forEach((adjacency, index) => {
    if (
      !roomIds.has(adjacency.roomAId) ||
      !roomIds.has(adjacency.roomBId) ||
      adjacency.roomAId === adjacency.roomBId
    ) {
      return;
    }

    edges.push({
      fromRoomId: adjacency.roomAId,
      toRoomId: adjacency.roomBId,
      relationship: adjacency.type === "avoid" ? "avoid" : "near",
      priority:
        adjacency.type === "required"
          ? "required"
          : adjacency.type === "avoid"
            ? "avoid"
            : "preferred",
      ruleId: `rule_edit_adjacency_${index + 1}`,
      reason: adjacency.reason
    });
  });

  return uniqueEdges(edges).map((edge, index) => ({
    id: `relationship_edit_${index + 1}`,
    ...edge
  }));
}

function uniqueEdges(edges: Array<Omit<PlanningRelationshipEdge, "id">>) {
  return Array.from(
    new Map(
      edges.map((edge) => [
        [
          edge.fromRoomId,
          edge.toRoomId,
          edge.relationship,
          edge.priority
        ]
          .sort()
          .join(":"),
        edge
      ])
    ).values()
  );
}

function neutralFeasibilityScore(input: {
  roomCount: number;
  targetArea: number;
  estimatedMinimumArea: number;
}) {
  const areaRatio = input.targetArea / Math.max(input.estimatedMinimumArea, 1);
  const areaScore = clamp(areaRatio * 70, 40, 100);
  const complexityScore = clamp(input.roomCount * 7, 5, 100);
  const complexityFeasibility = clamp(100 - Math.max(input.roomCount - 8, 0) * 7, 45, 100);
  const overallScore = roundScore(
    areaScore * 0.35 + complexityFeasibility * 0.25 + 80 * 0.4
  );

  return {
    overallScore,
    rating:
      overallScore >= 80
        ? "highly_feasible" as const
        : overallScore >= 65
          ? "feasible" as const
          : overallScore >= 45
            ? "constrained" as const
            : "low" as const,
    complexityScore,
    breakdown: {
      roomProgram: component(80, 0.18, "Room program was inferred from the edited semantic draft."),
      area: component(areaScore, 0.22, "Area fit was estimated from current room targets."),
      adjacency: component(80, 0.15, "Adjacency intent was inferred from current plan relationships."),
      daylight: component(80, 0.1, "Daylight intent was inferred from exterior preferences."),
      privacy: component(80, 0.1, "Privacy intent was inferred from room types and office labels."),
      accessibility: component(80, 0.1, "No professional accessibility compliance is implied."),
      complexityFeasibility: component(
        complexityFeasibility,
        0.08,
        "Complexity is based on edited room count."
      ),
      confidence: component(82, 0.07, "Chat edit planning context is deterministic but reconstructed.")
    }
  };
}

function component(score: number, weight: number, rationale: string) {
  return {
    score: roundScore(score),
    weight,
    rationale: [rationale]
  };
}

function roomTargetArea(room: PlanDraftRoom) {
  return room.targetArea ?? ((room.targetWidth ?? 3) * (room.targetHeight ?? 3));
}

function minimumAreaForRoom(room: PlanDraftRoom, targetArea: number) {
  if (room.type === "entry") return Math.min(targetArea, 2);
  if (room.type === "hallway") return Math.min(targetArea, 3);
  if (room.type === "wc") return Math.min(targetArea, 1.5);
  if (["bathroom", "ensuite"].includes(room.type)) return Math.min(targetArea, 3);
  if (room.type === "balcony") return Math.min(targetArea, 2);
  if (room.type === "bedroom") return Math.min(targetArea, 7);
  if (room.type === "kitchen") return Math.min(targetArea, 6);
  if (room.type === "living") return Math.min(targetArea, 12);
  return Math.max(1, roundScore(targetArea * 0.65));
}

function priorityForRoom(room: PlanDraftRoom): ResolvedRoomProgramItem["priority"] {
  if (isRequiredRoom(room)) return "essential";
  if (["balcony", "wc", "ensuite", "dining"].includes(room.type) || isOfficeLikeRoom(room)) {
    return "preferred";
  }
  return "optional";
}

function zoneForRoom(room: PlanDraftRoom): ResolvedRoomProgramItem["zone"] {
  if (["entry", "hallway"].includes(room.type)) return "circulation";
  if (["living", "kitchen", "dining"].includes(room.type)) return "public";
  if (["bedroom", "ensuite"].includes(room.type) || isOfficeLikeRoom(room)) return "private";
  if (room.type === "balcony") return "outdoor";
  return "service";
}

function daylightPriorityForRoom(room: PlanDraftRoom): ResolvedRoomProgramItem["daylightPriority"] {
  if (room.isExteriorPreferred && ["living", "bedroom", "kitchen", "dining"].includes(room.type)) {
    return "preferred";
  }
  if (isOfficeLikeRoom(room)) return "preferred";
  return "not_required";
}

function quietPriorityForRoom(room: PlanDraftRoom): ResolvedRoomProgramItem["quietPriority"] {
  if (room.type === "bedroom" || isOfficeLikeRoom(room)) return "high";
  if (zoneForRoom(room) === "private") return "medium";
  return "low";
}

function hasLivingKitchenRelationship(draft: PlanDraft) {
  const living = firstRoomOfType(draft.rooms, "living");
  const kitchen = firstRoomOfType(draft.rooms, "kitchen");

  if (!living || !kitchen) return false;

  return draft.adjacencies.some((adjacency) =>
    samePair(adjacency, living.id, kitchen.id) && adjacency.type !== "avoid"
  );
}

function samePair(adjacency: PlanDraftAdjacency, roomAId: string, roomBId: string) {
  return (
    (adjacency.roomAId === roomAId && adjacency.roomBId === roomBId) ||
    (adjacency.roomAId === roomBId && adjacency.roomBId === roomAId)
  );
}

function roomReferenceFor(draft: PlanDraft, roomId: string) {
  return draft.rooms.find((room) => room.id === roomId)?.name ?? roomId;
}

function firstRoomOfType(rooms: PlanDraftRoom[], type: RoomType) {
  return rooms.find((room) => room.type === type);
}

function countRooms(rooms: PlanDraftRoom[], type: RoomType) {
  return rooms.filter((room) => room.type === type).length;
}

function isDefaultRoom(room: PlanDraftRoom) {
  return ["entry", "hallway"].includes(room.type);
}

function isRequiredRoom(room: PlanDraftRoom) {
  return ["living", "kitchen", "bedroom", "bathroom"].includes(room.type);
}

function isOtherRequestedRoom(room: PlanDraftRoom) {
  if (["entry", "hallway", "living", "kitchen", "bedroom", "bathroom", "balcony", "dining", "storage", "laundry", "ensuite"].includes(room.type)) {
    return false;
  }

  return !isOfficeLikeRoom(room);
}

function isOfficeLikeRoom(room: Pick<PlanDraftRoom, "id" | "name" | "type">) {
  return room.type === "other" && (
    room.id.includes("office") ||
    room.name.toLowerCase().includes("office")
  );
}

function sum(values: number[]) {
  return roundScore(values.reduce((total, value) => total + value, 0));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundScore(value: number) {
  return Number(value.toFixed(2));
}
