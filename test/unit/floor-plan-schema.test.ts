import { describe, expect, it } from "vitest";
import {
  chatEditResponseSchema,
  promptToPlanAiResponseSchema
} from "@/lib/schemas/ai-contracts.schema";
import { exportRequestSchema } from "@/lib/schemas/export.schema";
import { floorPlanSchema } from "@/lib/schemas/floor-plan.schema";
import {
  simpleOnePlusOneFixture,
  threePlusOneFixture,
  twoPlusOneFixture,
  validFloorPlanFixtures
} from "@/lib/floor-plan/fixtures";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import {
  invalidAdjacencyReferenceFixture,
  invalidDoorReferenceFixture,
  invalidRoomAreaFixture,
  invalidWindowPlacementFixture
} from "../fixtures/invalid-floor-plans";

describe("floor plan schema", () => {
  it("parses valid MVP floor plan fixtures", () => {
    for (const fixture of validFloorPlanFixtures) {
      expect(floorPlanSchema.safeParse(fixture).success).toBe(true);
    }

    expect(floorPlanSchema.parse(simpleOnePlusOneFixture).rooms).toHaveLength(5);
    expect(floorPlanSchema.parse(twoPlusOneFixture).rooms).toHaveLength(8);
    expect(floorPlanSchema.parse(threePlusOneFixture).rooms).toHaveLength(10);
  });

  it("rejects invalid room areas", () => {
    const result = floorPlanSchema.safeParse(invalidRoomAreaFixture);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes("area"))).toBe(true);
  });

  it("rejects invalid adjacency references", () => {
    const result = floorPlanSchema.safeParse(invalidAdjacencyReferenceFixture);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) =>
        issue.message.includes("Adjacency references missing room")
      )
    ).toBe(true);
  });

  it("rejects invalid door references", () => {
    const result = floorPlanSchema.safeParse(invalidDoorReferenceFixture);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.message.includes("Door references missing"))
    ).toBe(true);
  });

  it("rejects invalid window placement", () => {
    const result = floorPlanSchema.safeParse(invalidWindowPlacementFixture);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.message.includes("Windows must be placed"))
    ).toBe(true);
  });

  it("returns developer-readable validation helper issues", () => {
    const result = validateFloorPlan(invalidRoomAreaFixture);

    expect(result.ok).toBe(false);
    expect(result.summary.status).toBe("invalid");
    expect(result.summary.issues[0]).toMatchObject({
      severity: "critical"
    });
  });
});

describe("edit action and AI response contracts", () => {
  it("validates prompt-to-plan AI responses", () => {
    const result = promptToPlanAiResponseSchema.safeParse({
      schemaVersion: "plan-generation-response-v1",
      status: "ok",
      planDraft: {
        title: "Simple 1+1 Apartment",
        units: "m",
        rooms: [
          {
            id: "room_living",
            name: "Living Room",
            type: "living",
            targetArea: 16,
            isWetArea: false,
            isExteriorPreferred: true
          }
        ],
        adjacencies: [],
        openings: [],
        assumptions: ["All dimensions are approximate."]
      },
      clarificationRequest: null,
      warnings: []
    });

    expect(result.success).toBe(true);
  });

  it("rejects AI plan drafts that include layout coordinates", () => {
    const result = promptToPlanAiResponseSchema.safeParse({
      schemaVersion: "plan-generation-response-v1",
      status: "ok",
      planDraft: {
        title: "Invalid Draft",
        units: "m",
        rooms: [
          {
            id: "room_living",
            name: "Living Room",
            type: "living",
            targetArea: 16,
            isWetArea: false,
            isExteriorPreferred: true,
            layout: { x: 0, y: 0, width: 4, height: 4 }
          }
        ],
        adjacencies: [],
        openings: [],
        assumptions: ["Should fail because AI drafts cannot include coordinates."]
      },
      clarificationRequest: null,
      warnings: []
    });

    expect(result.success).toBe(false);
  });

  it("validates chat edit actions", () => {
    const result = chatEditResponseSchema.safeParse({
      schemaVersion: "chat-edit-response-v1",
      status: "ok",
      actions: [
        {
          id: "edit_001",
          type: "rename_room",
          roomId: "room_bedroom_1",
          params: {
            name: "Office"
          },
          reason: "User asked to rename Bedroom 1."
        }
      ],
      requiresRelayout: false,
      clarificationRequest: null,
      userFacingSummary: "Bedroom 1 will be renamed to Office."
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid edit actions", () => {
    const result = chatEditResponseSchema.safeParse({
      schemaVersion: "chat-edit-response-v1",
      status: "ok",
      actions: [
        {
          id: "edit_001",
          type: "teleport_room",
          roomId: "room_living",
          params: {},
          reason: "Unsupported action."
        }
      ],
      requiresRelayout: true,
      clarificationRequest: null,
      userFacingSummary: "Invalid action."
    });

    expect(result.success).toBe(false);
  });
});

describe("export request contracts", () => {
  it("validates PNG and PDF export requests", () => {
    expect(
      exportRequestSchema.safeParse({
        schemaVersion: "export-request-v1",
        format: "png",
        plan: simpleOnePlusOneFixture,
        settings: {
          includeRoomLabels: true,
          includeDimensions: true,
          includeDisclaimer: true,
          resolution: "standard"
        }
      }).success
    ).toBe(true);

    expect(
      exportRequestSchema.safeParse({
        schemaVersion: "export-request-v1",
        format: "pdf",
        plan: simpleOnePlusOneFixture,
        settings: {
          includeRoomLabels: true,
          includeDimensions: true,
          includeDisclaimer: true,
          pageSize: "a4",
          orientation: "landscape",
          includeRoomSchedule: true,
          includeWarnings: true
        }
      }).success
    ).toBe(true);
  });
});
