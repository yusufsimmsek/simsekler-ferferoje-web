import { planDraftSchema } from "@/lib/schemas/ai-contracts.schema";
import type {
  PlanDraft,
  PlanDraftRoom
} from "@/lib/schemas/ai-contracts.schema";
import { resolvePlanningConstraints } from "./constraint-resolver";
import { resolvedPlanningSpecificationSchema } from "./resolved-planning-schema";
import type {
  ResolvedPlanningSpecification,
  ResolvedRoomProgramItem
} from "./resolved-planning-types";
import type { PlanningSpecification } from "./planning-types";

export type PlanningToDraftResult =
  | {
      ok: true;
      draft: PlanDraft;
      warnings: string[];
    }
  | {
      ok: false;
      draft: null;
      warnings: string[];
      issues: string[];
    };

export function mapPlanningSpecificationToPlanDraft(
  input: PlanningSpecification | ResolvedPlanningSpecification
): PlanningToDraftResult {
  if (input.schemaVersion === "resolved-planning-specification-v1") {
    return mapResolvedPlanningSpecificationToPlanDraft(input);
  }

  const resolution = resolvePlanningConstraints(input);

  if (!resolution.ok) {
    return {
      ok: false,
      draft: null,
      warnings: resolution.warnings,
      issues: resolution.issues
    };
  }

  return mapResolvedPlanningSpecificationToPlanDraft(resolution.data);
}

export function mapResolvedPlanningSpecificationToPlanDraft(
  input: ResolvedPlanningSpecification
): PlanningToDraftResult {
  const parsedResolution = resolvedPlanningSpecificationSchema.safeParse(input);

  if (!parsedResolution.success) {
    return {
      ok: false,
      draft: null,
      warnings: [],
      issues: parsedResolution.error.issues.map((issue) => issue.message)
    };
  }

  const resolution = parsedResolution.data;
  const specification = resolution.normalizedSpecification;

  if (specification.unsupportedRequests.length > 0) {
    return {
      ok: false,
      draft: null,
      warnings: resolution.warnings,
      issues: specification.unsupportedRequests.map((request) => request.message)
    };
  }

  if (specification.clarificationQuestions.length > 0) {
    return {
      ok: false,
      draft: null,
      warnings: resolution.warnings,
      issues: specification.clarificationQuestions.map(
        (question) => question.question
      )
    };
  }

  const rooms = estimateRoomAreas(resolution);
  const roomIds = new Set(rooms.map((room) => room.id));
  const adjacencies = resolution.relationshipGraph.edges
    .filter(
      (edge) =>
        roomIds.has(edge.fromRoomId) &&
        roomIds.has(edge.toRoomId) &&
        isDraftAdjacencyEdge(edge)
    )
    .map((edge) => ({
      roomAId: edge.fromRoomId,
      roomBId: edge.toRoomId,
      type:
        edge.priority === "required"
          ? "required" as const
          : edge.priority === "avoid" ||
              edge.relationship === "avoid" ||
              edge.relationship === "separate"
            ? "avoid" as const
            : "preferred" as const,
      reason: edge.reason
    }));
  const openings = buildOpeningIntents(
    rooms,
    resolution.resolvedRoomProgram.rooms
  );
  const assumptions = uniqueStrings([
    ...resolution.assumptions,
    ...resolution.compromises
      .filter((compromise) => compromise.applied)
      .map((compromise) => `Planning compromise: ${compromise.description}`),
    "Room areas were estimated deterministically from the resolved planning program.",
    "Final coordinates are owned by the layout engine."
  ]);
  const parsedDraft = planDraftSchema.safeParse({
    title: specification.title,
    units: "m",
    rooms,
    adjacencies: uniqueAdjacencies(adjacencies).slice(0, 30),
    openings,
    assumptions
  });

  if (!parsedDraft.success) {
    return {
      ok: false,
      draft: null,
      warnings: resolution.warnings,
      issues: parsedDraft.error.issues.map((issue) => issue.message)
    };
  }

  return {
    ok: true,
    draft: parsedDraft.data,
    warnings: resolution.warnings
  };
}

function estimateRoomAreas(
  resolution: ResolvedPlanningSpecification
): PlanDraftRoom[] {
  const specification = resolution.normalizedSpecification;
  const weighted = resolution.resolvedRoomProgram.rooms.map((room) => ({
    room,
    area:
      room.baseTargetArea *
      priorityMultiplier(room, resolution) *
      mergedUseMultiplier(room, resolution)
  }));
  const currentTotal = weighted.reduce((sum, item) => sum + item.area, 0);
  const scale =
    currentTotal > 0
      ? resolution.resolvedRoomProgram.targetUsableArea / currentTotal
      : 1;

  return weighted.map(({ room, area }) => ({
    id: room.id,
    name: room.name,
    type: room.type,
    targetArea: roundArea(Math.max(room.minimumArea, area * scale)),
    isWetArea: room.isWetArea,
    isExteriorPreferred:
      room.isExteriorPreferred ||
      (specification.priorities.daylight === "high" &&
        room.daylightPriority !== "not_required")
  }));
}

function priorityMultiplier(
  room: ResolvedRoomProgramItem,
  resolution: ResolvedPlanningSpecification
) {
  const priorities = resolution.normalizedSpecification.priorities;
  let multiplier = 1;

  if (room.type === "living" && priorities.entertaining === "high") {
    multiplier *= 1.18;
  }
  if (room.type === "kitchen" && priorities.cooking === "high") {
    multiplier *= 1.2;
  }
  if (room.zone === "private" && priorities.privacy === "high") {
    multiplier *= 1.06;
  }
  if (room.type === "storage" && priorities.storage === "high") {
    multiplier *= 1.18;
  }
  if (
    room.daylightPriority !== "not_required" &&
    priorities.daylight === "high"
  ) {
    multiplier *= 1.04;
  }
  if (
    (room.type === "hallway" || room.type === "entry") &&
    resolution.normalizedSpecification.household.accessibilityNeeds.length > 0
  ) {
    multiplier *= 1.12;
  }

  return multiplier;
}

function mergedUseMultiplier(
  room: ResolvedRoomProgramItem,
  resolution: ResolvedPlanningSpecification
) {
  const mergedUses = resolution.resolvedRoomProgram.mergedSpaces.filter(
    (merged) => merged.primaryRoomId === room.id
  ).length;

  return 1 + mergedUses * 0.08;
}

function buildOpeningIntents(
  rooms: PlanDraftRoom[],
  resolvedRooms: ResolvedRoomProgramItem[]
): PlanDraft["openings"] {
  const resolvedById = new Map(
    resolvedRooms.map((room) => [room.id, room])
  );
  const openings: PlanDraft["openings"] = [];

  if (rooms.some((room) => room.id === "room_entry")) {
    openings.push({
      type: "door",
      roomId: "room_entry",
      preferredEdge: "exterior",
      width: 1
    });
  }

  rooms.forEach((room) => {
    const resolvedRoom = resolvedById.get(room.id);

    if (
      !resolvedRoom ||
      resolvedRoom.type === "balcony" ||
      (!room.isExteriorPreferred &&
        resolvedRoom.daylightPriority === "not_required")
    ) {
      return;
    }

    openings.push({
      type: "window",
      roomId: room.id,
      preferredEdge: "exterior",
      width:
        room.type === "living"
          ? 1.8
          : room.id === "room_office"
            ? 1.4
            : 1.2
    });
  });

  return openings.slice(0, 24);
}

function uniqueAdjacencies(values: PlanDraft["adjacencies"]) {
  return Array.from(
    new Map(
      values.map((value) => [
        [
          value.roomAId,
          value.roomBId,
          value.type
        ]
          .sort()
          .join(":"),
        value
      ])
    ).values()
  );
}

function isDraftAdjacencyEdge(
  edge: ResolvedPlanningSpecification["relationshipGraph"]["edges"][number]
) {
  if (
    edge.ruleId === "rule_bedroom_private_zone" ||
    edge.ruleId === "rule_bathroom_access"
  ) {
    return false;
  }

  return true;
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function roundArea(value: number) {
  return Number(value.toFixed(2));
}
