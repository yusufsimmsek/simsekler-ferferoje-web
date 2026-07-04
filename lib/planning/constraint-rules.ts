import type { PlanningSpecification } from "./planning-types";
import type {
  PlanningRelationshipEdge,
  PlanningRelationshipGraph,
  ResolvedConstraint,
  ResolvedRoomProgramItem
} from "./resolved-planning-types";

export const planningConstraintRules = [
  {
    id: "rule_kitchen_near_living",
    statement: "Kitchen should be near the living room."
  },
  {
    id: "rule_open_kitchen_connection",
    statement: "Open kitchen should connect directly to living or dining."
  },
  {
    id: "rule_balcony_living_connection",
    statement: "Balcony should connect to the living room."
  },
  {
    id: "rule_bedroom_private_zone",
    statement: "Bedrooms should remain in a quieter private zone."
  },
  {
    id: "rule_bathroom_access",
    statement: "Bathrooms should be near bedrooms or hall."
  },
  {
    id: "rule_ensuite_master_connection",
    statement: "Ensuite should connect to the primary bedroom."
  },
  {
    id: "rule_office_quiet_daylight",
    statement: "Office should be quiet and preferably daylight-accessible."
  },
  {
    id: "rule_laundry_service_zone",
    statement: "Laundry should be near kitchen, bathroom, or service space."
  },
  {
    id: "rule_storage_access",
    statement: "Storage should be near hall or service space."
  },
  {
    id: "rule_accessible_circulation",
    statement: "Accessibility intent should avoid narrow circulation assumptions."
  },
  {
    id: "rule_daylight_priority",
    statement: "Daylight priority favors living, bedrooms, and office."
  },
  {
    id: "rule_privacy_priority",
    statement: "Privacy priority separates bedrooms from public areas."
  },
  {
    id: "rule_entertaining_priority",
    statement: "Entertaining priority favors living, dining, and kitchen adjacency."
  },
  {
    id: "rule_cooking_priority",
    statement: "Cooking priority favors kitchen area and public-space connection."
  },
  {
    id: "rule_budget_priority",
    statement: "Budget priority favors a simpler room program and compact circulation."
  }
] as const;

type RoomSeedInput = Omit<
  ResolvedRoomProgramItem,
  "daylightPriority" | "quietPriority"
>;

export function buildInitialResolvedRooms(
  specification: PlanningSpecification
): ResolvedRoomProgramItem[] {
  const rooms: RoomSeedInput[] = [
    room("room_entry", "Entry", "entry", "default", "essential", "circulation", 2.5, 4, false, false),
    room("room_living", "Living Room", "living", "required", "essential", "public", 12, 20, false, true),
    room("room_kitchen", "Kitchen", "kitchen", "required", "essential", "public", 6, 10, true, true)
  ];

  if (specification.requestedRooms.bedrooms > 1 || (specification.targetArea ?? 0) > 60) {
    rooms.splice(
      1,
      0,
      room("room_hall", "Hallway", "hallway", "default", "essential", "circulation", 4, 6, false, false)
    );
  }

  for (let index = 1; index <= specification.requestedRooms.bedrooms; index += 1) {
    rooms.push(
      room(
        `room_bedroom_${index}`,
        specification.requestedRooms.bedrooms === 1 ? "Bedroom" : `Bedroom ${index}`,
        "bedroom",
        "requested",
        "essential",
        "private",
        7,
        11,
        false,
        true
      )
    );
  }

  const regularBathrooms = specification.requestedRooms.ensuite
    ? Math.max(1, specification.requestedRooms.bathrooms - 1)
    : specification.requestedRooms.bathrooms;

  for (let index = 1; index <= regularBathrooms; index += 1) {
    rooms.push(
      room(
        `room_bathroom_${index}`,
        regularBathrooms === 1 ? "Bathroom" : `Bathroom ${index}`,
        "bathroom",
        "requested",
        "essential",
        "service",
        3,
        4.5,
        true,
        false
      )
    );
  }

  if (specification.requestedRooms.ensuite) {
    rooms.push(
      room("room_ensuite", "Ensuite", "ensuite", "requested", "preferred", "private", 3, 4, true, false)
    );
  }

  for (let index = 1; index <= specification.requestedRooms.balconies; index += 1) {
    rooms.push(
      room(
        `room_balcony_${index}`,
        specification.requestedRooms.balconies === 1 ? "Balcony" : `Balcony ${index}`,
        "balcony",
        "requested",
        index === 1 ? "preferred" : "optional",
        "outdoor",
        2,
        4,
        false,
        true
      )
    );
  }

  const optionalRooms: Array<{
    requested: boolean;
    value: RoomSeedInput;
  }> = [
    {
      requested: specification.requestedRooms.office,
      value: room("room_office", "Home Office", "other", "requested", "preferred", "private", 6, 9, false, true)
    },
    {
      requested: specification.requestedRooms.dining,
      value: room("room_dining", "Dining Room", "dining", "requested", "optional", "public", 7, 10, false, true)
    },
    {
      requested: specification.requestedRooms.guestRoom,
      value: room("room_guest", "Guest Room", "bedroom", "requested", "preferred", "private", 7, 11, false, true)
    },
    {
      requested: specification.requestedRooms.laundry,
      value: room("room_laundry", "Laundry", "laundry", "requested", "optional", "service", 2.5, 4, true, false)
    },
    {
      requested: specification.requestedRooms.pantry,
      value: room("room_pantry", "Pantry", "storage", "requested", "optional", "service", 2, 3, false, false)
    },
    {
      requested: specification.requestedRooms.storage,
      value: room("room_storage", "Storage", "storage", "requested", "optional", "service", 2, 3.5, false, false)
    },
    {
      requested: specification.requestedRooms.walkInCloset,
      value: room("room_walk_in_closet", "Walk-in Closet", "storage", "requested", "optional", "private", 3, 4, false, false)
    }
  ];

  optionalRooms.forEach(({ requested, value }) => {
    if (requested) rooms.push(value);
  });

  specification.requestedRooms.otherRooms.forEach((otherRoom) => {
    const normalized = slug(otherRoom);

    rooms.push(
      normalized === "wc"
        ? room("room_wc", "WC", "wc", "requested", "preferred", "service", 1.5, 2.5, true, false)
        : room(
            `room_${normalized}`,
            otherRoom,
            "other",
            "requested",
            "optional",
            "service",
            4,
            7,
            false,
            false
          )
    );
  });

  return rooms.map((item) => ({
    ...item,
    daylightPriority: daylightPriorityForRoom(item, specification),
    quietPriority: quietPriorityForRoom(item, specification)
  }));
}

export function buildResolvedConstraintRules(input: {
  specification: PlanningSpecification;
  rooms: ResolvedRoomProgramItem[];
  compromisedRuleIds: Set<string>;
}): ResolvedConstraint[] {
  const constraints = planningConstraintRules
    .filter((rule) => ruleApplies(rule.id, input.specification, input.rooms))
    .map((rule, index): ResolvedConstraint => ({
      id: `constraint_system_${index + 1}`,
      ruleId: rule.id,
      kind: ruleKind(rule.id, input.specification),
      statement: rule.statement,
      source: "system",
      status: input.compromisedRuleIds.has(rule.id) ? "compromised" : "applied",
      rationale: ruleRationale(rule.id)
    }));

  const userConstraints = [
    ...input.specification.mustHaveConstraints.map((statement) => ({
      kind: "must" as const,
      statement
    })),
    ...input.specification.shouldHaveConstraints.map((statement) => ({
      kind: "should" as const,
      statement
    })),
    ...input.specification.avoidConstraints.map((statement) => ({
      kind: "avoid" as const,
      statement
    })),
    ...input.specification.neverConstraints.map((statement) => ({
      kind: "never" as const,
      statement
    }))
  ].map((constraint, index): ResolvedConstraint => ({
    id: `constraint_user_${index + 1}`,
    ruleId: `rule_user_${index + 1}`,
    kind: constraint.kind,
    statement: constraint.statement,
    source: "user",
    status: "applied",
    rationale: "Preserved from the normalized planning specification."
  }));

  return [...constraints, ...userConstraints];
}

export function buildPlanningRelationshipGraph(input: {
  specification: PlanningSpecification;
  rooms: ResolvedRoomProgramItem[];
}): PlanningRelationshipGraph {
  const roomIds = new Set(input.rooms.map((room) => room.id));
  const edges: PlanningRelationshipEdge[] = [];
  const hallOrEntry = roomIds.has("room_hall") ? "room_hall" : "room_entry";

  addEdge(edges, roomIds, {
    fromRoomId: hallOrEntry,
    toRoomId: "room_living",
    relationship: "connected",
    priority: "required",
    ruleId: "rule_primary_circulation",
    reason: "Primary circulation should connect to the living room."
  });

  addEdge(edges, roomIds, {
    fromRoomId: "room_living",
    toRoomId: "room_kitchen",
    relationship: input.specification.requestedRooms.openKitchen ? "connected" : "near",
    priority: input.specification.requestedRooms.openKitchen ? "required" : "preferred",
    ruleId: input.specification.requestedRooms.openKitchen
      ? "rule_open_kitchen_connection"
      : "rule_kitchen_near_living",
    reason: input.specification.requestedRooms.openKitchen
      ? "Open kitchen intent requires a direct living-kitchen relationship."
      : "Kitchen should remain near the living room for daily use."
  });

  input.rooms
    .filter((room) => room.type === "balcony")
    .forEach((balcony) => {
      addEdge(edges, roomIds, {
        fromRoomId: "room_living",
        toRoomId: balcony.id,
        relationship: "connected",
        priority: "required",
        ruleId: "rule_balcony_living_connection",
        reason: "Balcony should connect to the living room."
      });
    });

  input.rooms
    .filter((room) => room.type === "bedroom")
    .forEach((bedroom) => {
      addEdge(edges, roomIds, {
        fromRoomId: hallOrEntry,
        toRoomId: bedroom.id,
        relationship: "near",
        priority: "preferred",
        ruleId: "rule_bedroom_private_zone",
        reason: "Bedrooms should be reached from circulation rather than through public rooms."
      });

      if (input.specification.priorities.privacy === "high") {
        addEdge(edges, roomIds, {
          fromRoomId: "room_living",
          toRoomId: bedroom.id,
          relationship: "avoid",
          priority: "avoid",
          ruleId: "rule_privacy_priority",
          reason: "High privacy priority should separate bedrooms from the living room."
        });
      }
    });

  input.rooms
    .filter((room) => room.type === "bathroom" || room.type === "wc")
    .forEach((bathroom) => {
      addEdge(edges, roomIds, {
        fromRoomId: hallOrEntry,
        toRoomId: bathroom.id,
        relationship: "near",
        priority: "preferred",
        ruleId: "rule_bathroom_access",
        reason: "Bathrooms should remain accessible from hall or private circulation."
      });
    });

  addEdge(edges, roomIds, {
    fromRoomId: "room_bedroom_1",
    toRoomId: "room_ensuite",
    relationship: "connected",
    priority: "required",
    ruleId: "rule_ensuite_master_connection",
    reason: "Ensuite should connect to the primary bedroom."
  });

  addEdge(edges, roomIds, {
    fromRoomId: "room_office",
    toRoomId: "room_living",
    relationship: "avoid",
    priority: "avoid",
    ruleId: "rule_office_quiet_daylight",
    reason: "Office should be quiet and separated from the main living activity."
  });

  const serviceAnchor = roomIds.has("room_bathroom_1")
    ? "room_bathroom_1"
    : "room_kitchen";

  addEdge(edges, roomIds, {
    fromRoomId: "room_laundry",
    toRoomId: serviceAnchor,
    relationship: "near",
    priority: "preferred",
    ruleId: "rule_laundry_service_zone",
    reason: "Laundry should remain near a wet or service area."
  });

  for (const storageId of ["room_storage", "room_pantry"]) {
    addEdge(edges, roomIds, {
      fromRoomId: storageId,
      toRoomId: storageId === "room_pantry" ? "room_kitchen" : hallOrEntry,
      relationship: "near",
      priority: "preferred",
      ruleId: "rule_storage_access",
      reason: "Storage should be accessible from circulation or its service anchor."
    });
  }

  if (input.specification.priorities.entertaining === "high") {
    addEdge(edges, roomIds, {
      fromRoomId: "room_living",
      toRoomId: roomIds.has("room_dining") ? "room_dining" : "room_kitchen",
      relationship: "connected",
      priority: "preferred",
      ruleId: "rule_entertaining_priority",
      reason: "Entertaining priority favors a connected public zone."
    });
  }

  input.specification.roomRelationships.forEach((relationship, index) => {
    const fromRoomId = resolveRoomReference(relationship.from, input.rooms);
    const toRoomId = resolveRoomReference(relationship.to, input.rooms);

    if (!fromRoomId || !toRoomId) return;

    addEdge(edges, roomIds, {
      fromRoomId,
      toRoomId,
      relationship: relationship.relationship,
      priority:
        relationship.priority === "must"
          ? "required"
          : relationship.priority === "avoid" || relationship.relationship === "avoid"
            ? "avoid"
            : "preferred",
      ruleId: `rule_user_relationship_${index + 1}`,
      reason: relationship.reason
    });
  });

  return {
    nodes: input.rooms.map((room) => ({
      roomId: room.id,
      roomType: room.type,
      zone: room.zone,
      daylightPriority: room.daylightPriority,
      quietPriority: room.quietPriority
    })),
    edges: uniqueEdges(edges).slice(0, 40)
  };
}

export function estimateMinimumProgramArea(rooms: ResolvedRoomProgramItem[]) {
  return roundArea(rooms.reduce((total, room) => total + room.minimumArea, 0));
}

function room(
  id: string,
  name: string,
  type: ResolvedRoomProgramItem["type"],
  source: ResolvedRoomProgramItem["source"],
  priority: ResolvedRoomProgramItem["priority"],
  zone: ResolvedRoomProgramItem["zone"],
  minimumArea: number,
  baseTargetArea: number,
  isWetArea: boolean,
  isExteriorPreferred: boolean
): RoomSeedInput {
  return {
    id,
    name,
    type,
    source,
    priority,
    zone,
    minimumArea,
    baseTargetArea,
    isWetArea,
    isExteriorPreferred
  };
}

function daylightPriorityForRoom(
  room: RoomSeedInput,
  specification: PlanningSpecification
): ResolvedRoomProgramItem["daylightPriority"] {
  if (["living", "bedroom"].includes(room.type) || room.id === "room_office") {
    return specification.priorities.daylight === "high" ? "required" : "preferred";
  }

  if (["kitchen", "dining"].includes(room.type)) return "preferred";
  return "not_required";
}

function quietPriorityForRoom(
  room: RoomSeedInput,
  specification: PlanningSpecification
): ResolvedRoomProgramItem["quietPriority"] {
  if (room.type === "bedroom" || room.id === "room_office") return "high";
  if (specification.priorities.privacy === "high" && room.zone === "private") return "high";
  if (room.zone === "private") return "medium";
  return "low";
}

function ruleApplies(
  ruleId: string,
  specification: PlanningSpecification,
  rooms: ResolvedRoomProgramItem[]
) {
  const roomIds = new Set(rooms.map((room) => room.id));

  if (ruleId === "rule_open_kitchen_connection") return specification.requestedRooms.openKitchen;
  if (ruleId === "rule_balcony_living_connection") return specification.requestedRooms.balconies > 0;
  if (ruleId === "rule_bedroom_private_zone") return specification.requestedRooms.bedrooms > 0;
  if (ruleId === "rule_bathroom_access") return specification.requestedRooms.bathrooms > 0;
  if (ruleId === "rule_ensuite_master_connection") return specification.requestedRooms.ensuite;
  if (ruleId === "rule_office_quiet_daylight") return roomIds.has("room_office");
  if (ruleId === "rule_laundry_service_zone") return roomIds.has("room_laundry");
  if (ruleId === "rule_storage_access") {
    return roomIds.has("room_storage") || roomIds.has("room_pantry");
  }
  if (ruleId === "rule_accessible_circulation") {
    return specification.household.accessibilityNeeds.length > 0;
  }
  if (ruleId === "rule_daylight_priority") return specification.priorities.daylight === "high";
  if (ruleId === "rule_privacy_priority") return specification.priorities.privacy === "high";
  if (ruleId === "rule_entertaining_priority") return specification.priorities.entertaining === "high";
  if (ruleId === "rule_cooking_priority") return specification.priorities.cooking === "high";
  if (ruleId === "rule_budget_priority") return specification.priorities.budget === "high";
  return true;
}

function ruleKind(
  ruleId: string,
  specification: PlanningSpecification
): ResolvedConstraint["kind"] {
  if (ruleId === "rule_open_kitchen_connection" || ruleId === "rule_balcony_living_connection") {
    return "must";
  }
  if (ruleId === "rule_privacy_priority") return "avoid";
  if (
    ruleId === "rule_accessible_circulation" &&
    specification.household.accessibilityNeeds.length > 0
  ) {
    return "must";
  }
  return "should";
}

function ruleRationale(ruleId: string) {
  if (ruleId === "rule_budget_priority") {
    return "Budget priority is high, so optional rooms and circulation complexity may be reduced."
  }
  if (ruleId === "rule_daylight_priority") {
    return "Daylight priority is high, so habitable rooms receive exterior preference."
  }
  if (ruleId === "rule_privacy_priority") {
    return "Privacy priority is high, so private rooms are separated from public activity."
  }
  return "Applied by the deterministic residential planning rule set."
}

function addEdge(
  edges: PlanningRelationshipEdge[],
  roomIds: Set<string>,
  edge: Omit<PlanningRelationshipEdge, "id">
) {
  if (
    !roomIds.has(edge.fromRoomId) ||
    !roomIds.has(edge.toRoomId) ||
    edge.fromRoomId === edge.toRoomId
  ) {
    return;
  }

  edges.push({
    id: `relationship_${edges.length + 1}`,
    ...edge
  });
}

function resolveRoomReference(
  reference: string,
  rooms: ResolvedRoomProgramItem[]
) {
  const normalized = slug(reference);
  const direct = `room_${normalized}`;
  const roomIds = new Set(rooms.map((room) => room.id));

  if (roomIds.has(direct)) return direct;
  if (normalized === "hallway" || normalized === "hall") {
    return roomIds.has("room_hall") ? "room_hall" : "room_entry";
  }
  if (normalized === "bedroom") return rooms.find((room) => room.type === "bedroom")?.id;
  if (normalized === "bathroom") return rooms.find((room) => room.type === "bathroom")?.id;
  if (normalized === "balcony") return rooms.find((room) => room.type === "balcony")?.id;
  if (normalized === "office") return roomIds.has("room_office") ? "room_office" : undefined;

  return undefined;
}

function uniqueEdges(edges: PlanningRelationshipEdge[]) {
  return Array.from(
    new Map(
      edges.map((edge) => [
        [
          edge.fromRoomId,
          edge.toRoomId,
          edge.relationship,
          edge.priority
        ]
          .sort()
          .join(":"),
        edge
      ])
    ).values()
  ).map((edge, index) => ({
    ...edge,
    id: `relationship_${index + 1}`
  }));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function roundArea(value: number) {
  return Number(value.toFixed(2));
}
