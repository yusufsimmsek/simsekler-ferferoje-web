import { describe, expect, it } from "vitest";
import {
  runGeneratePlanWorkflow,
  type GeneratePlanSuccessBody
} from "@/lib/ai-planner/generate-plan-workflow";
import type { AiPlannerProvider } from "@/lib/ai-planner/provider";
import type { PromptToPlanAiResponse } from "@/lib/schemas/ai-contracts.schema";

const preferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

describe("mock prompt-to-plan workflow", () => {
  it("maps 1+1 prompts to the 1+1 fixture", async () => {
    const result = await runGeneratePlanWorkflow(requestFor("Create a 1+1 apartment with an open kitchen."));
    const body = expectSuccess(result.body);

    expect(result.status).toBe(200);
    expect(body.plan.id).toBe("plan_simple_1plus1");
    expect(body.meta.promptClassification).toBe("1plus1");
    expect(body.plan.rooms).toHaveLength(5);
  });

  it("maps 2+1 prompts to the 2+1 fixture", async () => {
    const result = await runGeneratePlanWorkflow(requestFor("Design a 2+1 apartment with two bedrooms and a WC."));
    const body = expectSuccess(result.body);

    expect(result.status).toBe(200);
    expect(body.plan.id).toBe("plan_2plus1");
    expect(body.meta.promptClassification).toBe("2plus1");
    expect(body.plan.rooms).toHaveLength(8);
  });

  it("maps 3+1 prompts to the 3+1 fixture", async () => {
    const result = await runGeneratePlanWorkflow(requestFor("Generate a 3+1 apartment with balcony and open kitchen."));
    const body = expectSuccess(result.body);

    expect(result.status).toBe(200);
    expect(body.plan.id).toBe("plan_3plus1");
    expect(body.meta.promptClassification).toBe("3plus1");
    expect(body.plan.rooms).toHaveLength(10);
    expect(body.validation.status).toBe("valid");
    expect(body.meta.layoutMode).toBe("layout-engine-v1");
    expect(body.plan.layout.engine).toBe("rectangular-grid-v1");
  });

  it("uses the generic apartment fallback for unknown residential prompts", async () => {
    const result = await runGeneratePlanWorkflow(requestFor("Create a compact family apartment with bright rooms."));
    const body = expectSuccess(result.body);

    expect(result.status).toBe(200);
    expect(body.plan.id).toBe("plan_2plus1");
    expect(body.meta.promptClassification).toBe("fallback_generic");
    expect(body.warnings).toContain("Mock provider used the generic apartment fallback fixture.");
  });

  it("rejects empty prompts at the request boundary", async () => {
    const result = await runGeneratePlanWorkflow(requestFor("   "));

    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("INVALID_GENERATE_REQUEST");
      expect(result.body.issues.some((issue) => issue.path?.includes("prompt"))).toBe(true);
    }
  });

  it("protects the pipeline from invalid mock provider responses", async () => {
    const invalidProvider: AiPlannerProvider = {
      async generatePlan() {
        return {
          schemaVersion: "plan-generation-response-v1",
          status: "ok",
          planDraft: {
            title: "Invalid AI Draft",
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
            assumptions: ["This draft should fail because AI output cannot include coordinates."]
          },
          clarificationRequest: null,
          warnings: []
        } as unknown as PromptToPlanAiResponse;
      },
      async editPlan() {
        return {
          schemaVersion: "chat-edit-response-v1",
          status: "needs_clarification",
          actions: [],
          requiresRelayout: false,
          clarificationRequest: "No edit was requested.",
          userFacingSummary: "No edit was requested."
        };
      }
    };

    const result = await runGeneratePlanWorkflow(requestFor("Create a 1+1 apartment."), {
      provider: invalidProvider
    });

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_SCHEMA_MISMATCH");
      expect(result.body.issues.some((issue) => issue.message.includes("Unrecognized key"))).toBe(true);
      expect("plan" in result.body).toBe(false);
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

function expectSuccess(body: Awaited<ReturnType<typeof runGeneratePlanWorkflow>>["body"]) {
  expect(body.ok).toBe(true);

  if (!body.ok) {
    throw new Error(`Expected success response, received ${body.code}.`);
  }

  return body as GeneratePlanSuccessBody;
}
