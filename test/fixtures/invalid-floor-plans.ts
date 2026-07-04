import { simpleOnePlusOneFixture } from "@/lib/floor-plan/fixtures";
import type { FloorPlan } from "@/lib/floor-plan/types";

function clonePlan(plan: FloorPlan): FloorPlan {
  return structuredClone(plan);
}

export const invalidRoomAreaFixture = (() => {
  const plan = clonePlan(simpleOnePlusOneFixture);
  plan.rooms[0].area += 1;
  return plan;
})();

export const invalidAdjacencyReferenceFixture = (() => {
  const plan = clonePlan(simpleOnePlusOneFixture);
  plan.adjacencies[0].roomBId = "room_missing";
  return plan;
})();

export const invalidDoorReferenceFixture = (() => {
  const plan = clonePlan(simpleOnePlusOneFixture);
  plan.doors[0].fromRoomId = "room_missing";
  return plan;
})();

export const invalidWindowPlacementFixture = (() => {
  const plan = clonePlan(simpleOnePlusOneFixture);
  plan.windows[0].placement.edge = "right";
  plan.windows[0].placement.offset = 1;
  return plan;
})();
