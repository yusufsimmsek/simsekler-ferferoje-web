import type { FloorPlan } from "@/lib/floor-plan/types";

export const openAiPlanGenerationSystemPrompt = [
  "You are the natural-language planning layer for AI Floor Plan Generator.",
  "Return JSON only. Do not return Markdown, code fences, comments, or prose outside JSON.",
  "The product creates conceptual one-floor 2D residential drafts only.",
  "Do not produce CAD, BIM, 3D, construction-ready, permit-ready, legal, structural, zoning, accessibility, or code-compliance claims.",
  "Do not include rooms with layout coordinates, FloorPlan geometry, walls, doors, windows, or render instructions.",
  "Return one planning-specification-v1 object that captures household context, priorities, requested rooms, relationships, constraints, missing information, clarification questions, unsupported requests, warnings, confidence, and assumptions.",
  "Record out-of-scope requests in unsupportedRequests.",
  "When the prompt is too ambiguous for a useful residential room program, populate missingInformation and clarificationQuestions and keep confidenceScore at or below 0.69.",
  "Use metric units and keep floorCount at one for supported requests."
].join(" ");

export const openAiChatEditSystemPrompt = [
  "You are the structured edit-action extraction layer for AI Floor Plan Generator.",
  "Return JSON only. Do not return Markdown, code fences, comments, or prose outside JSON.",
  "Convert the user's edit request into validated edit actions only. Do not rewrite the full plan.",
  "Use existing room, door, window, and adjacency ids from the current plan unless adding a new room or opening.",
  "Do not include final layout coordinates. The deterministic layout engine owns all coordinates.",
  "The product supports conceptual one-floor 2D rectangular residential plans only.",
  "Do not produce CAD, BIM, 3D, construction-ready, permit-ready, legal, structural, zoning, accessibility, or code-compliance claims.",
  "Return needs_clarification when the requested target is ambiguous. Return unsupported for out-of-scope requests."
].join(" ");

export function buildPlanGenerationUserPrompt(input: {
  prompt: string;
  maxRooms: number;
}) {
  return [
    `User prompt: ${input.prompt}`,
    `MVP limits: one floor, meters, simple rectangular rooms, maximum ${input.maxRooms} rooms.`,
    "Return a planning-specification-v1 object matching the schema exactly."
  ].join("\n");
}

export function buildChatEditUserPrompt(input: {
  message: string;
  currentPlan: FloorPlan;
}) {
  return [
    `User edit message: ${input.message}`,
    "Current plan summary:",
    JSON.stringify(summarizePlanForEdit(input.currentPlan), null, 2),
    "Supported actions: add_room, remove_room, rename_room, resize_room, set_room_dimensions, set_adjacency, remove_adjacency, add_door, move_door, remove_door, add_window, move_window, remove_window, regenerate_layout.",
    "Return a chat-edit-response-v1 object matching the schema exactly."
  ].join("\n");
}

function summarizePlanForEdit(plan: FloorPlan) {
  return {
    planId: plan.id,
    projectId: plan.projectId,
    title: plan.title,
    units: plan.units,
    rooms: plan.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      area: room.area,
      targetArea: room.targetArea ?? room.area
    })),
    doors: plan.doors.map((door) => ({
      id: door.id,
      type: door.type,
      fromRoomId: door.fromRoomId,
      toRoomId: door.toRoomId
    })),
    windows: plan.windows.map((window) => ({
      id: window.id,
      roomId: window.roomId
    })),
    adjacencies: plan.adjacencies.map((adjacency) => ({
      id: adjacency.id,
      roomAId: adjacency.roomAId,
      roomBId: adjacency.roomBId,
      type: adjacency.type
    }))
  };
}
