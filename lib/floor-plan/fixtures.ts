import type {
  Adjacency,
  Door,
  FloorPlan,
  Rect,
  Room,
  RoomType,
  ValidationIssue,
  Window
} from "./types";

export const conceptualDraftDisclaimer =
  "Conceptual draft only. Not for construction, permits, structural, legal, or code-compliance use.";

const generatedAt = "2026-06-17T00:00:00.000Z";

export const mockWarningIssue: ValidationIssue = {
  id: "issue_mock_layout",
  severity: "warning",
  code: "MOCK_LAYOUT",
  message: "Static mock layout is shown until the layout engine is implemented."
};

function room(
  id: string,
  name: string,
  type: RoomType,
  layout: Rect,
  options: Partial<Pick<Room, "minArea" | "targetArea" | "isWetArea" | "isExteriorPreferred" | "notes">> = {}
): Room {
  const area = Number((layout.width * layout.height).toFixed(2));

  return {
    id,
    name,
    type,
    level: 1,
    layout,
    area,
    minArea: options.minArea,
    targetArea: options.targetArea ?? area,
    isWetArea: options.isWetArea ?? false,
    isExteriorPreferred: options.isExteriorPreferred ?? false,
    notes: options.notes ?? []
  };
}

function door(
  id: string,
  type: Door["type"],
  fromRoomId: string,
  toRoomId: string | null,
  placement: Door["placement"],
  width = 0.9,
  swing: Door["swing"] = "unspecified"
): Door {
  return {
    id,
    type,
    fromRoomId,
    toRoomId,
    width,
    placement,
    swing
  };
}

function windowFixture(
  id: string,
  roomId: string,
  placement: Window["placement"],
  width = 1.2
): Window {
  return {
    id,
    roomId,
    width,
    placement,
    sillHeight: null
  };
}

function adjacency(
  id: string,
  roomAId: string,
  roomBId: string,
  type: Adjacency["type"],
  reason: string,
  satisfied = true
): Adjacency {
  return {
    id,
    roomAId,
    roomBId,
    type,
    reason,
    satisfied
  };
}

function plan(input: {
  id: string;
  projectId: string;
  title: string;
  bounds: Rect;
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  adjacencies: Adjacency[];
  promptSummary: string;
  validationIssues?: ValidationIssue[];
}): FloorPlan {
  const issues = input.validationIssues ?? [];

  return {
    schemaVersion: "floor-plan-v1",
    id: input.id,
    projectId: input.projectId,
    title: input.title,
    units: "m",
    precision: "conceptual",
    bounds: input.bounds,
    rooms: input.rooms,
    doors: input.doors,
    windows: input.windows,
    adjacencies: input.adjacencies,
    layout: {
      engine: "placeholder-layout-v1",
      gridSize: 0.25,
      strategy: "static-fixture",
      generatedAt,
      warnings: ["Fixture geometry is static until TASK-005 implements layout."]
    },
    assumptions: [
      "All dimensions are approximate.",
      "Rooms are rectangular for MVP.",
      "This is static fixture data for validation and scaffold testing."
    ],
    validation: {
      status: issues.length > 0 ? "valid_with_warnings" : "valid",
      issues
    },
    metadata: {
      createdBy: "mock",
      source: "mock",
      promptSummary: input.promptSummary,
      disclaimer: conceptualDraftDisclaimer
    }
  };
}

const onePlusOneRooms = [
  room("room_entry", "Entry", "entry", { x: 0, y: 2, width: 2, height: 2 }),
  room("room_living", "Living Room", "living", { x: 2, y: 0, width: 4, height: 4 }, {
    minArea: 12,
    isExteriorPreferred: true,
    notes: ["Open relationship preferred with kitchen."]
  }),
  room("room_kitchen", "Kitchen", "kitchen", { x: 6, y: 0, width: 3, height: 3 }, {
    minArea: 7,
    isWetArea: true,
    isExteriorPreferred: true
  }),
  room("room_bedroom_1", "Bedroom", "bedroom", { x: 2, y: 4, width: 4, height: 2 }, {
    minArea: 8,
    isExteriorPreferred: true
  }),
  room("room_bath", "Bathroom", "bathroom", { x: 0, y: 4, width: 2, height: 2 }, {
    minArea: 3,
    isWetArea: true
  })
];

export const simpleOnePlusOneFixture = plan({
  id: "plan_simple_1plus1",
  projectId: "project_fixture_1plus1",
  title: "Simple 1+1 Apartment",
  bounds: { x: 0, y: 0, width: 9, height: 6 },
  rooms: onePlusOneRooms,
  doors: [
    door("door_entry", "entry", "room_entry", null, {
      roomId: "room_entry",
      edge: "left",
      offset: 0.5
    }),
    door("door_entry_living", "interior", "room_entry", "room_living", {
      roomId: "room_living",
      edge: "left",
      offset: 2.2
    }),
    door("door_living_kitchen", "interior", "room_living", "room_kitchen", {
      roomId: "room_living",
      edge: "right",
      offset: 1
    }),
    door("door_living_bedroom", "interior", "room_living", "room_bedroom_1", {
      roomId: "room_bedroom_1",
      edge: "top",
      offset: 1
    }),
    door("door_entry_bath", "interior", "room_entry", "room_bath", {
      roomId: "room_bath",
      edge: "top",
      offset: 0.5
    })
  ],
  windows: [
    windowFixture("window_living", "room_living", { edge: "top", offset: 1 }, 1.5),
    windowFixture("window_kitchen", "room_kitchen", { edge: "top", offset: 0.75 }, 1.2),
    windowFixture("window_bedroom_1", "room_bedroom_1", { edge: "bottom", offset: 1 }, 1.2)
  ],
  adjacencies: [
    adjacency("adj_entry_living", "room_entry", "room_living", "required", "Entry should connect to living room."),
    adjacency("adj_living_kitchen", "room_living", "room_kitchen", "preferred", "Kitchen should be near living room."),
    adjacency("adj_living_bedroom", "room_living", "room_bedroom_1", "required", "Bedroom should connect to living room.")
  ],
  promptSummary: "Simple 1+1 apartment with living room, kitchen, bedroom, and bathroom"
});

const twoPlusOneRooms = [
  room("room_entry", "Entry", "entry", { x: 0, y: 3, width: 2, height: 2 }),
  room("room_hall", "Hallway", "hallway", { x: 2, y: 3, width: 2, height: 3 }),
  room("room_living", "Living Room", "living", { x: 4, y: 0, width: 5, height: 4 }, {
    minArea: 14,
    isExteriorPreferred: true
  }),
  room("room_kitchen", "Kitchen", "kitchen", { x: 9, y: 0, width: 3, height: 3 }, {
    minArea: 7,
    isWetArea: true,
    isExteriorPreferred: true
  }),
  room("room_bedroom_1", "Bedroom 1", "bedroom", { x: 4, y: 4, width: 4, height: 4 }, {
    minArea: 8,
    isExteriorPreferred: true
  }),
  room("room_bedroom_2", "Bedroom 2", "bedroom", { x: 8, y: 4, width: 4, height: 3 }, {
    minArea: 8,
    isExteriorPreferred: true
  }),
  room("room_bath", "Bathroom", "bathroom", { x: 0, y: 5, width: 2, height: 2 }, {
    minArea: 3,
    isWetArea: true
  }),
  room("room_wc", "WC", "wc", { x: 2, y: 6, width: 2, height: 2 }, {
    minArea: 2,
    isWetArea: true
  })
];

export const twoPlusOneFixture = plan({
  id: "plan_2plus1",
  projectId: "project_fixture_2plus1",
  title: "2+1 Apartment Concept",
  bounds: { x: 0, y: 0, width: 12, height: 8 },
  rooms: twoPlusOneRooms,
  doors: [
    door("door_entry", "entry", "room_entry", null, {
      roomId: "room_entry",
      edge: "left",
      offset: 0.5
    }),
    door("door_hall_living", "interior", "room_hall", "room_living", {
      roomId: "room_living",
      edge: "left",
      offset: 3
    }, 0.8),
    door("door_hall_bedroom_1", "interior", "room_hall", "room_bedroom_1", {
      roomId: "room_bedroom_1",
      edge: "left",
      offset: 0.5
    }),
    door("door_bath", "interior", "room_hall", "room_bath", {
      roomId: "room_bath",
      edge: "right",
      offset: 0.5
    }),
    door("door_wc", "interior", "room_hall", "room_wc", {
      roomId: "room_wc",
      edge: "top",
      offset: 0.5
    }),
    door("door_living_kitchen", "interior", "room_living", "room_kitchen", {
      roomId: "room_living",
      edge: "right",
      offset: 1
    })
  ],
  windows: [
    windowFixture("window_living", "room_living", { edge: "top", offset: 1.5 }, 2),
    windowFixture("window_kitchen", "room_kitchen", { edge: "top", offset: 0.75 }, 1.2),
    windowFixture("window_bedroom_1", "room_bedroom_1", { edge: "bottom", offset: 1 }, 1.4),
    windowFixture("window_bedroom_2", "room_bedroom_2", { edge: "right", offset: 1 }, 1.2)
  ],
  adjacencies: [
    adjacency("adj_living_kitchen", "room_living", "room_kitchen", "preferred", "Living room should be near kitchen."),
    adjacency("adj_hall_bedroom_1", "room_hall", "room_bedroom_1", "required", "Bedroom 1 should connect to hall."),
    adjacency("adj_hall_bath", "room_hall", "room_bath", "required", "Bathroom should connect to circulation.")
  ],
  promptSummary: "2+1 apartment with living room, kitchen, bathroom, WC, and two bedrooms"
});

const threePlusOneRooms = [
  room("room_entry", "Entry", "entry", { x: 0, y: 3.5, width: 2, height: 2 }),
  room("room_hall", "Hallway", "hallway", { x: 2, y: 3, width: 2, height: 3 }),
  room("room_living", "Living Room", "living", { x: 4, y: 0, width: 5, height: 4 }, {
    minArea: 14,
    isExteriorPreferred: true,
    notes: ["Open connection preferred with kitchen."]
  }),
  room("room_kitchen", "Kitchen", "kitchen", { x: 9, y: 0, width: 4, height: 3 }, {
    minArea: 7,
    isWetArea: true,
    isExteriorPreferred: true
  }),
  room("room_bedroom_1", "Bedroom 1", "bedroom", { x: 4, y: 4, width: 3.5, height: 3 }, {
    minArea: 8,
    isExteriorPreferred: true
  }),
  room("room_bedroom_2", "Bedroom 2", "bedroom", { x: 7.5, y: 4, width: 3, height: 3 }, {
    minArea: 8,
    isExteriorPreferred: true
  }),
  room("room_bedroom_3", "Bedroom 3", "bedroom", { x: 10.5, y: 4, width: 2.5, height: 3 }, {
    minArea: 7,
    isExteriorPreferred: true
  }),
  room("room_bath", "Bathroom", "bathroom", { x: 0, y: 5.5, width: 2, height: 2 }, {
    minArea: 3,
    isWetArea: true
  }),
  room("room_wc", "WC", "wc", { x: 2, y: 6, width: 2, height: 1.5 }, {
    minArea: 1.5,
    isWetArea: true
  }),
  room("room_balcony", "Balcony", "balcony", { x: 9, y: 3, width: 4, height: 1 }, {
    minArea: 2,
    isExteriorPreferred: true
  })
];

export const threePlusOneFixture = plan({
  id: "plan_3plus1",
  projectId: "project_fixture_3plus1",
  title: "3+1 Apartment Concept",
  bounds: { x: 0, y: 0, width: 13, height: 9 },
  rooms: threePlusOneRooms,
  doors: [
    door("door_entry", "entry", "room_entry", null, {
      roomId: "room_entry",
      edge: "left",
      offset: 0.5
    }, 1),
    door("door_hall_living", "interior", "room_hall", "room_living", {
      roomId: "room_living",
      edge: "left",
      offset: 3
    }, 0.8),
    door("door_living_balcony", "balcony", "room_living", "room_balcony", {
      roomId: "room_living",
      edge: "right",
      offset: 3.05
    }, 0.8, "sliding"),
    door("door_living_bedroom_1", "interior", "room_living", "room_bedroom_1", {
      roomId: "room_bedroom_1",
      edge: "top",
      offset: 1
    }),
    door("door_living_bedroom_2", "interior", "room_living", "room_bedroom_2", {
      roomId: "room_bedroom_2",
      edge: "top",
      offset: 0.5
    }),
    door("door_bath", "interior", "room_entry", "room_bath", {
      roomId: "room_bath",
      edge: "top",
      offset: 0.5
    }),
    door("door_wc", "interior", "room_hall", "room_wc", {
      roomId: "room_wc",
      edge: "top",
      offset: 0.5
    })
  ],
  windows: [
    windowFixture("window_living", "room_living", { edge: "top", offset: 1.5 }, 2),
    windowFixture("window_kitchen", "room_kitchen", { edge: "top", offset: 1 }, 1.4),
    windowFixture("window_bedroom_1", "room_bedroom_1", { edge: "bottom", offset: 1 }, 1.2),
    windowFixture("window_bedroom_2", "room_bedroom_2", { edge: "bottom", offset: 0.8 }, 1.2),
    windowFixture("window_bedroom_3", "room_bedroom_3", { edge: "right", offset: 0.8 }, 1)
  ],
  adjacencies: [
    adjacency("adj_living_kitchen", "room_living", "room_kitchen", "preferred", "Open living and kitchen relationship."),
    adjacency("adj_living_balcony", "room_living", "room_balcony", "required", "Balcony should connect to living room."),
    adjacency("adj_hall_living", "room_hall", "room_living", "required", "Hallway should connect to living room.")
  ],
  promptSummary: "3+1 apartment with open kitchen, bathroom, WC, and balcony",
  validationIssues: [mockWarningIssue]
});

export const validFloorPlanFixtures = [
  simpleOnePlusOneFixture,
  twoPlusOneFixture,
  threePlusOneFixture
] as const;
