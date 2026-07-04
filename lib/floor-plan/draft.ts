import type { FloorPlan, PlanDraft, PlanDraftOpening } from "./types";

export function floorPlanToPlanDraft(plan: FloorPlan): PlanDraft {
  return {
    title: plan.title,
    units: plan.units,
    rooms: plan.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      targetArea: room.targetArea ?? room.area,
      targetWidth: room.layout.width,
      targetHeight: room.layout.height,
      isWetArea: room.isWetArea,
      isExteriorPreferred: room.isExteriorPreferred
    })),
    adjacencies: plan.adjacencies.map((adjacency) => ({
      roomAId: adjacency.roomAId,
      roomBId: adjacency.roomBId,
      type: adjacency.type,
      reason: adjacency.reason
    })),
    openings: [
      ...plan.doors.map((door): PlanDraftOpening => {
        const opening = {
          type: "door" as const,
          roomId: door.fromRoomId,
          preferredEdge: door.placement.edge,
          width: door.width
        };

        return door.toRoomId
          ? { ...opening, connectedRoomId: door.toRoomId }
          : opening;
      }),
      ...plan.windows.map((window): PlanDraftOpening => ({
        type: "window",
        roomId: window.roomId,
        preferredEdge: window.placement.edge,
        width: window.width
      }))
    ],
    assumptions: plan.assumptions
  };
}
