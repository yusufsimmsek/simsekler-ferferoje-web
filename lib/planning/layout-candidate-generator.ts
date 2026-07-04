import type {
  PlanDraft,
  PlanDraftRoom,
  ValidationIssue
} from "@/lib/floor-plan/types";
import {
  generateFloorPlanLayout,
  type GenerateFloorPlanLayoutInput,
  type LayoutGenerationStrategy
} from "@/lib/layout-engine/generate-layout";
import { zodErrorToValidationIssues } from "@/lib/floor-plan/validation";
import {
  layoutCandidateSchema,
  rejectedLayoutCandidateSchema
} from "./candidate-schema";
import type {
  LayoutCandidate,
  RejectedLayoutCandidate
} from "./candidate-types";

export type GenerateLayoutCandidatesInput = Omit<
  GenerateFloorPlanLayoutInput,
  "candidateStrategy"
>;

export type GenerateLayoutCandidatesResult = {
  candidates: LayoutCandidate[];
  rejectedCandidates: RejectedLayoutCandidate[];
  warnings: string[];
};

type CandidateDefinition = {
  id: string;
  label: string;
  strategy: LayoutGenerationStrategy;
  variation: LayoutCandidate["variation"];
  transformDraft: (draft: PlanDraft) => PlanDraft;
};

const candidateDefinitions: CandidateDefinition[] = [
  {
    id: "candidate_a",
    label: "Candidate A",
    strategy: "base_public_band",
    variation: {
      roomOrdering: "Resolved planning order is preserved.",
      publicPrivateZoning: "Public rooms sit in the top band and private rooms sit below.",
      kitchenPlacement: "Kitchen is placed adjacent to the living room.",
      balconyPlacement: "Balcony is stacked beside kitchen and living when present.",
      officePlacement: "Office follows the default private/service ordering.",
      hallwayStrategy: "Hallway bridges entry, living, and private rooms.",
      circulationStrategy: "Baseline linear circulation from entry to private band."
    },
    transformDraft: cloneDraft
  },
  {
    id: "candidate_b",
    label: "Candidate B",
    strategy: "private_zone_first",
    variation: {
      roomOrdering: "Wet/service rooms are ordered before bedrooms in the private band.",
      publicPrivateZoning: "Private rooms remain below the public band with service access first.",
      kitchenPlacement: "Kitchen remains beside the living room.",
      balconyPlacement: "Balcony remains in the public-side stack when present.",
      officePlacement: "Office-like rooms stay after essential private rooms.",
      hallwayStrategy: "Hallway prioritizes short access to bathrooms and service rooms.",
      circulationStrategy: "Service-first circulation is tested for bathroom access."
    },
    transformDraft: (draft) =>
      reorderDraftRooms(draft, [
        "entry",
        "hallway",
        "living",
        "kitchen",
        "balcony",
        "bathroom",
        "ensuite",
        "wc",
        "laundry",
        "utility",
        "bedroom",
        "storage",
        "dining",
        "other"
      ])
  },
  {
    id: "candidate_c",
    label: "Candidate C",
    strategy: "wide_public_core",
    variation: {
      roomOrdering: "Public rooms are kept together and weighted before private rooms.",
      publicPrivateZoning: "Living and kitchen receive a wider public core.",
      kitchenPlacement: "Kitchen receives a modest area boost beside living.",
      balconyPlacement: "Balcony stays connected to the public core when present.",
      officePlacement: "Office-like rooms remain in the private/other room tail.",
      hallwayStrategy: "Hallway and entry are slightly compressed when possible.",
      circulationStrategy: "Public-core comfort is tested against private-room balance."
    },
    transformDraft: (draft) =>
      adjustDraftTargets(
        reorderDraftRooms(draft, [
          "entry",
          "hallway",
          "living",
          "kitchen",
          "dining",
          "balcony",
          "bedroom",
          "bathroom",
          "ensuite",
          "wc",
          "laundry",
          "utility",
          "storage",
          "other"
        ]),
        {
          living: 1.1,
          kitchen: 1.08,
          dining: 1.05,
          entry: 0.95,
          hallway: 0.95,
          bedroom: 0.97
        }
      )
  },
  {
    id: "candidate_d",
    label: "Candidate D",
    strategy: "service_core",
    variation: {
      roomOrdering: "Kitchen and wet/service rooms are pulled earlier in the order.",
      publicPrivateZoning: "Service functions are tested closer to entry circulation.",
      kitchenPlacement: "Kitchen is placed before the living room as a service anchor.",
      balconyPlacement: "Balcony stays on the living edge when available.",
      officePlacement: "Office-like rooms are buffered behind bedrooms and service spaces.",
      hallwayStrategy: "Hallway favors shorter wet-room access.",
      circulationStrategy: "Service-core circulation is tested against living/kitchen adjacency."
    },
    transformDraft: (draft) =>
      reorderDraftRooms(draft, [
        "entry",
        "hallway",
        "kitchen",
        "living",
        "balcony",
        "bathroom",
        "ensuite",
        "wc",
        "laundry",
        "utility",
        "bedroom",
        "storage",
        "dining",
        "other"
      ])
  },
  {
    id: "candidate_e",
    label: "Candidate E",
    strategy: "balcony_living_edge",
    variation: {
      roomOrdering: "Living room is ordered before balcony and kitchen.",
      publicPrivateZoning: "Outdoor access is tested as a stronger public edge.",
      kitchenPlacement: "Kitchen follows the living/balcony edge.",
      balconyPlacement: "Balcony is placed directly after the living room.",
      officePlacement: "Office-like rooms use default private ordering.",
      hallwayStrategy: "Hallway remains a simple connector from entry to living.",
      circulationStrategy: "Outdoor relationship is prioritized over service compactness."
    },
    transformDraft: (draft) =>
      reorderDraftRooms(draft, [
        "entry",
        "hallway",
        "living",
        "balcony",
        "kitchen",
        "dining",
        "bedroom",
        "bathroom",
        "ensuite",
        "wc",
        "laundry",
        "utility",
        "storage",
        "other"
      ])
  },
  {
    id: "candidate_f",
    label: "Candidate F",
    strategy: "office_quiet_buffer",
    variation: {
      roomOrdering: "Office-like rooms are pushed to the quiet private end.",
      publicPrivateZoning: "Quiet rooms are buffered from the public band.",
      kitchenPlacement: "Kitchen remains near living in the public band.",
      balconyPlacement: "Balcony remains near living when present.",
      officePlacement: "Office is placed after bedrooms and wet rooms where possible.",
      hallwayStrategy: "Hallway maintains default access while office receives separation.",
      circulationStrategy: "Quiet-room separation is tested against overall compactness."
    },
    transformDraft: (draft) =>
      adjustOfficeDraft(
        reorderDraftRooms(draft, [
          "entry",
          "hallway",
          "living",
          "kitchen",
          "balcony",
          "bedroom",
          "bathroom",
          "ensuite",
          "wc",
          "laundry",
          "utility",
          "storage",
          "dining",
          "other"
        ])
      )
  }
];

export function generateLayoutCandidates(
  input: GenerateLayoutCandidatesInput
): GenerateLayoutCandidatesResult {
  const candidates: LayoutCandidate[] = [];
  const rejectedCandidates: RejectedLayoutCandidate[] = [];

  candidateDefinitions.forEach((definition, index) => {
    const draft = definition.transformDraft(input.draft);
    const layout = generateFloorPlanLayout({
      ...input,
      draft,
      candidateStrategy: definition.strategy
    });
    const candidatePayload = {
      schemaVersion: "layout-candidate-v1",
      id: definition.id,
      label: definition.label,
      strategy: definition.strategy,
      variation: definition.variation,
      plan: layout.plan,
      warnings: uniqueStrings(layout.warnings),
      metadata: {
        generatedBy: "deterministic-layout-candidate-generator-v1",
        layoutEngine: "rectangular-grid-v1",
        deterministic: true,
        order: index + 1
      }
    };
    const candidateParse = layoutCandidateSchema.safeParse(candidatePayload);

    if (candidateParse.success) {
      candidates.push(candidateParse.data);
      return;
    }

    rejectedCandidates.push(
      createRejectedCandidate({
        definition,
        reason: "Candidate failed layout candidate schema validation.",
        issues: zodErrorToValidationIssues(
          candidateParse.error,
          `layout-candidate-${definition.id}`
        )
      })
    );
  });

  return {
    candidates,
    rejectedCandidates,
    warnings: uniqueStrings(
      rejectedCandidates.map(
        (candidate) => `${candidate.label} was rejected: ${candidate.reason}`
      )
    )
  };
}

export function getLayoutCandidateDefinitions() {
  return candidateDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    strategy: definition.strategy,
    variation: definition.variation
  }));
}

function createRejectedCandidate(input: {
  definition: CandidateDefinition;
  reason: string;
  issues: ValidationIssue[];
}) {
  return rejectedLayoutCandidateSchema.parse({
    id: input.definition.id,
    label: input.definition.label,
    strategy: input.definition.strategy,
    reason: input.reason,
    issues: input.issues
  });
}

function cloneDraft(draft: PlanDraft): PlanDraft {
  return {
    ...draft,
    rooms: draft.rooms.map((room) => ({ ...room })),
    adjacencies: draft.adjacencies.map((adjacency) => ({ ...adjacency })),
    openings: draft.openings.map((opening) => ({ ...opening })),
    assumptions: [...draft.assumptions]
  };
}

function reorderDraftRooms(
  draft: PlanDraft,
  orderedKinds: Array<PlanDraftRoom["type"] | "office">
): PlanDraft {
  const cloned = cloneDraft(draft);
  const originalIndex = new Map(
    cloned.rooms.map((room, index) => [room.id, index])
  );

  return {
    ...cloned,
    rooms: cloned.rooms.slice().sort((roomA, roomB) => {
      const priorityA = roomPriority(roomA, orderedKinds);
      const priorityB = roomPriority(roomB, orderedKinds);

      if (priorityA !== priorityB) return priorityA - priorityB;

      return (originalIndex.get(roomA.id) ?? 0) - (originalIndex.get(roomB.id) ?? 0);
    })
  };
}

function adjustDraftTargets(
  draft: PlanDraft,
  multipliers: Partial<Record<PlanDraftRoom["type"], number>>
): PlanDraft {
  return {
    ...draft,
    rooms: draft.rooms.map((room) => adjustRoomTarget(room, multipliers[room.type] ?? 1))
  };
}

function adjustOfficeDraft(draft: PlanDraft): PlanDraft {
  return {
    ...draft,
    rooms: draft.rooms.map((room) => {
      if (!isOfficeLikeRoom(room)) return room;

      return {
        ...adjustRoomTarget(room, 1.06),
        isExteriorPreferred: true
      };
    })
  };
}

function adjustRoomTarget(room: PlanDraftRoom, multiplier: number): PlanDraftRoom {
  if (multiplier === 1) return room;

  if (room.targetArea !== undefined) {
    return {
      ...room,
      targetArea: roundArea(Math.max(room.targetArea * multiplier, 1))
    };
  }

  if (room.targetWidth !== undefined && room.targetHeight !== undefined) {
    const edgeMultiplier = Math.sqrt(multiplier);

    return {
      ...room,
      targetWidth: roundArea(room.targetWidth * edgeMultiplier),
      targetHeight: roundArea(room.targetHeight * edgeMultiplier)
    };
  }

  return room;
}

function roomPriority(
  room: PlanDraftRoom,
  orderedKinds: Array<PlanDraftRoom["type"] | "office">
) {
  const kind = isOfficeLikeRoom(room) ? "office" : room.type;
  const index = orderedKinds.indexOf(kind);

  return index === -1 ? orderedKinds.length : index;
}

function isOfficeLikeRoom(room: Pick<PlanDraftRoom, "id" | "name" | "type">) {
  return room.type === "other" && (
    room.id.includes("office") ||
    room.name.toLowerCase().includes("office")
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function roundArea(value: number) {
  return Number(value.toFixed(2));
}
