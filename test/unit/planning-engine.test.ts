import { describe, expect, it } from "vitest";
import {
  mapPlanningSpecificationToPlanDraft,
  modernFamilyPlanningFixture,
  planningFixtures,
  planningSpecificationFromPrompt,
  planningSpecificationSchema,
  threePlusOnePlanningFixture,
  validatePlanningSpecification
} from "@/lib/planning";
import { planDraftSchema } from "@/lib/schemas/ai-contracts.schema";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import type { AiPlannerProvider } from "@/lib/ai-planner/provider";
import { mockAiPlannerProvider } from "@/lib/ai-planner/mock-provider";
import { validateFloorPlan } from "@/lib/floor-plan/validation";

const preferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

describe("PlanningSpecification schema", () => {
  it("accepts a complete valid planning specification", () => {
    const result = validatePlanningSpecification(modernFamilyPlanningFixture);

    expect(result.ok).toBe(true);
  });

  it("keeps every canonical planning fixture schema-valid", () => {
    expect(
      Object.values(planningFixtures).every(
        (fixture) => planningSpecificationSchema.safeParse(fixture).success
      )
    ).toBe(true);
  });

  it("rejects invalid target area and confidence values", () => {
    const result = planningSpecificationSchema.safeParse({
      ...threePlusOnePlanningFixture,
      targetArea: 10,
      confidenceScore: 1.5
    });

    expect(result.success).toBe(false);
  });

  it("requires multi-floor intent to be marked unsupported", () => {
    const result = planningSpecificationSchema.safeParse({
      ...threePlusOnePlanningFixture,
      floorCount: 2,
      unsupportedRequests: []
    });

    expect(result.success).toBe(false);
  });
});

describe("planning normalization", () => {
  it("normalizes 3+1 and rich English planning intent", () => {
    const specification = planningSpecificationFromPrompt(
      "Create a 3+1 modern apartment with open kitchen, two balconies, bright rooms, and a home office."
    );

    expect(specification.requestedRooms.bedrooms).toBe(3);
    expect(specification.requestedRooms.balconies).toBe(2);
    expect(specification.requestedRooms.openKitchen).toBe(true);
    expect(specification.requestedRooms.office).toBe(true);
    expect(specification.priorities.daylight).toBe("high");
    expect(specification.architecturalStyle).toBe("modern");
  });

  it("normalizes Turkish and English room synonyms", () => {
    const specification = planningSpecificationFromPrompt(
      "3 yatak odali acik mutfak, calisma odasi, balkon ve ebeveyn banyosu olan daire"
    );

    expect(specification.userLanguage).toBe("tr");
    expect(specification.requestedRooms.bedrooms).toBe(3);
    expect(specification.requestedRooms.openKitchen).toBe(true);
    expect(specification.requestedRooms.office).toBe(true);
    expect(specification.requestedRooms.balconies).toBe(1);
    expect(specification.requestedRooms.ensuite).toBe(true);
    expect(specification.requestedRooms.bathrooms).toBeGreaterThanOrEqual(2);
  });

  it.each([
    "I need a house.",
    "Make me a plan.",
    "Design something modern.",
    "I want a good layout."
  ])("produces clarification questions for vague prompt: %s", (prompt) => {
    const specification = planningSpecificationFromPrompt(prompt);

    expect(specification.clarificationQuestions.length).toBeGreaterThan(0);
    expect(specification.missingInformation.length).toBeGreaterThan(0);
    expect(specification.confidenceScore).toBeLessThanOrEqual(0.69);
  });

  it.each([
    "Create a BIM model.",
    "Generate structural calculations.",
    "Prepare construction drawings.",
    "Make a permit-ready plan.",
    "Create a 3D render.",
    "Design a hospital.",
    "Design a shopping mall."
  ])("detects unsupported prompt: %s", (prompt) => {
    const specification = planningSpecificationFromPrompt(prompt);

    expect(specification.unsupportedRequests.length).toBeGreaterThan(0);
  });
});

describe("planning-to-draft mapping", () => {
  it("maps requested rooms and relationships into a valid semantic draft", () => {
    const result = mapPlanningSpecificationToPlanDraft(modernFamilyPlanningFixture);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(planDraftSchema.safeParse(result.draft).success).toBe(true);
      expect(result.draft.rooms.some((room) => room.id === "room_office")).toBe(true);
      expect(result.draft.rooms.some((room) => room.type === "ensuite")).toBe(true);
      expect(result.draft.adjacencies.some((item) =>
        item.roomAId === "room_living" && item.roomBId === "room_kitchen"
      )).toBe(true);
      expect(result.draft.rooms.every((room) => !("layout" in room))).toBe(true);
    }
  });

  it("preserves planning warnings and assumptions without generating coordinates", () => {
    const specification = planningSpecificationFromPrompt(
      "Create a wheelchair accessible 2 bedroom apartment with daylight priority."
    );
    const result = mapPlanningSpecificationToPlanDraft(specification);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.warnings.some((warning) => warning.includes("Accessibility"))).toBe(true);
      expect(result.draft.assumptions.some((assumption) => assumption.includes("Final coordinates"))).toBe(true);
    }
  });
});

describe("planning generation workflow integration", () => {
  it("runs prompt through planning, semantic mapping, layout, and floor plan validation", async () => {
    const result = await runGeneratePlanWorkflow(
      requestFor("145 sqm modern apartment for a family of four with bright rooms.")
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.ai.planDraft).not.toBeNull();
      expect(result.body.plan.layout.engine).toBe("rectangular-grid-v1");
      expect(validateFloorPlan(result.body.plan).ok).toBe(true);
    }
  });

  it("rejects invalid planning provider output before semantic mapping", async () => {
    const invalidProvider: AiPlannerProvider = {
      async createPlanningSpecification() {
        return { schemaVersion: "planning-specification-v1" } as never;
      },
      async generatePlan(request) {
        return mockAiPlannerProvider.generatePlan(request);
      },
      async editPlan(request) {
        return mockAiPlannerProvider.editPlan(request);
      }
    };
    const result = await runGeneratePlanWorkflow(requestFor("Create a 2+1 apartment."), {
      provider: invalidProvider
    });

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_SCHEMA_MISMATCH");
    }
  });
});

function requestFor(prompt: string) {
  return {
    schemaVersion: "plan-generation-request-v1",
    prompt,
    preferences
  };
}
