import type { FloorPlan, Room } from "@/lib/floor-plan/types";
import type { ResolvedPlanningSpecification } from "./resolved-planning-types";
import type { RelationshipConstraintResult } from "./quality-types";

const tolerance = 0.01;

export type RelationshipScoringResult = {
  score: number;
  adjacencyScore: number;
  satisfied: RelationshipConstraintResult[];
  failed: RelationshipConstraintResult[];
};

export function scorePlanningRelationships(input: {
  planning: ResolvedPlanningSpecification;
  plan: FloorPlan;
}): RelationshipScoringResult {
  const results = input.planning.relationshipGraph.edges.map((edge) => {
    const fromRoom = input.plan.rooms.find(
      (room) => room.id === edge.fromRoomId
    );
    const toRoom = input.plan.rooms.find((room) => room.id === edge.toRoomId);

    if (!fromRoom || !toRoom) {
      return {
        relationshipId: edge.id,
        ruleId: edge.ruleId,
        fromRoomId: edge.fromRoomId,
        toRoomId: edge.toRoomId,
        expectedRelationship: edge.relationship,
        actualRelationship: "missing_room" as const,
        priority: edge.priority,
        status: "failed" as const,
        score: 0,
        evidence: "One or both relationship rooms are missing from the FloorPlan."
      };
    }

    return evaluateRelationship({
      edge,
      fromRoom,
      toRoom,
      plan: input.plan
    });
  });
  const weightedScore = weightedRelationshipScore(results);
  const positiveResults = results.filter(
    (result) => result.priority !== "avoid"
  );
  const adjacencyScore =
    positiveResults.length === 0
      ? 100
      : roundScore(
          positiveResults.reduce((sum, result) => sum + result.score, 0) /
            positiveResults.length
        );

  return {
    score: weightedScore,
    adjacencyScore,
    satisfied: results.filter((result) => result.status === "satisfied"),
    failed: results.filter((result) => result.status !== "satisfied")
  };
}

function evaluateRelationship(input: {
  edge: ResolvedPlanningSpecification["relationshipGraph"]["edges"][number];
  fromRoom: Room;
  toRoom: Room;
  plan: FloorPlan;
}): RelationshipConstraintResult {
  const sharesEdge = roomsShareEdge(input.fromRoom, input.toRoom);
  const connectedByDoor = hasConnectingDoor(
    input.plan,
    input.fromRoom.id,
    input.toRoom.id
  );
  const distance = centerDistance(input.fromRoom, input.toRoom);
  const nearThreshold = nearDistanceThreshold(input.plan);
  const near = sharesEdge || distance <= nearThreshold;
  const actualRelationship = connectedByDoor
    ? "connected" as const
    : sharesEdge
      ? "adjacent" as const
      : near
        ? "near" as const
        : "separated" as const;
  const evaluation = relationshipScore({
    expected: input.edge.relationship,
    connectedByDoor,
    sharesEdge,
    near
  });

  return {
    relationshipId: input.edge.id,
    ruleId: input.edge.ruleId,
    fromRoomId: input.edge.fromRoomId,
    toRoomId: input.edge.toRoomId,
    expectedRelationship: input.edge.relationship,
    actualRelationship,
    priority: input.edge.priority,
    status: evaluation.status,
    score: evaluation.score,
    evidence: `${input.fromRoom.name} and ${input.toRoom.name} are ${actualRelationship}; center distance is ${distance.toFixed(2)} m.`
  };
}

function relationshipScore(input: {
  expected: RelationshipConstraintResult["expectedRelationship"];
  connectedByDoor: boolean;
  sharesEdge: boolean;
  near: boolean;
}): Pick<RelationshipConstraintResult, "score" | "status"> {
  if (input.expected === "connected") {
    if (input.connectedByDoor) return { score: 100, status: "satisfied" };
    if (input.sharesEdge) return { score: 65, status: "partial" };
    if (input.near) return { score: 35, status: "partial" };
    return { score: 0, status: "failed" };
  }

  if (input.expected === "adjacent") {
    if (input.sharesEdge) return { score: 100, status: "satisfied" };
    if (input.near) return { score: 45, status: "partial" };
    return { score: 0, status: "failed" };
  }

  if (input.expected === "near") {
    if (input.near) return { score: 100, status: "satisfied" };
    return { score: 0, status: "failed" };
  }

  if (input.expected === "separate" || input.expected === "avoid") {
    if (!input.near) return { score: 100, status: "satisfied" };
    if (!input.sharesEdge && !input.connectedByDoor) {
      return { score: 50, status: "partial" };
    }
    return { score: 0, status: "failed" };
  }

  return { score: 0, status: "failed" };
}

function weightedRelationshipScore(results: RelationshipConstraintResult[]) {
  if (results.length === 0) return 100;

  const weighted = results.reduce(
    (accumulator, result) => {
      const weight =
        result.priority === "required"
          ? 1.5
          : result.priority === "avoid"
            ? 1.25
            : 1;

      return {
        total: accumulator.total + result.score * weight,
        weights: accumulator.weights + weight
      };
    },
    { total: 0, weights: 0 }
  );

  return roundScore(weighted.total / weighted.weights);
}

export function roomsShareEdge(a: Room, b: Room) {
  const aRight = a.layout.x + a.layout.width;
  const bRight = b.layout.x + b.layout.width;
  const aBottom = a.layout.y + a.layout.height;
  const bBottom = b.layout.y + b.layout.height;
  const shareVertical =
    (nearlyEqual(aRight, b.layout.x) || nearlyEqual(bRight, a.layout.x)) &&
    intervalsOverlap(a.layout.y, aBottom, b.layout.y, bBottom);
  const shareHorizontal =
    (nearlyEqual(aBottom, b.layout.y) || nearlyEqual(bBottom, a.layout.y)) &&
    intervalsOverlap(a.layout.x, aRight, b.layout.x, bRight);

  return shareVertical || shareHorizontal;
}

export function hasConnectingDoor(
  plan: FloorPlan,
  roomAId: string,
  roomBId: string
) {
  return plan.doors.some((door) => {
    if (!door.toRoomId) return false;

    return (
      (door.fromRoomId === roomAId && door.toRoomId === roomBId) ||
      (door.fromRoomId === roomBId && door.toRoomId === roomAId)
    );
  });
}

export function centerDistance(a: Room, b: Room) {
  const ax = a.layout.x + a.layout.width / 2;
  const ay = a.layout.y + a.layout.height / 2;
  const bx = b.layout.x + b.layout.width / 2;
  const by = b.layout.y + b.layout.height / 2;

  return Math.hypot(ax - bx, ay - by);
}

export function roomHasWindow(plan: FloorPlan, roomId: string) {
  return plan.windows.some((window) => window.roomId === roomId);
}

export function roomTouchesBounds(plan: FloorPlan, room: Room) {
  const right = room.layout.x + room.layout.width;
  const bottom = room.layout.y + room.layout.height;
  const boundsRight = plan.bounds.x + plan.bounds.width;
  const boundsBottom = plan.bounds.y + plan.bounds.height;

  return (
    nearlyEqual(room.layout.x, plan.bounds.x) ||
    nearlyEqual(room.layout.y, plan.bounds.y) ||
    nearlyEqual(right, boundsRight) ||
    nearlyEqual(bottom, boundsBottom)
  );
}

function nearDistanceThreshold(plan: FloorPlan) {
  return Math.max(4, Math.min(6, Math.hypot(plan.bounds.width, plan.bounds.height) * 0.28));
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd) - tolerance;
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) <= tolerance;
}

function roundScore(value: number) {
  return Number(value.toFixed(2));
}
