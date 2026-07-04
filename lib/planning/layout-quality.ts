import type { FloorPlan, Room } from "@/lib/floor-plan/types";
import { resolvedPlanningSpecificationSchema } from "./resolved-planning-schema";
import type { ResolvedPlanningSpecification } from "./resolved-planning-types";
import {
  centerDistance,
  hasConnectingDoor,
  roomHasWindow,
  roomTouchesBounds,
  roomsShareEdge,
  scorePlanningRelationships
} from "./relationship-scoring";
import { layoutQualityReportSchema } from "./quality-schema";
import type {
  LayoutQualityMetric,
  LayoutQualityRecommendation,
  LayoutQualityReport,
  LayoutQualityWarning
} from "./quality-types";

const metricWeights = {
  relationshipSatisfaction: 0.18,
  circulation: 0.12,
  privacy: 0.1,
  daylight: 0.1,
  accessibility: 0.08,
  efficiency: 0.1,
  adjacency: 0.1,
  geometry: 0.14,
  roomBalance: 0.08
} as const;

export type LayoutQualityAnalysisResult =
  | {
      ok: true;
      report: LayoutQualityReport;
      issues: [];
    }
  | {
      ok: false;
      report: null;
      issues: string[];
    };

export function analyzeLayoutQuality(input: {
  planning: ResolvedPlanningSpecification;
  plan: FloorPlan;
}): LayoutQualityAnalysisResult {
  const planningParse = resolvedPlanningSpecificationSchema.safeParse(
    input.planning
  );

  if (!planningParse.success) {
    return {
      ok: false,
      report: null,
      issues: planningParse.error.issues.map((issue) => issue.message)
    };
  }

  const planning = planningParse.data;
  const relationships = scorePlanningRelationships({
    planning,
    plan: input.plan
  });
  const circulation = scoreCirculation(planning, input.plan);
  const privacy = scorePrivacy(planning, input.plan);
  const daylight = scoreDaylight(planning, input.plan);
  const accessibility = scoreAccessibility(planning, input.plan);
  const efficiency = scoreEfficiency(input.plan);
  const geometry = scoreGeometry(input.plan);
  const roomBalance = scoreRoomBalance(planning, input.plan);
  const relationshipMetric = metric(
    relationships.score,
    metricWeights.relationshipSatisfaction,
    [
      `${relationships.satisfied.length} relationships were fully satisfied.`,
      `${relationships.failed.length} relationships were partial or failed.`
    ]
  );
  const adjacencyMetric = metric(
    relationships.adjacencyScore,
    metricWeights.adjacency,
    [
      "Adjacency measures positive connected, adjacent, and near relationships independently from separation constraints."
    ]
  );
  const metricDetails = {
    relationshipSatisfaction: relationshipMetric,
    circulation,
    privacy,
    daylight,
    accessibility,
    efficiency,
    adjacency: adjacencyMetric,
    geometry,
    roomBalance
  };
  const overallScore = weightedOverallScore(metricDetails);
  const warnings = buildWarnings({
    planning,
    plan: input.plan,
    relationships,
    circulation,
    privacy,
    daylight,
    accessibility,
    efficiency,
    geometry,
    roomBalance
  });
  const recommendations = buildRecommendations({
    planning,
    plan: input.plan,
    relationships,
    warnings
  });
  const reportParse = layoutQualityReportSchema.safeParse({
    schemaVersion: "layout-quality-report-v1",
    overallScore,
    rating: qualityRating(overallScore),
    relationshipSatisfactionScore: relationshipMetric.score,
    circulationScore: circulation.score,
    privacyScore: privacy.score,
    daylightScore: daylight.score,
    accessibilityScore: accessibility.score,
    efficiencyScore: efficiency.score,
    adjacencyScore: adjacencyMetric.score,
    geometryScore: geometry.score,
    roomBalanceScore: roomBalance.score,
    metricDetails,
    warnings,
    recommendations,
    failedConstraints: relationships.failed,
    satisfiedConstraints: relationships.satisfied,
    metadata: {
      analyzer: "deterministic-layout-quality-analyzer-v1",
      relationshipScorer: "relationship-satisfaction-v1",
      inputPlanSchemaVersion: "floor-plan-v1",
      inputPlanningSchemaVersion: "resolved-planning-specification-v1",
      deterministic: true
    }
  });

  if (!reportParse.success) {
    return {
      ok: false,
      report: null,
      issues: reportParse.error.issues.map((issue) => issue.message)
    };
  }

  return {
    ok: true,
    report: reportParse.data,
    issues: []
  };
}

function scoreCirculation(
  planning: ResolvedPlanningSpecification,
  plan: FloorPlan
): LayoutQualityMetric {
  const totalRoomArea = sum(plan.rooms.map((room) => room.area));
  const circulationRooms = plan.rooms.filter((room) =>
    ["entry", "hallway"].includes(room.type)
  );
  const circulationArea = sum(circulationRooms.map((room) => room.area));
  const circulationRatio =
    totalRoomArea > 0 ? circulationArea / totalRoomArea : 0;
  const areaScore =
    circulationRatio <= 0.18
      ? 100
      : circulationRatio <= 0.22
        ? 80
        : circulationRatio <= 0.28
          ? 55
          : 25;
  const reachable = reachableRoomsFromEntry(plan);
  const roomsRequiringAccess = planning.relationshipGraph.nodes.filter(
    (node) => node.zone !== "outdoor"
  );
  const accessCoverage =
    roomsRequiringAccess.length > 0
      ? roomsRequiringAccess.filter((node) => reachable.has(node.roomId)).length /
        roomsRequiringAccess.length
      : 1;
  const score = roundScore(areaScore * 0.55 + accessCoverage * 100 * 0.45);

  return metric(score, metricWeights.circulation, [
    `Entry and hallway area is ${(circulationRatio * 100).toFixed(1)}% of total room area.`,
    `${Math.round(accessCoverage * 100)}% of non-outdoor rooms are reachable through the door graph from the entry.`
  ]);
}

function scorePrivacy(
  planning: ResolvedPlanningSpecification,
  plan: FloorPlan
): LayoutQualityMetric {
  const privateNodes = planning.relationshipGraph.nodes.filter(
    (node) => node.zone === "private" || node.quietPriority === "high"
  );
  const noisyRoomIds = new Set(
    plan.rooms
      .filter((room) => ["living", "kitchen", "dining"].includes(room.type))
      .map((room) => room.id)
  );
  const scores = privateNodes.map((node) => {
    const room = plan.rooms.find((candidate) => candidate.id === node.roomId);

    if (!room) return 0;

    const noisyRooms = plan.rooms.filter((candidate) =>
      noisyRoomIds.has(candidate.id)
    );
    const directlyConnected = noisyRooms.some((noisyRoom) =>
      hasConnectingDoor(plan, room.id, noisyRoom.id)
    );
    const sharesNoisyEdge = noisyRooms.some((noisyRoom) =>
      roomsShareEdge(room, noisyRoom)
    );
    const minimumDistance =
      noisyRooms.length > 0
        ? Math.min(
            ...noisyRooms.map((noisyRoom) => centerDistance(room, noisyRoom))
          )
        : 8;

    if (directlyConnected) return 25;
    if (sharesNoisyEdge) return 50;
    if (minimumDistance < 4) return 70;
    return 100;
  });
  const score = scores.length > 0 ? average(scores) : 100;

  return metric(score, metricWeights.privacy, [
    `${privateNodes.length} private or quiet-priority rooms were evaluated against living, kitchen, and dining activity.`,
    planning.normalizedSpecification.priorities.privacy === "high"
      ? "The planning brief marked privacy as high priority."
      : "Standard residential privacy expectations were applied."
  ]);
}

function scoreDaylight(
  planning: ResolvedPlanningSpecification,
  plan: FloorPlan
): LayoutQualityMetric {
  const daylightNodes = planning.relationshipGraph.nodes.filter(
    (node) => node.daylightPriority !== "not_required"
  );
  const scores = daylightNodes.map((node) => {
    const room = plan.rooms.find((candidate) => candidate.id === node.roomId);

    if (!room) return 0;

    const hasWindow = roomHasWindow(plan, room.id);
    const exterior = roomTouchesBounds(plan, room);

    if (hasWindow && exterior) return 100;
    if (exterior) return 55;
    return 0;
  });
  const score = scores.length > 0 ? average(scores) : 100;

  return metric(score, metricWeights.daylight, [
    `${daylightNodes.length} daylight-priority rooms were checked for exterior position and windows.`,
    `${scores.filter((value) => value === 100).length} rooms have both an exterior opportunity and a window.`
  ]);
}

function scoreAccessibility(
  planning: ResolvedPlanningSpecification,
  plan: FloorPlan
): LayoutQualityMetric {
  const accessibilityRequested =
    planning.normalizedSpecification.household.accessibilityNeeds.length > 0;

  if (!accessibilityRequested) {
    return metric(100, metricWeights.accessibility, [
      "No special accessibility intent was requested; this score is neutral and is not a compliance assessment."
    ]);
  }

  const circulationRooms = plan.rooms.filter((room) =>
    ["entry", "hallway"].includes(room.type)
  );
  const widthCoverage =
    circulationRooms.length > 0
      ? circulationRooms.filter(
          (room) => Math.min(room.layout.width, room.layout.height) >= 1.5
        ).length / circulationRooms.length
      : 0;
  const relevantDoors = plan.doors.filter((door) => door.type !== "balcony");
  const doorCoverage =
    relevantDoors.length > 0
      ? relevantDoors.filter((door) => door.width >= 0.9).length /
        relevantDoors.length
      : 0;
  const score = roundScore(widthCoverage * 60 + doorCoverage * 40);

  return metric(score, metricWeights.accessibility, [
    `${Math.round(widthCoverage * 100)}% of circulation rooms have at least 1.5 m conceptual minimum dimension.`,
    `${Math.round(doorCoverage * 100)}% of evaluated doors are at least 0.9 m wide.`,
    "This heuristic does not establish accessibility compliance."
  ]);
}

function scoreEfficiency(plan: FloorPlan): LayoutQualityMetric {
  const roomArea = sum(plan.rooms.map((room) => room.area));
  const boundsArea = plan.bounds.width * plan.bounds.height;
  const occupancy = boundsArea > 0 ? roomArea / boundsArea : 0;
  const score =
    occupancy >= 0.88
      ? 100
      : occupancy >= 0.78
        ? 90
        : occupancy >= 0.68
          ? 75
          : occupancy >= 0.55
            ? 55
            : 30;

  return metric(score, metricWeights.efficiency, [
    `Rooms occupy ${(occupancy * 100).toFixed(1)}% of the rectangular plan bounds.`,
    "Higher occupancy indicates a more compact conceptual layout with less unused bounding area."
  ]);
}

function scoreGeometry(plan: FloorPlan): LayoutQualityMetric {
  const overlapPairs = overlappingRoomPairs(plan.rooms);
  const outsideRooms = plan.rooms.filter(
    (room) => !roomFitsWithinBounds(room, plan)
  );
  const awkwardRooms = plan.rooms.filter((room) => {
    const ratio = aspectRatio(room);
    return ratio > 4.5;
  });
  const score = clamp(
    100 -
      overlapPairs.length * 35 -
      outsideRooms.length * 25 -
      awkwardRooms.length * 5,
    0,
    100
  );

  return metric(score, metricWeights.geometry, [
    `${overlapPairs.length} overlapping room pairs were detected.`,
    `${outsideRooms.length} rooms extend outside plan bounds.`,
    `${awkwardRooms.length} rooms have an aspect ratio above 4.5.`
  ]);
}

function scoreRoomBalance(
  planning: ResolvedPlanningSpecification,
  plan: FloorPlan
): LayoutQualityMetric {
  const resolvedById = new Map(
    planning.resolvedRoomProgram.rooms.map((room) => [room.id, room])
  );
  const scores = plan.rooms.map((room) => {
    const resolved = resolvedById.get(room.id);
    const target = room.targetArea ?? resolved?.baseTargetArea ?? room.area;
    const ratio = target > 0 ? room.area / target : 1;
    const areaFit =
      ratio >= 0.8 && ratio <= 1.35
        ? 100
        : ratio >= 0.65 && ratio <= 1.6
          ? 75
          : 40;
    const minimumFit =
      resolved && room.area < resolved.minimumArea ? 35 : 100;
    const shapeFit = aspectRatio(room) <= 3.5 ? 100 : 60;

    return areaFit * 0.55 + minimumFit * 0.3 + shapeFit * 0.15;
  });
  const score = scores.length > 0 ? average(scores) : 100;

  return metric(score, metricWeights.roomBalance, [
    `${plan.rooms.length} room areas were compared with resolved targets and minimums.`,
    "Room balance rewards reasonable target fit without requiring equal room sizes."
  ]);
}

function buildWarnings(input: {
  planning: ResolvedPlanningSpecification;
  plan: FloorPlan;
  relationships: ReturnType<typeof scorePlanningRelationships>;
  circulation: LayoutQualityMetric;
  privacy: LayoutQualityMetric;
  daylight: LayoutQualityMetric;
  accessibility: LayoutQualityMetric;
  efficiency: LayoutQualityMetric;
  geometry: LayoutQualityMetric;
  roomBalance: LayoutQualityMetric;
}) {
  const warnings: LayoutQualityWarning[] = [];

  input.relationships.failed.forEach((constraint) => {
    const special = warningForFailedConstraint(constraint.ruleId);

    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: special?.code ?? "relationship_failed",
      severity: constraint.priority === "required" ? "warning" : "info",
      message: special?.message ?? `Planning relationship ${constraint.ruleId} was not fully satisfied.`,
      roomIds: [constraint.fromRoomId, constraint.toRoomId]
    });
  });

  if (input.circulation.score < 65) {
    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: "excessive_circulation",
      severity: "warning",
      message:
        "Circulation is inefficient because hallway area or door-network access is weak.",
      roomIds: input.plan.rooms
        .filter((room) => ["entry", "hallway"].includes(room.type))
        .map((room) => room.id)
    });
  }

  if (input.privacy.score < 65) {
    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: "bedroom_privacy_low",
      severity: "warning",
      message:
        "One or more bedrooms or quiet rooms are too close or directly connected to public activity.",
      roomIds: input.planning.relationshipGraph.nodes
        .filter((node) => node.zone === "private")
        .map((node) => node.roomId)
    });
  }

  if (input.daylight.score < 70) {
    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: "daylight_opportunity_missing",
      severity: "warning",
      message:
        "Some daylight-priority rooms lack both an exterior opportunity and a window.",
      roomIds: input.planning.relationshipGraph.nodes
        .filter((node) => node.daylightPriority !== "not_required")
        .filter((node) => !roomHasWindow(input.plan, node.roomId))
        .map((node) => node.roomId)
    });
  }

  if (input.accessibility.score < 65) {
    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: "accessibility_constrained",
      severity: "warning",
      message:
        "Conceptual circulation widths or door widths are constrained for the requested accessibility intent.",
      roomIds: input.plan.rooms
        .filter((room) => ["entry", "hallway"].includes(room.type))
        .map((room) => room.id)
    });
  }

  if (input.efficiency.score < 65) {
    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: "layout_not_compact",
      severity: "warning",
      message:
        "The plan bounds contain a high proportion of unused area, reducing compactness.",
      roomIds: []
    });
  }

  overlappingRoomPairs(input.plan.rooms).forEach(([roomA, roomB]) => {
    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: "geometry_overlap",
      severity: "critical",
      message: `${roomA.name} overlaps ${roomB.name}.`,
      roomIds: [roomA.id, roomB.id]
    });
  });

  input.plan.rooms
    .filter((room) => !roomFitsWithinBounds(room, input.plan))
    .forEach((room) => {
      warnings.push({
        id: `quality_warning_${warnings.length + 1}`,
        code: "room_outside_bounds",
        severity: "critical",
        message: `${room.name} extends outside the declared plan bounds.`,
        roomIds: [room.id]
      });
    });

  input.plan.rooms
    .filter((room) => isAwkwardTinyRoom(room, input.planning))
    .forEach((room) => {
      warnings.push({
        id: `quality_warning_${warnings.length + 1}`,
        code: "awkward_tiny_room",
        severity: "warning",
        message: `${room.name} is below its resolved minimum or has an awkward minimum dimension.`,
        roomIds: [room.id]
      });
    });

  if (input.roomBalance.score < 65) {
    warnings.push({
      id: `quality_warning_${warnings.length + 1}`,
      code: "poor_room_balance",
      severity: "warning",
      message:
        "Several room areas differ substantially from their resolved targets or minimums.",
      roomIds: input.plan.rooms.map((room) => room.id)
    });
  }

  return uniqueWarnings(warnings);
}

function buildRecommendations(input: {
  planning: ResolvedPlanningSpecification;
  plan: FloorPlan;
  relationships: ReturnType<typeof scorePlanningRelationships>;
  warnings: LayoutQualityWarning[];
}) {
  const recommendations: LayoutQualityRecommendation[] = [];
  const warningCodes = new Set(input.warnings.map((warning) => warning.code));

  input.relationships.failed.forEach((constraint) => {
    const special = recommendationForFailedConstraint(constraint.ruleId);

    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: special?.code ?? "review_failed_relationship",
      priority: constraint.priority === "required" ? "high" : "medium",
      message:
        special?.message ??
        `Review the placement of ${constraint.fromRoomId} and ${constraint.toRoomId} to better satisfy ${constraint.expectedRelationship}.`,
      roomIds: [constraint.fromRoomId, constraint.toRoomId]
    });
  });

  if (warningCodes.has("excessive_circulation")) {
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "reduce_hallway_area",
      priority: "high",
      message:
        "Reduce hallway area and connect private rooms through shorter circulation paths.",
      roomIds: input.plan.rooms
        .filter((room) => ["entry", "hallway"].includes(room.type))
        .map((room) => room.id)
    });
  }

  if (warningCodes.has("bedroom_privacy_low")) {
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "increase_bedroom_privacy",
      priority: "medium",
      message:
        "Separate bedroom access from the living and kitchen zone through hall circulation.",
      roomIds: input.planning.relationshipGraph.nodes
        .filter((node) => node.zone === "private")
        .map((node) => node.roomId)
    });
  }

  if (warningCodes.has("daylight_opportunity_missing")) {
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "add_daylight_opening",
      priority: "medium",
      message:
        "Move daylight-priority rooms toward exterior edges or add an exterior window opportunity.",
      roomIds: input.warnings
        .filter((warning) => warning.code === "daylight_opportunity_missing")
        .flatMap((warning) => warning.roomIds)
    });
  }

  if (warningCodes.has("awkward_tiny_room")) {
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "enlarge_tiny_room",
      priority: "high",
      message:
        "Enlarge undersized rooms, combine optional uses, or increase the target area.",
      roomIds: input.warnings
        .filter((warning) => warning.code === "awkward_tiny_room")
        .flatMap((warning) => warning.roomIds)
    });
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "combine_rooms",
      priority: "medium",
      message:
        "Combine compatible optional rooms when separate rooms cannot maintain usable dimensions.",
      roomIds: input.warnings
        .filter((warning) => warning.code === "awkward_tiny_room")
        .flatMap((warning) => warning.roomIds)
    });
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "increase_target_area",
      priority: "medium",
      message:
        "Increase the target area if essential rooms cannot meet their conceptual minimums.",
      roomIds: []
    });
  }

  if (warningCodes.has("poor_room_balance")) {
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "rebalance_room_areas",
      priority: "medium",
      message:
        "Rebalance room targets so essential rooms meet minimums without oversized secondary spaces.",
      roomIds: input.plan.rooms.map((room) => room.id)
    });
  }

  if (warningCodes.has("layout_not_compact")) {
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "compact_layout",
      priority: "medium",
      message:
        "Reduce unused bounding area by arranging rooms in a more compact envelope.",
      roomIds: []
    });
  }

  const kitchen = input.plan.rooms.find((room) => room.type === "kitchen");
  const resolvedKitchen = input.planning.resolvedRoomProgram.rooms.find(
    (room) => room.type === "kitchen"
  );

  if (
    kitchen &&
    resolvedKitchen &&
    input.planning.normalizedSpecification.priorities.cooking === "high" &&
    kitchen.area < resolvedKitchen.baseTargetArea * 0.85
  ) {
    recommendations.push({
      id: `quality_recommendation_${recommendations.length + 1}`,
      code: "enlarge_kitchen",
      priority: "medium",
      message:
        "Enlarge the kitchen to better reflect the high cooking priority.",
      roomIds: [kitchen.id]
    });
  }

  return uniqueRecommendations(recommendations);
}

function warningForFailedConstraint(ruleId: string): {
  code: LayoutQualityWarning["code"];
  message: string;
} | null {
  if (ruleId === "rule_balcony_living_connection") {
    return {
      code: "balcony_isolated",
      message: "The balcony is too isolated from the living room."
    };
  }
  if (ruleId === "rule_office_quiet_daylight") {
    return {
      code: "office_not_quiet",
      message: "The office is not sufficiently separated from noisy public spaces."
    };
  }
  if (ruleId === "rule_bathroom_access") {
    return {
      code: "bathroom_access_poor",
      message: "Bathroom access is weak relative to hall or bedroom circulation."
    };
  }
  if (ruleId === "rule_privacy_priority") {
    return {
      code: "bedroom_privacy_low",
      message: "A private bedroom remains too close to the public living zone."
    };
  }
  return null;
}

function recommendationForFailedConstraint(ruleId: string): {
  code: LayoutQualityRecommendation["code"];
  message: string;
} | null {
  if (ruleId === "rule_balcony_living_connection") {
    return {
      code: "move_balcony_to_living",
      message: "Move the balcony closer to the living room and provide a direct opening."
    };
  }
  if (ruleId === "rule_office_quiet_daylight") {
    return {
      code: "separate_office_from_public_zone",
      message: "Separate the office from living and kitchen activity while retaining daylight access."
    };
  }
  if (ruleId === "rule_bathroom_access") {
    return {
      code: "improve_bathroom_access",
      message: "Move the bathroom closer to hall or bedroom circulation."
    };
  }
  if (ruleId === "rule_privacy_priority") {
    return {
      code: "increase_bedroom_privacy",
      message: "Use hall circulation to separate bedrooms from public rooms."
    };
  }
  return null;
}

function reachableRoomsFromEntry(plan: FloorPlan) {
  const entry =
    plan.rooms.find((room) => room.type === "entry") ??
    plan.rooms.find((room) => room.type === "living") ??
    plan.rooms[0];
  const graph = new Map<string, Set<string>>();

  plan.rooms.forEach((room) => graph.set(room.id, new Set()));
  plan.doors.forEach((door) => {
    if (!door.toRoomId) return;
    graph.get(door.fromRoomId)?.add(door.toRoomId);
    graph.get(door.toRoomId)?.add(door.fromRoomId);
  });

  const visited = new Set<string>([entry.id]);
  const queue = [entry.id];

  while (queue.length > 0) {
    const current = queue.shift()!;

    graph.get(current)?.forEach((neighbor) => {
      if (visited.has(neighbor)) return;
      visited.add(neighbor);
      queue.push(neighbor);
    });
  }

  return visited;
}

function overlappingRoomPairs(rooms: Room[]) {
  const pairs: Array<[Room, Room]> = [];

  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      if (rectanglesOverlap(rooms[first], rooms[second])) {
        pairs.push([rooms[first], rooms[second]]);
      }
    }
  }

  return pairs;
}

function rectanglesOverlap(a: Room, b: Room) {
  return !(
    a.layout.x + a.layout.width <= b.layout.x + 0.01 ||
    b.layout.x + b.layout.width <= a.layout.x + 0.01 ||
    a.layout.y + a.layout.height <= b.layout.y + 0.01 ||
    b.layout.y + b.layout.height <= a.layout.y + 0.01
  );
}

function roomFitsWithinBounds(room: Room, plan: FloorPlan) {
  return (
    room.layout.x >= plan.bounds.x &&
    room.layout.y >= plan.bounds.y &&
    room.layout.x + room.layout.width <=
      plan.bounds.x + plan.bounds.width + 0.01 &&
    room.layout.y + room.layout.height <=
      plan.bounds.y + plan.bounds.height + 0.01
  );
}

function isAwkwardTinyRoom(
  room: Room,
  planning: ResolvedPlanningSpecification
) {
  const resolved = planning.resolvedRoomProgram.rooms.find(
    (candidate) => candidate.id === room.id
  );
  const belowMinimum = resolved ? room.area < resolved.minimumArea : false;
  const minimumDimension = Math.min(room.layout.width, room.layout.height);

  return belowMinimum || minimumDimension < minimumDimensionFor(room);
}

function minimumDimensionFor(room: Room) {
  if (room.type === "hallway") return 1.1;
  if (room.type === "wc") return 1.1;
  if (room.type === "balcony") return 0.9;
  if (room.type === "entry") return 1;
  return 1.5;
}

function aspectRatio(room: Room) {
  const longer = Math.max(room.layout.width, room.layout.height);
  const shorter = Math.min(room.layout.width, room.layout.height);

  return shorter > 0 ? longer / shorter : Number.POSITIVE_INFINITY;
}

function weightedOverallScore(
  details: LayoutQualityReport["metricDetails"]
) {
  return roundScore(
    details.relationshipSatisfaction.score *
      details.relationshipSatisfaction.weight +
      details.circulation.score * details.circulation.weight +
      details.privacy.score * details.privacy.weight +
      details.daylight.score * details.daylight.weight +
      details.accessibility.score * details.accessibility.weight +
      details.efficiency.score * details.efficiency.weight +
      details.adjacency.score * details.adjacency.weight +
      details.geometry.score * details.geometry.weight +
      details.roomBalance.score * details.roomBalance.weight
  );
}

function qualityRating(score: number): LayoutQualityReport["rating"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

function metric(
  score: number,
  weight: number,
  rationale: string[]
): LayoutQualityMetric {
  return {
    score: roundScore(clamp(score, 0, 100)),
    weight,
    rationale
  };
}

function uniqueWarnings(warnings: LayoutQualityWarning[]) {
  return Array.from(
    new Map(
      warnings.map((warning) => [
        `${warning.code}:${warning.roomIds.slice().sort().join(":")}`,
        warning
      ])
    ).values()
  ).map((warning, index) => ({
    ...warning,
    id: `quality_warning_${index + 1}`
  }));
}

function uniqueRecommendations(
  recommendations: LayoutQualityRecommendation[]
) {
  return Array.from(
    new Map(
      recommendations.map((recommendation) => [
        `${recommendation.code}:${recommendation.roomIds
          .slice()
          .sort()
          .join(":")}`,
        recommendation
      ])
    ).values()
  ).map((recommendation, index) => ({
    ...recommendation,
    id: `quality_recommendation_${index + 1}`
  }));
}

function average(values: number[]) {
  return roundScore(sum(values) / values.length);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundScore(value: number) {
  return Number(value.toFixed(2));
}
