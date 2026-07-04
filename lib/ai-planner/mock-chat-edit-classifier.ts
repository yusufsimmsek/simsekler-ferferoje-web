import { chatEditResponseSchema } from "@/lib/schemas/ai-contracts.schema";
import type { ChatEditResponse, FloorPlan, Room } from "@/lib/floor-plan/types";

export type MockChatEditClassificationKind =
  | "enlarge_living_room"
  | "shrink_living_room"
  | "enlarge_kitchen"
  | "add_bathroom"
  | "add_balcony"
  | "remove_balcony"
  | "rename_room"
  | "unsupported"
  | "needs_clarification";

export type MockChatEditClassification = {
  kind: MockChatEditClassificationKind;
  response: ChatEditResponse;
};

export function classifyMockChatEdit(input: {
  message: string;
  currentPlan: FloorPlan;
}): MockChatEditClassification {
  const message = input.message.trim();
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return needsClarification("What would you like to change in the plan?");
  }

  const unsupportedEdit = classifyUnsupportedEdit(normalizedMessage);

  if (unsupportedEdit) {
    return unsupported(unsupportedEdit);
  }

  const rename = parseRename(message);

  if (rename) {
    const room = findRoomByUserTarget(input.currentPlan, rename.target);

    if (!room) {
      return unsupported(
        `I could not find "${rename.target}" in the current plan. Try an existing room name.`
      );
    }

    const nextName = toTitleCase(rename.nextName);

    return ok("rename_room", {
      schemaVersion: "chat-edit-response-v1",
      status: "ok",
      actions: [
        {
          id: "edit_rename_room",
          type: "rename_room",
          roomId: room.id,
          params: {
            name: nextName
          },
          reason: `User asked to rename ${room.name} to ${nextName}.`
        }
      ],
      requiresRelayout: false,
      clarificationRequest: null,
      userFacingSummary: `${room.name} was renamed to ${nextName}.`
    });
  }

  if (isResizeIntent(normalizedMessage, "larger") && mentionsLivingRoom(normalizedMessage)) {
    const room = findRoomByType(input.currentPlan, "living");

    if (!room) return unsupported("The current plan does not include a living room to resize.");

    return resizeRoom({
      kind: "enlarge_living_room",
      room,
      targetArea: enlargeArea(room.area, 4),
      summary: "The living room was enlarged and the layout was recalculated.",
      reason: "User asked to make the living room larger."
    });
  }

  if (isResizeIntent(normalizedMessage, "smaller") && mentionsLivingRoom(normalizedMessage)) {
    const room = findRoomByType(input.currentPlan, "living");

    if (!room) return unsupported("The current plan does not include a living room to resize.");

    return resizeRoom({
      kind: "shrink_living_room",
      room,
      targetArea: shrinkArea(room),
      summary: "The living room was reduced and the layout was recalculated.",
      reason: "User asked to make the living room smaller."
    });
  }

  if (isResizeIntent(normalizedMessage, "larger") && mentionsKitchen(normalizedMessage)) {
    const room = findRoomByType(input.currentPlan, "kitchen");

    if (!room) return unsupported("The current plan does not include a kitchen to resize.");

    return resizeRoom({
      kind: "enlarge_kitchen",
      room,
      targetArea: enlargeArea(room.area, 3),
      summary: "The kitchen was enlarged and the layout was recalculated.",
      reason: "User asked to make the kitchen larger."
    });
  }

  if (hasAddIntent(normalizedMessage) && mentionsBathroom(normalizedMessage)) {
    const anchor = findCirculationAnchor(input.currentPlan);
    const roomId = uniqueRoomId(input.currentPlan, "room_bathroom");
    const bathroomCount = input.currentPlan.rooms.filter((room) => room.type === "bathroom").length;
    const name = bathroomCount > 0 ? `Bathroom ${bathroomCount + 1}` : "Bathroom";

    return ok("add_bathroom", {
      schemaVersion: "chat-edit-response-v1",
      status: "ok",
      actions: [
        {
          id: "edit_add_bathroom",
          type: "add_room",
          params: {
            room: {
              id: roomId,
              name,
              type: "bathroom",
              targetArea: 4.5,
              isWetArea: true,
              isExteriorPreferred: false
            },
            adjacency: {
              roomAId: anchor.id,
              roomBId: roomId,
              type: "preferred",
              reason: `${name} should stay near circulation.`
            }
          },
          reason: "User asked to add a bathroom."
        }
      ],
      requiresRelayout: true,
      clarificationRequest: null,
      userFacingSummary: `${name} was added near ${anchor.name}.`
    });
  }

  if (hasAddIntent(normalizedMessage) && mentionsBalcony(normalizedMessage)) {
    const existingBalcony = findRoomByType(input.currentPlan, "balcony");

    if (existingBalcony) {
      return unsupported("The current plan already includes a balcony.");
    }

    const livingRoom = findRoomByType(input.currentPlan, "living") ?? input.currentPlan.rooms[0];
    const roomId = uniqueRoomId(input.currentPlan, "room_balcony");

    return ok("add_balcony", {
      schemaVersion: "chat-edit-response-v1",
      status: "ok",
      actions: [
        {
          id: "edit_add_balcony",
          type: "add_room",
          params: {
            room: {
              id: roomId,
              name: "Balcony",
              type: "balcony",
              targetArea: 4,
              targetWidth: 4,
              targetHeight: 1,
              isWetArea: false,
              isExteriorPreferred: true
            },
            adjacency: {
              roomAId: livingRoom.id,
              roomBId: roomId,
              type: "required",
              reason: "Balcony should connect to the living room."
            }
          },
          reason: "User asked to add a balcony."
        }
      ],
      requiresRelayout: true,
      clarificationRequest: null,
      userFacingSummary: "A balcony was added next to the living room intent."
    });
  }

  if (hasRemoveIntent(normalizedMessage) && mentionsBalcony(normalizedMessage)) {
    const balcony = findRoomByType(input.currentPlan, "balcony");

    if (!balcony) {
      return unsupported("The current plan does not include a balcony to remove.");
    }

    return ok("remove_balcony", {
      schemaVersion: "chat-edit-response-v1",
      status: "ok",
      actions: [
        {
          id: "edit_remove_balcony",
          type: "remove_room",
          roomId: balcony.id,
          params: {},
          reason: "User asked to remove the balcony."
        }
      ],
      requiresRelayout: true,
      clarificationRequest: null,
      userFacingSummary: "The balcony was removed and the layout was recalculated."
    });
  }

  return unsupported(
    "This mock editor supports: enlarge/shrink living room, enlarge kitchen, add bathroom, add balcony, remove balcony, and rename room."
  );
}

function resizeRoom(input: {
  kind: Extract<
    MockChatEditClassificationKind,
    "enlarge_living_room" | "shrink_living_room" | "enlarge_kitchen"
  >;
  room: Room;
  targetArea: number;
  reason: string;
  summary: string;
}): MockChatEditClassification {
  return ok(input.kind, {
    schemaVersion: "chat-edit-response-v1",
    status: "ok",
    actions: [
      {
        id: `edit_${input.kind}`,
        type: "resize_room",
        roomId: input.room.id,
        params: {
          targetArea: input.targetArea,
          lockAdjacentRooms: false
        },
        reason: input.reason
      }
    ],
    requiresRelayout: true,
    clarificationRequest: null,
    userFacingSummary: input.summary
  });
}

function ok(kind: MockChatEditClassificationKind, response: ChatEditResponse) {
  return {
    kind,
    response: chatEditResponseSchema.parse(response)
  };
}

function unsupported(message: string): MockChatEditClassification {
  return {
    kind: "unsupported",
    response: chatEditResponseSchema.parse({
      schemaVersion: "chat-edit-response-v1",
      status: "unsupported",
      actions: [],
      requiresRelayout: false,
      clarificationRequest: null,
      userFacingSummary: message
    })
  };
}

function needsClarification(message: string): MockChatEditClassification {
  return {
    kind: "needs_clarification",
    response: chatEditResponseSchema.parse({
      schemaVersion: "chat-edit-response-v1",
      status: "needs_clarification",
      actions: [],
      requiresRelayout: false,
      clarificationRequest: message,
      userFacingSummary: "I need one edit request before changing the plan."
    })
  };
}

function classifyUnsupportedEdit(message: string) {
  if (/\b(3d|render|photorealistic|bim|cad|revit|permit|construction[-\s]?ready)\b/.test(message)) {
    return "This edit is outside the MVP. I can update a simple 2D conceptual plan, for example: make the living room larger, add a balcony, add a bathroom, or rename a room.";
  }

  if (/\b(delete|remove|clear)\b.*\b(all|every|entire)\b.*\b(room|rooms|plan)\b/.test(message)) {
    return "I cannot remove every room or leave an empty plan. Try a safe room-level edit such as removing the balcony or renaming a bedroom.";
  }

  return null;
}

function parseRename(message: string) {
  const patterns = [
    /^\s*rename\s+(.+?)\s+to\s+(.+?)\s*\.?\s*$/i,
    /^\s*change\s+(.+?)\s+name\s+to\s+(.+?)\s*\.?\s*$/i,
    /^\s*call\s+(.+?)\s+(.+?)\s*\.?\s*$/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match?.[1] && match[2]) {
      return {
        target: match[1].trim(),
        nextName: match[2].trim()
      };
    }
  }

  return null;
}

function findRoomByUserTarget(plan: FloorPlan, target: string) {
  const normalizedTarget = normalizeText(target);
  const bedroomNumber = normalizedTarget.match(/\bbedroom\s+(\d+)\b/)?.[1];

  if (bedroomNumber) {
    const bedroom = plan.rooms.find((room) => normalizeText(room.name) === `bedroom ${bedroomNumber}`);

    if (bedroom) return bedroom;
  }

  return (
    plan.rooms.find((room) => normalizeText(room.name) === normalizedTarget) ??
    plan.rooms.find((room) => normalizeText(room.id) === normalizedTarget) ??
    plan.rooms.find((room) => normalizedTarget.includes(normalizeText(room.name))) ??
    targetTypeMatch(plan, normalizedTarget)
  );
}

function targetTypeMatch(plan: FloorPlan, target: string) {
  if (mentionsLivingRoom(target)) return findRoomByType(plan, "living");
  if (mentionsKitchen(target)) return findRoomByType(plan, "kitchen");
  if (mentionsBalcony(target)) return findRoomByType(plan, "balcony");
  if (mentionsBathroom(target)) return findRoomByType(plan, "bathroom") ?? findRoomByType(plan, "wc");
  if (/\bhall(way)?\b/.test(target)) return findRoomByType(plan, "hallway");
  if (/\bentry\b/.test(target)) return findRoomByType(plan, "entry");

  return undefined;
}

function findRoomByType(plan: FloorPlan, type: Room["type"]) {
  return plan.rooms.find((room) => room.type === type);
}

function findCirculationAnchor(plan: FloorPlan) {
  return (
    findRoomByType(plan, "hallway") ??
    findRoomByType(plan, "entry") ??
    findRoomByType(plan, "living") ??
    plan.rooms[0]
  );
}

function uniqueRoomId(plan: FloorPlan, base: string) {
  const existingIds = new Set(plan.rooms.map((room) => room.id));

  if (!existingIds.has(base)) return base;

  let index = 2;

  while (existingIds.has(`${base}_${index}`)) {
    index += 1;
  }

  return `${base}_${index}`;
}

function isResizeIntent(message: string, direction: "larger" | "smaller") {
  if (direction === "larger") {
    return /\b(enlarge|larger|bigger|increase|expand|grow|buyut|genislet)\b/.test(message);
  }

  return /\b(shrink|smaller|reduce|decrease|kucult|daralt)\b/.test(message);
}

function hasAddIntent(message: string) {
  return /\b(add|create|insert|include|ekle)\b/.test(message);
}

function hasRemoveIntent(message: string) {
  return /\b(remove|delete|drop|without|kaldir|sil)\b/.test(message);
}

function mentionsLivingRoom(message: string) {
  return /\b(living|living room|salon)\b/.test(message);
}

function mentionsKitchen(message: string) {
  return /\b(kitchen|mutfak)\b/.test(message);
}

function mentionsBathroom(message: string) {
  return /\b(bathroom|bath|wc|toilet|banyo)\b/.test(message);
}

function mentionsBalcony(message: string) {
  return /\b(balcony|teras|balkon)\b/.test(message);
}

function enlargeArea(area: number, minimumIncrease: number) {
  return roundArea(Math.max(area + minimumIncrease, area * 1.18));
}

function shrinkArea(room: Room) {
  const minimum = room.minArea ?? (room.type === "living" ? 12 : 6);

  return roundArea(Math.max(minimum, room.area * 0.82));
}

function toTitleCase(value: string) {
  return value
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u011f/g, "g")
    .replace(/\u00fc/g, "u")
    .replace(/\u015f/g, "s")
    .replace(/\u00f6/g, "o")
    .replace(/\u00e7/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function roundArea(value: number) {
  return Number(value.toFixed(2));
}
