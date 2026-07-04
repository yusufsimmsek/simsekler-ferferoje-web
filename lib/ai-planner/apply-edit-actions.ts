import { floorPlanToPlanDraft } from "@/lib/floor-plan/draft";
import type {
  EditAction,
  FloorPlan,
  PlanDraft,
  PlanDraftAdjacency,
  PlanDraftRoom,
  ValidationIssue
} from "@/lib/floor-plan/types";

export type ApplyEditActionsResult =
  | {
      ok: true;
      draft: PlanDraft;
      touchedRoomIds: string[];
    }
  | {
      ok: false;
      issues: ValidationIssue[];
    };

export function applyEditActionsToPlanDraft(input: {
  currentPlan: FloorPlan;
  actions: EditAction[];
}): ApplyEditActionsResult {
  const draft = structuredClone(floorPlanToPlanDraft(input.currentPlan));
  const issues: ValidationIssue[] = [];
  const touchedRoomIds = new Set<string>();

  for (const action of input.actions) {
    if (issues.length > 0) break;

    switch (action.type) {
      case "add_room":
        applyAddRoom(draft, action.params.room, action.params.adjacency, issues);
        touchedRoomIds.add(action.params.room.id);
        break;
      case "remove_room":
        applyRemoveRoom(draft, action.roomId, issues);
        touchedRoomIds.add(action.roomId);
        break;
      case "rename_room":
        applyRenameRoom(draft, action.roomId, action.params.name, issues);
        touchedRoomIds.add(action.roomId);
        break;
      case "resize_room":
        applyResizeRoom(draft, action.roomId, action.params.targetArea, issues);
        touchedRoomIds.add(action.roomId);
        break;
      case "set_room_dimensions":
        applySetRoomDimensions(draft, action.roomId, action.params.width, action.params.height, issues);
        touchedRoomIds.add(action.roomId);
        break;
      case "set_adjacency":
        applySetAdjacency(draft, action.params, issues);
        break;
      case "remove_adjacency":
        draft.adjacencies = draft.adjacencies.filter(
          (adjacency) => adjacencyIdFor(adjacency.roomAId, adjacency.roomBId) !== action.params.adjacencyId
        );
        break;
      case "regenerate_layout":
        break;
      default:
        issues.push(
          editIssue({
            code: "EDIT_INVALID_ACTION",
            message: `Action type ${action.type} is not applied by the MVP edit pipeline yet.`
          })
        );
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues
    };
  }

  return {
    ok: true,
    draft,
    touchedRoomIds: Array.from(touchedRoomIds)
  };
}

function applyAddRoom(
  draft: PlanDraft,
  room: PlanDraftRoom,
  adjacency: PlanDraftAdjacency | undefined,
  issues: ValidationIssue[]
) {
  if (draft.rooms.length >= 12) {
    issues.push(
      editIssue({
        code: "EDIT_CONFLICT",
        message: "MVP plans support up to 12 rooms.",
        targetId: room.id
      })
    );
    return;
  }

  if (draft.rooms.some((candidate) => candidate.id === room.id)) {
    issues.push(
      editIssue({
        code: "EDIT_CONFLICT",
        message: `Room id ${room.id} already exists.`,
        targetId: room.id
      })
    );
    return;
  }

  draft.rooms.push(structuredClone(room));

  if (adjacency) {
    applySetAdjacency(draft, adjacency, issues);
  }
}

function applyRemoveRoom(draft: PlanDraft, roomId: string, issues: ValidationIssue[]) {
  if (!draft.rooms.some((room) => room.id === roomId)) {
    issues.push(
      editIssue({
        code: "EDIT_UNKNOWN_TARGET",
        message: `Cannot remove missing room ${roomId}.`,
        targetId: roomId
      })
    );
    return;
  }

  if (draft.rooms.length <= 1) {
    issues.push(
      editIssue({
        code: "EDIT_CONFLICT",
        message: "Cannot remove the only room in the plan.",
        targetId: roomId
      })
    );
    return;
  }

  draft.rooms = draft.rooms.filter((room) => room.id !== roomId);
  draft.adjacencies = draft.adjacencies.filter(
    (adjacency) => adjacency.roomAId !== roomId && adjacency.roomBId !== roomId
  );
  draft.openings = draft.openings.filter(
    (opening) => opening.roomId !== roomId && opening.connectedRoomId !== roomId
  );
}

function applyRenameRoom(
  draft: PlanDraft,
  roomId: string,
  name: string,
  issues: ValidationIssue[]
) {
  const room = findDraftRoom(draft, roomId, issues);

  if (!room) return;

  room.name = name;
}

function applyResizeRoom(
  draft: PlanDraft,
  roomId: string,
  targetArea: number,
  issues: ValidationIssue[]
) {
  const room = findDraftRoom(draft, roomId, issues);

  if (!room) return;

  setRoomTargetArea(room, targetArea);
}

function applySetRoomDimensions(
  draft: PlanDraft,
  roomId: string,
  width: number,
  height: number,
  issues: ValidationIssue[]
) {
  const room = findDraftRoom(draft, roomId, issues);

  if (!room) return;

  room.targetWidth = snap(width);
  room.targetHeight = snap(height);
  room.targetArea = roundArea(room.targetWidth * room.targetHeight);
}

function applySetAdjacency(
  draft: PlanDraft,
  adjacency: PlanDraft["adjacencies"][number],
  issues: ValidationIssue[]
) {
  const roomIds = new Set(draft.rooms.map((room) => room.id));

  if (!roomIds.has(adjacency.roomAId) || !roomIds.has(adjacency.roomBId)) {
    issues.push(
      editIssue({
        code: "EDIT_UNKNOWN_TARGET",
        message: "Adjacency references a room that does not exist."
      })
    );
    return;
  }

  const id = adjacencyIdFor(adjacency.roomAId, adjacency.roomBId);
  const existingIndex = draft.adjacencies.findIndex(
    (candidate) => adjacencyIdFor(candidate.roomAId, candidate.roomBId) === id
  );

  if (existingIndex >= 0) {
    draft.adjacencies[existingIndex] = structuredClone(adjacency);
    return;
  }

  draft.adjacencies.push(structuredClone(adjacency));
}

function findDraftRoom(
  draft: PlanDraft,
  roomId: string,
  issues: ValidationIssue[]
) {
  const room = draft.rooms.find((candidate) => candidate.id === roomId);

  if (!room) {
    issues.push(
      editIssue({
        code: "EDIT_UNKNOWN_TARGET",
        message: `Edit action references missing room ${roomId}.`,
        targetId: roomId
      })
    );
  }

  return room;
}

function setRoomTargetArea(room: PlanDraftRoom, targetArea: number) {
  const currentArea =
    room.targetArea ?? ((room.targetWidth ?? 3) * (room.targetHeight ?? 3));
  const currentWidth = room.targetWidth ?? Math.sqrt(currentArea * defaultAspectRatio(room));
  const currentHeight = room.targetHeight ?? currentArea / currentWidth;
  const ratio = Math.sqrt(targetArea / currentArea);

  room.targetWidth = snap(currentWidth * ratio);
  room.targetHeight = snap(currentHeight * ratio);
  room.targetArea = roundArea(room.targetWidth * room.targetHeight);
}

function defaultAspectRatio(room: PlanDraftRoom) {
  if (room.type === "living") return 1.35;
  if (room.type === "kitchen") return 1.25;
  if (room.type === "balcony") return 3;

  return 1.2;
}

function adjacencyIdFor(roomAId: string, roomBId: string) {
  return [roomAId, roomBId].sort().join("_");
}

function editIssue(input: {
  code: string;
  message: string;
  targetId?: string;
}): ValidationIssue {
  return {
    id: `issue_${input.code.toLowerCase()}`,
    severity: "critical",
    code: input.code,
    message: input.message,
    targetId: input.targetId
  };
}

function snap(value: number) {
  return Number((Math.round(value / 0.25) * 0.25).toFixed(2));
}

function roundArea(value: number) {
  return Number(value.toFixed(2));
}
