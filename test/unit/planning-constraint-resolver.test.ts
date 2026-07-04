import { describe, expect, it } from "vitest";
import {
  createPlanningFixture,
  daylightPriorityConstraintFixture,
  feasibleFamilyConstraintFixture,
  mapResolvedPlanningSpecificationToPlanDraft,
  officeHeavyConstraintFixture,
  openKitchenFamilyConstraintFixture,
  planningConstraintFixtures,
  privacyPriorityConstraintFixture,
  resolvePlanningConstraints,
  resolvedPlanningSpecificationSchema,
  tinyHouseTooManyRoomsConstraintFixture
} from "@/lib/planning";
import {
  runPlanningConstraintEvaluationFixtures
} from "@/lib/ai-planner/evaluation";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import { planDraftSchema } from "@/lib/schemas/ai-contracts.schema";

const preferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

describe("planning constraint resolver", () => {
  it("creates a schema-valid deterministic resolved planning specification", () => {
    const first = expectResolved(
      resolvePlanningConstraints(feasibleFamilyConstraintFixture)
    );
    const second = expectResolved(
      resolvePlanningConstraints(feasibleFamilyConstraintFixture)
    );

    expect(resolvedPlanningSpecificationSchema.safeParse(first).success).toBe(
      true
    );
    expect(second).toEqual(first);
    expect(first.metadata.deterministic).toBe(true);
  });

  it("builds the kitchen/living and balcony/living relationship graph", () => {
    const resolved = expectResolved(
      resolvePlanningConstraints(openKitchenFamilyConstraintFixture)
    );

    expect(
      resolved.relationshipGraph.edges.some(
        (edge) =>
          edge.fromRoomId === "room_living" &&
          edge.toRoomId === "room_kitchen" &&
          edge.relationship === "connected" &&
          edge.priority === "required"
      )
    ).toBe(true);
    expect(
      resolved.relationshipGraph.edges.some(
        (edge) =>
          edge.fromRoomId === "room_living" &&
          edge.toRoomId === "room_balcony_1" &&
          edge.relationship === "connected"
      )
    ).toBe(true);
  });

  it("places bedrooms in a private zone and applies privacy separation", () => {
    const resolved = expectResolved(
      resolvePlanningConstraints(privacyPriorityConstraintFixture)
    );
    const bedroomNodes = resolved.relationshipGraph.nodes.filter(
      (node) => node.roomType === "bedroom"
    );

    expect(bedroomNodes.length).toBeGreaterThan(0);
    expect(bedroomNodes.every((node) => node.zone === "private")).toBe(true);
    expect(bedroomNodes.every((node) => node.quietPriority === "high")).toBe(
      true
    );
    expect(
      resolved.relationshipGraph.edges.some(
        (edge) =>
          edge.ruleId === "rule_privacy_priority" &&
          edge.priority === "avoid"
      )
    ).toBe(true);
  });

  it("marks office intent as quiet and daylight-accessible", () => {
    const resolved = expectResolved(
      resolvePlanningConstraints(daylightPriorityConstraintFixture)
    );
    const officeNode = resolved.relationshipGraph.nodes.find(
      (node) => node.roomId === "room_office"
    );

    expect(officeNode).toMatchObject({
      zone: "private",
      quietPriority: "high",
      daylightPriority: "required"
    });
    expect(
      resolved.relationshipGraph.edges.some(
        (edge) =>
          edge.ruleId === "rule_office_quiet_daylight" &&
          edge.priority === "avoid"
      )
    ).toBe(true);
  });

  it("detects area conflicts and generates deterministic compromises", () => {
    const resolved = expectResolved(
      resolvePlanningConstraints(tinyHouseTooManyRoomsConstraintFixture)
    );

    expect(
      resolved.conflicts.map((conflict) => conflict.code)
    ).toContain("room_program_exceeds_area");
    expect(
      resolved.compromises.map((compromise) => compromise.code)
    ).toContain("reduce_balcony_count");
    expect(resolved.resolvedRoomProgram.rooms.length).toBeLessThanOrEqual(12);
    expect(resolved.feasibility.rating).toBe("low");
  });

  it("detects open-kitchen versus fully-separate-kitchen conflict", () => {
    const specification = createPlanningFixture({
      requestedRooms: {
        openKitchen: true
      },
      mustHaveConstraints: ["Kitchen must be fully separate."]
    });
    const resolved = expectResolved(resolvePlanningConstraints(specification));

    expect(
      resolved.conflicts.map((conflict) => conflict.code)
    ).toContain("open_and_separate_kitchen");
    expect(
      resolved.unresolvedItems.some(
        (item) => item.code === "kitchen_configuration_conflict"
      )
    ).toBe(true);
  });

  it("scores office-heavy programs explainably", () => {
    const resolved = expectResolved(
      resolvePlanningConstraints(officeHeavyConstraintFixture)
    );

    expect(
      resolved.conflicts.map((conflict) => conflict.code)
    ).toContain("office_heavy_program_insufficient_area");
    expect(resolved.feasibility.overallScore).toBeGreaterThanOrEqual(0);
    expect(resolved.feasibility.overallScore).toBeLessThanOrEqual(100);
    expect(
      resolved.feasibility.breakdown.area.rationale[0].toLowerCase()
    ).toContain("usable");
  });

  it("maps resolved planning to a valid semantic draft without coordinates", () => {
    const resolved = expectResolved(
      resolvePlanningConstraints(openKitchenFamilyConstraintFixture)
    );
    const mapping = mapResolvedPlanningSpecificationToPlanDraft(resolved);

    expect(mapping.ok).toBe(true);

    if (mapping.ok) {
      expect(planDraftSchema.safeParse(mapping.draft).success).toBe(true);
      expect(
        mapping.draft.rooms.every((room) => !("layout" in room))
      ).toBe(true);
      expect(
        mapping.draft.adjacencies.some(
          (edge) =>
            edge.roomAId === "room_living" &&
            edge.roomBId === "room_kitchen"
        )
      ).toBe(true);
    }
  });

  it("returns clarification before layout for a low-feasibility prompt", async () => {
    const result = await runGeneratePlanWorkflow(
      requestFor(
        "Create a 35 sqm tiny house with 4 bedrooms, 2 bathrooms, 2 balconies, home office, storage, laundry, and guest room."
      )
    );

    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_NEEDS_CLARIFICATION");
      expect(result.body.planning?.feasibilityRating).toBe("low");
      expect(result.body.planning?.clarificationRecommendations.length).toBeGreaterThan(
        0
      );
      expect("plan" in result.body).toBe(false);
    }
  });

  it("adds planning metadata to successful generation responses", async () => {
    const result = await runGeneratePlanWorkflow(
      requestFor(
        "Create a 3+1 family apartment with open kitchen and balcony."
      )
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.meta.planning.schemaVersion).toBe(
        "resolved-planning-specification-v1"
      );
      expect(result.body.meta.planning.confidence).toBeGreaterThan(0);
      expect(result.body.meta.planning.feasibilityScore).toBeGreaterThan(0);
    }
  });

  it("runs all required constraint evaluation fixtures deterministically", () => {
    const results = runPlanningConstraintEvaluationFixtures();

    expect(planningConstraintFixtures).toHaveLength(10);
    expect(results).toHaveLength(10);
    expect(results.every((result) => result.passed)).toBe(true);
  });
});

function expectResolved(
  result: ReturnType<typeof resolvePlanningConstraints>
) {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.issues.join(" "));
  }

  return result.data;
}

function requestFor(prompt: string) {
  return {
    schemaVersion: "plan-generation-request-v1",
    prompt,
    preferences
  };
}
