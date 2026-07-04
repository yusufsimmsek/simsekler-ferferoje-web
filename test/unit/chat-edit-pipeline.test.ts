import { describe, expect, it } from "vitest";
import {
  runEditPlanWorkflow,
  type EditPlanSuccessBody
} from "@/lib/ai-planner/edit-plan-workflow";
import { mockAiPlannerProvider } from "@/lib/ai-planner/mock-provider";
import type { AiPlannerProvider } from "@/lib/ai-planner/provider";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";
import { twoPlusOneFixture } from "@/lib/floor-plan/fixtures";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import type { OptimizeFloorPlanLayoutResult } from "@/lib/planning";

describe("deterministic chat edit workflow", () => {
  it("enlarges the living room", async () => {
    const originalArea = roomArea(mockFloorPlan, "room_living");
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Make the living room larger.")
    );
    const body = expectEditSuccess(result.body);

    expect(result.status).toBe(200);
    expect(body.actions[0]?.type).toBe("resize_room");
    expect(roomArea(body.plan, "room_living")).toBeGreaterThan(originalArea);
    expect(validateFloorPlan(body.plan).ok).toBe(true);
    expect(body.meta.optimization?.candidateCount).toBeGreaterThanOrEqual(5);
    expect(body.meta.selectedCandidate.id).not.toBe("direct_fallback");
    expect(body.meta.qualityBefore.schemaVersion).toBe("layout-quality-report-v1");
    expect(body.meta.qualityAfter.schemaVersion).toBe("layout-quality-report-v1");
    expect(body.meta.qualityDelta.schemaVersion).toBe("edit-quality-delta-v1");
    expect(body.userFacingSummary).toContain("Quality");
  });

  it("shrinks the living room", async () => {
    const originalArea = roomArea(mockFloorPlan, "room_living");
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Shrink the living room.")
    );
    const body = expectEditSuccess(result.body);

    expect(body.actions[0]?.type).toBe("resize_room");
    expect(roomArea(body.plan, "room_living")).toBeLessThan(originalArea);
    expect(validateFloorPlan(body.plan).ok).toBe(true);
  });

  it("enlarges the kitchen", async () => {
    const originalArea = roomArea(mockFloorPlan, "room_kitchen");
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Enlarge the kitchen.")
    );
    const body = expectEditSuccess(result.body);

    expect(body.actions[0]?.type).toBe("resize_room");
    expect(roomArea(body.plan, "room_kitchen")).toBeGreaterThan(originalArea);
  });

  it("uses deterministic edit handling for known local-provider commands", async () => {
    let providerCalled = false;
    const localProvider: AiPlannerProvider = {
      async generatePlan(request) {
        return mockAiPlannerProvider.generatePlan(request);
      },
      async editPlan() {
        providerCalled = true;
        throw new Error("Local provider should not be called for known MVP edit commands.");
      }
    };
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Make the kitchen larger."),
      {
        provider: localProvider,
        providerName: "ollama",
        providerMode: "ollama",
        model: "test-local-model"
      }
    );
    const body = expectEditSuccess(result.body);

    expect(providerCalled).toBe(false);
    expect(result.status).toBe(200);
    expect(body.provider).toBe("ollama");
    expect(body.actions[0]?.type).toBe("resize_room");
    expect(roomArea(body.plan, "room_kitchen")).toBeGreaterThan(
      roomArea(mockFloorPlan, "room_kitchen")
    );
  });

  it("adds a bathroom", async () => {
    const originalBathroomCount = mockFloorPlan.rooms.filter(
      (room) => room.type === "bathroom"
    ).length;
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Add a bathroom.")
    );
    const body = expectEditSuccess(result.body);

    expect(body.actions[0]?.type).toBe("add_room");
    expect(body.plan.rooms.filter((room) => room.type === "bathroom")).toHaveLength(
      originalBathroomCount + 1
    );
    expect(validateFloorPlan(body.plan).ok).toBe(true);
  });

  it("adds a balcony", async () => {
    const result = await runEditPlanWorkflow(
      requestFor(twoPlusOneFixture, "Add a balcony next to the living room.")
    );
    const body = expectEditSuccess(result.body);

    expect(body.actions[0]?.type).toBe("add_room");
    expect(body.plan.rooms.some((room) => room.type === "balcony")).toBe(true);
    expect(validateFloorPlan(body.plan).ok).toBe(true);
  });

  it("removes a balcony", async () => {
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Remove the balcony.")
    );
    const body = expectEditSuccess(result.body);

    expect(body.actions[0]?.type).toBe("remove_room");
    expect(body.plan.rooms.some((room) => room.type === "balcony")).toBe(false);
    expect(validateFloorPlan(body.plan).ok).toBe(true);
  });

  it("renames a room", async () => {
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Rename Bedroom 3 to Office.")
    );
    const body = expectEditSuccess(result.body);

    expect(body.actions[0]?.type).toBe("rename_room");
    expect(body.plan.rooms.some((room) => room.name === "Office")).toBe(true);
  });

  it("returns an unsupported response for commands outside the mock edit set", async () => {
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Make this a 3D BIM model.")
    );

    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("EDIT_UNSUPPORTED_COMMAND");
      expect("plan" in result.body).toBe(false);
    }
  });

  it("keeps the original plan unchanged when an edit action targets a missing room", async () => {
    const originalSnapshot = JSON.stringify(mockFloorPlan);
    const invalidProvider: AiPlannerProvider = {
      async generatePlan(request) {
        return mockAiPlannerProvider.generatePlan(request);
      },
      async editPlan() {
        return {
          schemaVersion: "chat-edit-response-v1",
          status: "ok",
          actions: [
            {
              id: "edit_missing_room",
              type: "resize_room",
              roomId: "room_missing",
              params: {
                targetArea: 20,
                lockAdjacentRooms: false
              },
              reason: "Invalid provider response for a missing room."
            }
          ],
          requiresRelayout: true,
          clarificationRequest: null,
          userFacingSummary: "Resize a missing room."
        };
      }
    };
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Resize the missing room."),
      { provider: invalidProvider }
    );

    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("EDIT_UNKNOWN_TARGET");
      expect("plan" in result.body).toBe(false);
    }

    expect(JSON.stringify(mockFloorPlan)).toBe(originalSnapshot);
  });

  it("falls back to direct deterministic relayout if optimizer cannot produce a valid candidate", async () => {
    const forcedFallbackOptimizer = (): OptimizeFloorPlanLayoutResult => ({
      ok: false,
      plan: null,
      quality: null,
      metadata: null,
      candidates: [],
      rejectedCandidates: [],
      issues: [
        {
          id: "issue_forced_optimizer_failure",
          severity: "critical",
          code: "FORCED_OPTIMIZER_FAILURE",
          message: "Forced optimizer failure for fallback coverage."
        }
      ],
      warnings: ["Forced optimizer failure."]
    });
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Enlarge the kitchen."),
      { layoutOptimizer: forcedFallbackOptimizer }
    );
    const body = expectEditSuccess(result.body);

    expect(body.meta.optimization).toBeNull();
    expect(body.meta.selectedCandidate.id).toBe("direct_fallback");
    expect(body.warnings).toContain(
      "Optimizer could not select a candidate, so direct deterministic relayout was used."
    );
    expect(validateFloorPlan(body.plan).ok).toBe(true);
  });

  it("validates the edited floor plan after applying actions", async () => {
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Add a bathroom.")
    );
    const body = expectEditSuccess(result.body);
    const validation = validateFloorPlan(body.plan);

    expect(body.validation.status).not.toBe("invalid");
    expect(validation.ok).toBe(true);
  });

  it("returns API metadata for quality before/after and quality deltas", async () => {
    const result = await runEditPlanWorkflow(
      requestFor(mockFloorPlan, "Add a bathroom.")
    );
    const body = expectEditSuccess(result.body);

    expect(body.meta.qualityBefore.overallScore).toBeGreaterThanOrEqual(0);
    expect(body.meta.qualityAfter.overallScore).toBeGreaterThanOrEqual(0);
    expect(body.meta.qualityDelta.beforeOverallScore).toBe(
      body.meta.qualityBefore.overallScore
    );
    expect(body.meta.qualityDelta.afterOverallScore).toBe(
      body.meta.qualityAfter.overallScore
    );
    expect(body.meta.qualityDelta.summary).toMatch(/quality/i);
    expect(body.meta.selectedCandidate.overallScore).toBe(
      body.meta.qualityAfter.overallScore
    );
  });
});

function requestFor(plan: typeof mockFloorPlan, message: string) {
  return {
    schemaVersion: "plan-edit-request-v1",
    message,
    currentPlan: plan
  };
}

function expectEditSuccess(
  body: Awaited<ReturnType<typeof runEditPlanWorkflow>>["body"]
) {
  expect(body.ok).toBe(true);

  if (!body.ok) {
    throw new Error(`Expected edit success response, received ${body.code}.`);
  }

  return body as EditPlanSuccessBody;
}

function roomArea(plan: typeof mockFloorPlan, roomId: string) {
  const room = plan.rooms.find((candidate) => candidate.id === roomId);

  if (!room) {
    throw new Error(`Missing room ${roomId}.`);
  }

  return room.area;
}
