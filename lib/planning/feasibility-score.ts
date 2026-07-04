import type { PlanningSpecification } from "./planning-types";
import type {
  PlanningConflict,
  PlanningFeasibilityScore,
  PlanningRelationshipGraph,
  ResolvedRoomProgram
} from "./resolved-planning-types";

const weights = {
  roomProgram: 0.18,
  area: 0.22,
  adjacency: 0.15,
  daylight: 0.1,
  privacy: 0.1,
  accessibility: 0.1,
  complexityFeasibility: 0.08,
  confidence: 0.07
} as const;

export function calculatePlanningFeasibility(input: {
  specification: PlanningSpecification;
  roomProgram: ResolvedRoomProgram;
  relationshipGraph: PlanningRelationshipGraph;
  conflicts: PlanningConflict[];
}): PlanningFeasibilityScore {
  const roomProgram = roomProgramScore(input.roomProgram);
  const area = areaScore(input.roomProgram);
  const adjacency = adjacencyScore(input.relationshipGraph, input.conflicts);
  const daylight = daylightScore(input.specification, input.roomProgram);
  const privacy = privacyScore(input.specification, input.relationshipGraph);
  const accessibility = accessibilityScore(input.specification);
  const complexityScore = calculateComplexityScore(
    input.roomProgram,
    input.relationshipGraph
  );
  const complexityFeasibility = clamp(100 - complexityScore * 0.65, 0, 100);
  const confidence = roundScore(input.specification.confidenceScore * 100);
  const componentScores = {
    roomProgram,
    area,
    adjacency,
    daylight,
    privacy,
    accessibility,
    complexityFeasibility,
    confidence
  };
  const weightedScore = Object.entries(componentScores).reduce(
    (total, [key, score]) =>
      total + score * weights[key as keyof typeof weights],
    0
  );
  const conflictPenalty = input.conflicts.reduce(
    (total, conflict) => total + (conflict.severity === "critical" ? 12 : 5),
    0
  );
  const overallScore = roundScore(clamp(weightedScore - conflictPenalty, 0, 100));

  return {
    overallScore,
    rating: feasibilityRating(overallScore),
    complexityScore: roundScore(complexityScore),
    breakdown: {
      roomProgram: component(
        roomProgram,
        weights.roomProgram,
        roomProgram >= 75
          ? "The resolved room count fits the 12-room MVP program."
          : "The requested room program required omissions or significant compression."
      ),
      area: component(
        area,
        weights.area,
        areaRationale(input.roomProgram)
      ),
      adjacency: component(
        adjacency,
        weights.adjacency,
        `${input.relationshipGraph.edges.length} deterministic relationship constraints were evaluated.`
      ),
      daylight: component(
        daylight,
        weights.daylight,
        input.specification.priorities.daylight === "high"
          ? "Living, bedroom, and office daylight access is treated as a high planning priority."
          : "Daylight remains a standard exterior preference."
      ),
      privacy: component(
        privacy,
        weights.privacy,
        input.specification.priorities.privacy === "high"
          ? "Private rooms are zoned away from public activity."
          : "The room program uses standard private/public zoning."
      ),
      accessibility: component(
        accessibility,
        weights.accessibility,
        input.specification.household.accessibilityNeeds.length > 0
          ? "Accessibility intent was scored against available conceptual area."
          : "No special accessibility constraint was requested."
      ),
      complexityFeasibility: component(
        complexityFeasibility,
        weights.complexityFeasibility,
        `Program complexity is ${roundScore(complexityScore)} out of 100, where higher means harder to resolve.`
      ),
      confidence: component(
        confidence,
        weights.confidence,
        "Confidence comes from the validated PlanningSpecification."
      )
    }
  };
}

function roomProgramScore(program: ResolvedRoomProgram) {
  const retention = program.resolvedRoomCount / program.requestedRoomCount;
  const omissionPenalty = program.omittedRooms.length * 8;

  return roundScore(clamp(retention * 100 - omissionPenalty, 0, 100));
}

function areaScore(program: ResolvedRoomProgram) {
  const ratio = program.targetUsableArea / program.estimatedMinimumArea;

  if (ratio >= 1.25) return 100;
  if (ratio >= 1.1) return 92;
  if (ratio >= 1) return 82;
  if (ratio >= 0.85) return 62;
  if (ratio >= 0.7) return 42;
  if (ratio >= 0.55) return 24;
  return 10;
}

function adjacencyScore(
  graph: PlanningRelationshipGraph,
  conflicts: PlanningConflict[]
) {
  const criticalRelationshipConflicts = conflicts.filter(
    (conflict) =>
      conflict.severity === "critical" &&
      conflict.code === "open_and_separate_kitchen"
  ).length;
  const edgeDensityPenalty = Math.max(0, graph.edges.length - graph.nodes.length * 2) * 2;

  return roundScore(
    clamp(96 - criticalRelationshipConflicts * 35 - edgeDensityPenalty, 0, 100)
  );
}

function daylightScore(
  specification: PlanningSpecification,
  program: ResolvedRoomProgram
) {
  const daylightRooms = program.rooms.filter(
    (room) => room.daylightPriority !== "not_required"
  );
  const exteriorPreferred = daylightRooms.filter(
    (room) => room.isExteriorPreferred
  ).length;
  const coverage =
    daylightRooms.length > 0 ? exteriorPreferred / daylightRooms.length : 1;
  const base = coverage * 100;

  return roundScore(
    specification.priorities.daylight === "high"
      ? base
      : Math.max(85, base)
  );
}

function privacyScore(
  specification: PlanningSpecification,
  graph: PlanningRelationshipGraph
) {
  const privateNodes = graph.nodes.filter((node) => node.zone === "private");
  const privateCoverage =
    privateNodes.length === 0
      ? 1
      : privateNodes.filter((node) => node.quietPriority === "high").length /
        privateNodes.length;
  const separationEdges = graph.edges.filter(
    (edge) =>
      edge.priority === "avoid" &&
      (edge.fromRoomId === "room_living" || edge.toRoomId === "room_living")
  ).length;

  if (specification.priorities.privacy !== "high") {
    return roundScore(Math.max(85, privateCoverage * 100));
  }

  return roundScore(
    clamp(privateCoverage * 75 + Math.min(separationEdges, 3) * 8, 0, 100)
  );
}

function accessibilityScore(specification: PlanningSpecification) {
  if (specification.household.accessibilityNeeds.length === 0) return 100;

  const area = specification.targetArea ?? 0;

  if (area >= 100) return 92;
  if (area >= 80) return 78;
  if (area >= 65) return 58;
  return 30;
}

function calculateComplexityScore(
  program: ResolvedRoomProgram,
  graph: PlanningRelationshipGraph
) {
  const specialRooms = program.rooms.filter((room) =>
    ["ensuite", "laundry", "storage", "dining", "balcony", "other"].includes(
      room.type
    )
  ).length;

  return clamp(
    program.resolvedRoomCount * 5 +
      graph.edges.length * 1.5 +
      specialRooms * 3 +
      program.mergedSpaces.length * 2,
    0,
    100
  );
}

function component(score: number, weight: number, rationale: string) {
  return {
    score: roundScore(score),
    weight,
    rationale: [rationale]
  };
}

function areaRationale(program: ResolvedRoomProgram) {
  const ratio = program.targetUsableArea / program.estimatedMinimumArea;

  return `Usable target area is ${program.targetUsableArea} m2 versus an estimated ${program.estimatedMinimumArea} m2 minimum program (${ratio.toFixed(2)} ratio).`;
}

function feasibilityRating(
  score: number
): PlanningFeasibilityScore["rating"] {
  if (score >= 80) return "highly_feasible";
  if (score >= 65) return "feasible";
  if (score >= 45) return "constrained";
  return "low";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundScore(value: number) {
  return Number(value.toFixed(2));
}
