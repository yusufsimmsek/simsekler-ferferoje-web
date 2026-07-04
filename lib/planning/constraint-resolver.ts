import {
  buildInitialResolvedRooms,
  buildPlanningRelationshipGraph,
  buildResolvedConstraintRules,
  estimateMinimumProgramArea
} from "./constraint-rules";
import { calculatePlanningFeasibility } from "./feasibility-score";
import { normalizePlanningSpecification } from "./planning-normalizer";
import type { PlanningSpecification } from "./planning-types";
import { validatePlanningSpecification } from "./planning-validation";
import { resolvedPlanningSpecificationSchema } from "./resolved-planning-schema";
import type {
  PlanningCompromise,
  PlanningConflict,
  PlanningRecommendation,
  ResolvedPlanningSpecification,
  ResolvedRoomProgramItem,
  UnresolvedPlanningItem
} from "./resolved-planning-types";

export type ResolvePlanningConstraintsResult =
  | {
      ok: true;
      data: ResolvedPlanningSpecification;
      warnings: string[];
    }
  | {
      ok: false;
      data: null;
      warnings: string[];
      issues: string[];
    };

export function resolvePlanningConstraints(
  input: PlanningSpecification
): ResolvePlanningConstraintsResult {
  const planningValidation = validatePlanningSpecification(input);

  if (!planningValidation.ok) {
    return {
      ok: false,
      data: null,
      warnings: [],
      issues: planningValidation.issues.map((issue) => issue.message)
    };
  }

  const specification = normalizePlanningSpecification(planningValidation.data);
  const initialRooms = buildInitialResolvedRooms(specification);
  const circulationAllowance = circulationAllowanceFor(specification);
  const resolvedTargetArea =
    specification.targetArea ??
    defaultTargetArea(specification.requestedRooms.bedrooms);
  const targetUsableArea = roundArea(
    resolvedTargetArea * (1 - circulationAllowance)
  );
  const initialMinimumArea = estimateMinimumProgramArea(initialRooms);
  const conflicts = detectPlanningConflicts({
    specification,
    initialRooms,
    targetUsableArea,
    initialMinimumArea
  });
  const resolution = applyPlanningCompromises({
    specification,
    initialRooms,
    targetUsableArea,
    initialMinimumArea
  });
  const estimatedMinimumArea = estimateMinimumProgramArea(resolution.rooms);
  const roomProgram = {
    rooms: resolution.rooms,
    omittedRooms: resolution.omittedRooms,
    mergedSpaces: resolution.mergedSpaces,
    requestedRoomCount: initialRooms.length,
    resolvedRoomCount: resolution.rooms.length,
    targetArea: specification.targetArea,
    targetUsableArea,
    estimatedMinimumArea,
    circulationAllowance
  };
  const relationshipGraph = buildPlanningRelationshipGraph({
    specification,
    rooms: resolution.rooms
  });
  const resolvedConstraints = buildResolvedConstraintRules({
    specification,
    rooms: resolution.rooms,
    compromisedRuleIds: resolution.compromisedRuleIds
  });
  const feasibility = calculatePlanningFeasibility({
    specification,
    roomProgram,
    relationshipGraph,
    conflicts
  });
  const recommendations = buildRecommendations({
    specification,
    conflicts,
    feasibilityScore: feasibility.overallScore,
    estimatedMinimumArea,
    circulationAllowance
  });
  const unresolvedItems = buildUnresolvedItems(specification, conflicts);
  const compromises = [...resolution.compromises];

  if (feasibility.rating === "low") {
    compromises.push({
      id: `compromise_${compromises.length + 1}`,
      code: "request_clarification",
      action: "clarify",
      description:
        "Feasibility is too low for a reliable automatic room program; clarify priorities or increase the target area.",
      affectedRooms: resolution.rooms.map((room) => room.id),
      applied: false
    });
    unresolvedItems.push({
      id: `unresolved_${unresolvedItems.length + 1}`,
      code: "low_feasibility",
      message:
        "The resolved program remains too constrained for reliable automatic generation.",
      clarificationQuestion:
        "Which rooms can be removed, combined, or reduced, or can the target area be increased?"
    });
  }

  const warnings = uniqueStrings([
    ...specification.warnings,
    ...conflicts.map((conflict) => conflict.message),
    ...compromises.map((compromise) => compromise.description),
    `Planning feasibility score: ${feasibility.overallScore}/100 (${feasibility.rating}).`
  ]);
  const assumptions = uniqueStrings([
    ...specification.assumptions,
    "Planning constraints were resolved by deterministic residential rules.",
    "Feasibility scoring is conceptual and is not architectural, structural, legal, or code-compliance validation.",
    ...compromises
      .filter((compromise) => compromise.applied)
      .map((compromise) => `Applied compromise: ${compromise.description}`)
  ]);
  const parsed = resolvedPlanningSpecificationSchema.safeParse({
    schemaVersion: "resolved-planning-specification-v1",
    originalPlanningSummary: {
      schemaVersion: specification.schemaVersion,
      title: specification.title,
      buildingType: specification.buildingType,
      targetArea: specification.targetArea,
      requestedRoomCount: initialRooms.length,
      confidenceScore: specification.confidenceScore,
      unsupportedRequestCount: specification.unsupportedRequests.length,
      clarificationQuestionCount: specification.clarificationQuestions.length
    },
    normalizedSpecification: specification,
    resolvedRoomProgram: roomProgram,
    resolvedConstraints,
    relationshipGraph,
    feasibility,
    conflicts,
    compromises,
    warnings,
    assumptions,
    recommendations,
    unresolvedItems,
    metadata: {
      resolver: "deterministic-constraint-resolver-v1",
      ruleSetVersion: "planning-constraint-rules-v1",
      inputSchemaVersion: "planning-specification-v1",
      deterministic: true,
      sourceConfidence: specification.confidenceScore
    }
  });

  if (!parsed.success) {
    return {
      ok: false,
      data: null,
      warnings,
      issues: parsed.error.issues.map((issue) => issue.message)
    };
  }

  return {
    ok: true,
    data: parsed.data,
    warnings
  };
}

function detectPlanningConflicts(input: {
  specification: PlanningSpecification;
  initialRooms: ResolvedRoomProgramItem[];
  targetUsableArea: number;
  initialMinimumArea: number;
}): PlanningConflict[] {
  const conflicts: PlanningConflict[] = [];
  const areaRatio = input.targetUsableArea / input.initialMinimumArea;

  if (areaRatio < 1) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "room_program_exceeds_area",
      severity: areaRatio < 0.75 ? "critical" : "warning",
      message: `The requested room program needs about ${input.initialMinimumArea} m2 of usable room area, but only ${input.targetUsableArea} m2 is available after circulation allowance.`,
      affectedItems: input.initialRooms.map((room) => room.id),
      resolution:
        "Combine or omit optional rooms, reduce room targets, or increase the total target area."
    });
  }

  if (input.initialRooms.length > 12) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "room_count_exceeds_mvp",
      severity: "critical",
      message: `The requested ${input.initialRooms.length}-room program exceeds the 12-room MVP limit.`,
      affectedItems: input.initialRooms.slice(12).map((room) => room.id),
      resolution: "Omit or combine lower-priority optional spaces."
    });
  }

  if (
    input.specification.requestedRooms.balconies > 1 &&
    (input.specification.targetArea ?? input.targetUsableArea) < 60
  ) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "multiple_balconies_small_area",
      severity: "warning",
      message: "Multiple balconies consume disproportionate area in a very small home.",
      affectedItems: input.initialRooms
        .filter((room) => room.type === "balcony")
        .map((room) => room.id),
      resolution: "Keep one primary balcony connected to the living room."
    });
  }

  const luxuryAmenities = [
    input.specification.requestedRooms.ensuite,
    input.specification.requestedRooms.dining,
    input.specification.requestedRooms.pantry,
    input.specification.requestedRooms.walkInCloset,
    input.specification.requestedRooms.guestRoom,
    input.specification.requestedRooms.office
  ].filter(Boolean).length;

  if (
    input.specification.architecturalStyle === "luxury" &&
    luxuryAmenities >= 3 &&
    (input.specification.targetArea ?? 0) < 180
  ) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "luxury_program_insufficient_area",
      severity: "critical",
      message:
        "The requested luxury room program is unlikely to fit comfortably within the target area.",
      affectedItems: input.initialRooms
        .filter((room) => room.priority !== "essential")
        .map((room) => room.id),
      resolution: "Increase target area or remove lower-priority luxury amenities."
    });
  }

  if (
    input.specification.household.accessibilityNeeds.length > 0 &&
    (input.specification.targetArea ?? 0) < 75
  ) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "accessibility_small_area",
      severity: "critical",
      message:
        "The target area is very small for the requested accessibility intent and generous circulation assumptions.",
      affectedItems: ["circulation", ...input.specification.household.accessibilityNeeds],
      resolution:
        "Increase target area or simplify the room program; accessibility remains conceptual only."
    });
  }

  const officeHeavy =
    input.specification.requestedRooms.office &&
    input.specification.requestedRooms.bedrooms >= 3 &&
    (input.specification.requestedRooms.storage ||
      input.specification.requestedRooms.guestRoom ||
      input.specification.requestedRooms.laundry);

  if (officeHeavy && (input.specification.targetArea ?? 0) < 120) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "office_heavy_program_insufficient_area",
      severity: "critical",
      message:
        "The office, bedroom, and service-space program is too dense for the requested area.",
      affectedItems: ["room_office", "bedrooms", "service_spaces"],
      resolution: "Combine office with guest use, reduce service rooms, or increase area."
    });
  }

  if (
    input.specification.requestedRooms.openKitchen &&
    hasSeparateKitchenConstraint(input.specification)
  ) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "open_and_separate_kitchen",
      severity: "critical",
      message:
        "The request requires both an open kitchen and a fully separate kitchen.",
      affectedItems: ["room_kitchen", "room_living"],
      resolution: "Clarify whether the kitchen should be open or fully enclosed."
    });
  }

  if (input.specification.unsupportedRequests.length > 0) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "unsupported_request_leak",
      severity: "critical",
      message:
        "Unsupported planning requests reached the constraint resolver and must not proceed to draft generation.",
      affectedItems: input.specification.unsupportedRequests.map(
        (request) => request.code
      ),
      resolution: "Return the structured unsupported response before layout."
    });
  }

  if (
    input.specification.missingInformation.length > 0 ||
    input.specification.clarificationQuestions.length > 0
  ) {
    conflicts.push({
      id: `conflict_${conflicts.length + 1}`,
      code: "unresolved_request_leak",
      severity: "critical",
      message:
        "Unresolved planning questions reached the constraint resolver and require clarification.",
      affectedItems: input.specification.missingInformation,
      resolution: "Return the clarification questions before semantic draft generation."
    });
  }

  return conflicts;
}

function applyPlanningCompromises(input: {
  specification: PlanningSpecification;
  initialRooms: ResolvedRoomProgramItem[];
  targetUsableArea: number;
  initialMinimumArea: number;
}) {
  let rooms = structuredClone(input.initialRooms);
  const compromises: PlanningCompromise[] = [];
  const omittedRooms: string[] = [];
  const mergedSpaces: Array<{
    primaryRoomId: string;
    mergedUse: string;
    reason: string;
  }> = [];
  const compromisedRuleIds = new Set<string>();
  const isAreaConstrained = input.targetUsableArea < input.initialMinimumArea * 1.05;

  if (
    input.specification.requestedRooms.balconies > 1 &&
    (input.specification.targetArea ?? input.targetUsableArea) < 60
  ) {
    const removed = rooms.filter(
      (room) => room.type === "balcony" && room.id !== "room_balcony_1"
    );
    rooms = rooms.filter(
      (room) => room.type !== "balcony" || room.id === "room_balcony_1"
    );
    omittedRooms.push(...removed.map((room) => room.name));
    compromises.push({
      id: `compromise_${compromises.length + 1}`,
      code: "reduce_balcony_count",
      action: "reduce",
      description:
        "Balcony count was reduced to one primary living-room balcony for the small target area.",
      affectedRooms: removed.map((room) => room.id),
      applied: true
    });
    compromisedRuleIds.add("rule_balcony_living_connection");
  }

  if (isAreaConstrained && rooms.some((room) => room.id === "room_dining")) {
    rooms = rooms.filter((room) => room.id !== "room_dining");
    omittedRooms.push("Dining Room");
    mergedSpaces.push({
      primaryRoomId: "room_living",
      mergedUse: "dining",
      reason: "Dining use was combined with living to reduce room count and circulation."
    });
    compromises.push({
      id: `compromise_${compromises.length + 1}`,
      code: "combine_dining_with_living",
      action: "merge",
      description:
        "Dining was combined with the living room to preserve usable area.",
      affectedRooms: ["room_living", "room_dining"],
      applied: true
    });
    compromisedRuleIds.add("rule_entertaining_priority");
  }

  if (
    isAreaConstrained &&
    rooms.some((room) => room.id === "room_office") &&
    rooms.some((room) => room.id === "room_guest")
  ) {
    rooms = rooms
      .filter((room) => room.id !== "room_office")
      .map((room) =>
        room.id === "room_guest"
          ? {
              ...room,
              name: "Guest Room / Office",
              daylightPriority: "required" as const,
              quietPriority: "high" as const
            }
          : room
      );
    omittedRooms.push("Dedicated Home Office");
    mergedSpaces.push({
      primaryRoomId: "room_guest",
      mergedUse: "office",
      reason: "Guest and work uses were combined to reduce the room program."
    });
    compromises.push({
      id: `compromise_${compromises.length + 1}`,
      code: "combine_office_with_guest",
      action: "merge",
      description:
        "The dedicated office was combined with the guest room because the program is area-constrained.",
      affectedRooms: ["room_guest", "room_office"],
      applied: true
    });
    compromisedRuleIds.add("rule_office_quiet_daylight");
  }

  if (isAreaConstrained && input.specification.priorities.budget === "high") {
    const removableIds = new Set(["room_laundry", "room_storage"]);
    const removed = rooms.filter((room) => removableIds.has(room.id));

    if (removed.length > 0) {
      rooms = rooms.filter((room) => !removableIds.has(room.id));
      omittedRooms.push(...removed.map((room) => room.name));
      compromises.push({
        id: `compromise_${compromises.length + 1}`,
        code: "reduce_service_space_priority",
        action: "omit",
        description:
          "Separate laundry or storage rooms were omitted in favor of compact integrated storage.",
        affectedRooms: removed.map((room) => room.id),
        applied: true
      });
      compromisedRuleIds.add("rule_budget_priority");
      compromisedRuleIds.add("rule_storage_access");
      compromisedRuleIds.add("rule_laundry_service_zone");
    }
  }

  while (rooms.length > 12) {
    const removableIndex = findLastRemovableRoomIndex(rooms);
    const index = removableIndex >= 0 ? removableIndex : rooms.length - 1;
    const [removed] = rooms.splice(index, 1);

    omittedRooms.push(removed.name);
    compromises.push({
      id: `compromise_${compromises.length + 1}`,
      code: "omit_optional_room",
      action: "omit",
      description: `${removed.name} was omitted to keep the program within the 12-room MVP limit.`,
      affectedRooms: [removed.id],
      applied: true
    });
  }

  if (input.targetUsableArea < estimateMinimumProgramArea(rooms)) {
    compromises.push({
      id: `compromise_${compromises.length + 1}`,
      code: "suggest_larger_area",
      action: "recommend",
      description:
        "A larger target area is recommended because the resolved essential room minimums remain constrained.",
      affectedRooms: rooms.map((room) => room.id),
      applied: false
    });
  }

  return {
    rooms,
    compromises,
    omittedRooms: uniqueStrings(omittedRooms),
    mergedSpaces,
    compromisedRuleIds
  };
}

function buildRecommendations(input: {
  specification: PlanningSpecification;
  conflicts: PlanningConflict[];
  feasibilityScore: number;
  estimatedMinimumArea: number;
  circulationAllowance: number;
}): PlanningRecommendation[] {
  const recommendations: PlanningRecommendation[] = [];

  if (
    input.conflicts.some(
      (conflict) => conflict.code === "room_program_exceeds_area"
    )
  ) {
    const suggestedArea = Math.ceil(
      input.estimatedMinimumArea / (1 - input.circulationAllowance)
    );

    recommendations.push({
      id: `recommendation_${recommendations.length + 1}`,
      code: "increase_target_area",
      priority: "high",
      message: `Consider increasing the total target area to at least about ${suggestedArea} m2 or removing optional rooms.`
    });
  }

  if (input.specification.priorities.budget === "high") {
    recommendations.push({
      id: `recommendation_${recommendations.length + 1}`,
      code: "keep_compact_program",
      priority: "medium",
      message:
        "Keep dining, storage, and laundry uses integrated where possible to reduce circulation and room count."
    });
  }

  if (input.specification.household.accessibilityNeeds.length > 0) {
    recommendations.push({
      id: `recommendation_${recommendations.length + 1}`,
      code: "verify_accessibility_professionally",
      priority: "high",
      message:
        "Treat accessibility preferences as conceptual and verify dimensions with a qualified professional."
    });
  }

  if (input.feasibilityScore < 45) {
    recommendations.push({
      id: `recommendation_${recommendations.length + 1}`,
      code: "clarify_low_feasibility",
      priority: "high",
      message:
        "Clarify which rooms are essential before generating geometry from this low-feasibility program."
    });
  }

  return recommendations;
}

function buildUnresolvedItems(
  specification: PlanningSpecification,
  conflicts: PlanningConflict[]
): UnresolvedPlanningItem[] {
  const unresolved: UnresolvedPlanningItem[] = [];

  specification.unsupportedRequests.forEach((request) => {
    unresolved.push({
      id: `unresolved_${unresolved.length + 1}`,
      code: request.code,
      message: request.message,
      clarificationQuestion: null
    });
  });

  specification.clarificationQuestions.forEach((question) => {
    unresolved.push({
      id: `unresolved_${unresolved.length + 1}`,
      code: question.id,
      message: question.question,
      clarificationQuestion: question.question
    });
  });

  if (
    conflicts.some(
      (conflict) => conflict.code === "open_and_separate_kitchen"
    )
  ) {
    unresolved.push({
      id: `unresolved_${unresolved.length + 1}`,
      code: "kitchen_configuration_conflict",
      message: "Kitchen openness is contradictory.",
      clarificationQuestion:
        "Should the kitchen be open to the living/dining area or fully enclosed?"
    });
  }

  return unresolved;
}

function hasSeparateKitchenConstraint(specification: PlanningSpecification) {
  const constraints = [
    ...specification.mustHaveConstraints,
    ...specification.shouldHaveConstraints,
    ...specification.avoidConstraints,
    ...specification.neverConstraints
  ].join(" ").toLowerCase();

  return /\b(fully\s+separate|separate|closed|enclosed)\s+kitchen\b/.test(
    constraints
  ) || /\bkitchen\s+must\s+be\s+(fully\s+)?(separate|closed|enclosed)\b/.test(
    constraints
  );
}

function findLastRemovableRoomIndex(rooms: ResolvedRoomProgramItem[]) {
  for (let index = rooms.length - 1; index >= 0; index -= 1) {
    if (rooms[index].priority === "optional") return index;
  }

  for (let index = rooms.length - 1; index >= 0; index -= 1) {
    if (rooms[index].priority === "preferred") return index;
  }

  return -1;
}

function circulationAllowanceFor(specification: PlanningSpecification) {
  if (specification.household.accessibilityNeeds.length > 0) return 0.18;
  if (specification.priorities.budget === "high") return 0.1;
  return 0.12;
}

function defaultTargetArea(bedrooms: number) {
  if (bedrooms <= 1) return 55;
  if (bedrooms === 2) return 85;
  if (bedrooms === 3) return 120;
  return Math.min(240, 120 + (bedrooms - 3) * 25);
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function roundArea(value: number) {
  return Number(value.toFixed(2));
}
