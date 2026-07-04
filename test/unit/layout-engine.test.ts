import { describe, expect, it } from "vitest";
import { generateFloorPlanLayout } from "@/lib/layout-engine/generate-layout";
import { floorPlanFixtureToPlanDraft } from "@/lib/ai-planner/mock-prompt-classifier";
import type { FloorPlan, PlanDraft, Rect, Room } from "@/lib/floor-plan/types";
import {
  simpleOnePlusOneFixture,
  threePlusOneFixture,
  twoPlusOneFixture
} from "@/lib/floor-plan/fixtures";
import { validateFloorPlan } from "@/lib/floor-plan/validation";

describe("deterministic layout engine", () => {
  it("generates a valid 1+1 layout", () => {
    const plan = layoutFromFixture(simpleOnePlusOneFixture);

    expect(plan.rooms).toHaveLength(5);
    expect(plan.layout.engine).toBe("rectangular-grid-v1");
    expect(plan.doors.some((door) => door.type === "entry")).toBe(true);
    expect(plan.windows.length).toBeGreaterThan(0);
    expectPlanIsValid(plan);
    expectRoomsInsideBounds(plan);
    expectNoRoomOverlap(plan.rooms);
  });

  it("generates a valid 2+1 layout", () => {
    const plan = layoutFromFixture(twoPlusOneFixture);

    expect(plan.rooms).toHaveLength(8);
    expect(roomsShareEdge(room(plan, "room_living"), room(plan, "room_kitchen"))).toBe(true);
    expectPlanIsValid(plan);
    expectRoomsInsideBounds(plan);
    expectNoRoomOverlap(plan.rooms);
  });

  it("generates a valid 3+1 layout with living balcony adjacency", () => {
    const plan = layoutFromFixture(threePlusOneFixture);

    expect(plan.rooms).toHaveLength(10);
    expect(roomsShareEdge(room(plan, "room_living"), room(plan, "room_kitchen"))).toBe(true);
    expect(roomsShareEdge(room(plan, "room_living"), room(plan, "room_balcony"))).toBe(true);
    expect(plan.doors.some((door) => door.type === "balcony")).toBe(true);
    expectPlanIsValid(plan);
    expectRoomsInsideBounds(plan);
    expectNoRoomOverlap(plan.rooms);
  });

  it("produces stable deterministic output for the same draft", () => {
    const draft = floorPlanFixtureToPlanDraft(threePlusOneFixture);
    const first = generateFloorPlanLayout({ draft, planId: "plan_stable", projectId: "project_stable" });
    const second = generateFloorPlanLayout({ draft, planId: "plan_stable", projectId: "project_stable" });

    expect(second.plan).toEqual(first.plan);
  });

  it("keeps rooms valid for awkward but reasonable room mixes", () => {
    const result = generateFloorPlanLayout({
      draft: awkwardRoomMixDraft,
      planId: "plan_awkward_mix",
      projectId: "project_awkward_mix",
      promptSummary: "Awkward mix with no hallway and uneven room sizes"
    });

    expect(result.plan.rooms).toHaveLength(7);
    expect(result.plan.doors.some((door) => door.type === "entry")).toBe(true);
    expectPlanIsValid(result.plan);
    expectRoomsInsideBounds(result.plan);
    expectNoRoomOverlap(result.plan.rooms);
  });
});

const awkwardRoomMixDraft: PlanDraft = {
  title: "Awkward Concept Apartment",
  units: "m",
  rooms: [
    {
      id: "room_living",
      name: "Living Room",
      type: "living",
      targetArea: 18,
      isWetArea: false,
      isExteriorPreferred: true
    },
    {
      id: "room_kitchen",
      name: "Kitchen",
      type: "kitchen",
      targetArea: 8,
      isWetArea: true,
      isExteriorPreferred: true
    },
    {
      id: "room_bedroom_1",
      name: "Bedroom 1",
      type: "bedroom",
      targetArea: 10,
      isWetArea: false,
      isExteriorPreferred: true
    },
    {
      id: "room_bedroom_2",
      name: "Bedroom 2",
      type: "bedroom",
      targetArea: 9,
      isWetArea: false,
      isExteriorPreferred: true
    },
    {
      id: "room_bath",
      name: "Bathroom",
      type: "bathroom",
      targetArea: 4,
      isWetArea: true,
      isExteriorPreferred: false
    },
    {
      id: "room_storage",
      name: "Storage",
      type: "storage",
      targetArea: 3,
      isWetArea: false,
      isExteriorPreferred: false
    },
    {
      id: "room_balcony",
      name: "Balcony",
      type: "balcony",
      targetArea: 3,
      isWetArea: false,
      isExteriorPreferred: true
    }
  ],
  adjacencies: [
    {
      roomAId: "room_living",
      roomBId: "room_kitchen",
      type: "preferred",
      reason: "Kitchen should stay near living room."
    },
    {
      roomAId: "room_living",
      roomBId: "room_balcony",
      type: "required",
      reason: "Balcony should connect to living room."
    },
    {
      roomAId: "room_bedroom_1",
      roomBId: "room_bath",
      type: "preferred",
      reason: "Bathroom should be near bedrooms."
    }
  ],
  openings: [],
  assumptions: ["Synthetic awkward fixture for layout regression coverage."]
};

function layoutFromFixture(fixture: FloorPlan) {
  return generateFloorPlanLayout({
    draft: floorPlanFixtureToPlanDraft(fixture),
    planId: fixture.id,
    projectId: fixture.projectId,
    promptSummary: fixture.metadata.promptSummary
  }).plan;
}

function expectPlanIsValid(plan: FloorPlan) {
  const validation = validateFloorPlan(plan);

  if (!validation.ok) {
    throw new Error(JSON.stringify(validation.issues, null, 2));
  }

  expect(validation.ok).toBe(true);
}

function expectRoomsInsideBounds(plan: FloorPlan) {
  plan.rooms.forEach((candidate) => {
    expect(candidate.layout.x).toBeGreaterThanOrEqual(plan.bounds.x);
    expect(candidate.layout.y).toBeGreaterThanOrEqual(plan.bounds.y);
    expect(candidate.layout.x + candidate.layout.width).toBeLessThanOrEqual(
      plan.bounds.x + plan.bounds.width
    );
    expect(candidate.layout.y + candidate.layout.height).toBeLessThanOrEqual(
      plan.bounds.y + plan.bounds.height
    );
  });
}

function expectNoRoomOverlap(rooms: Room[]) {
  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      expect(rectanglesOverlap(rooms[i].layout, rooms[j].layout)).toBe(false);
    }
  }
}

function room(plan: FloorPlan, roomId: string) {
  const foundRoom = plan.rooms.find((candidate) => candidate.id === roomId);

  if (!foundRoom) {
    throw new Error(`Missing room ${roomId}.`);
  }

  return foundRoom;
}

function roomsShareEdge(a: Room, b: Room) {
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

function rectanglesOverlap(a: Rect, b: Rect) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd) - 0.01;
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) <= 0.01;
}
