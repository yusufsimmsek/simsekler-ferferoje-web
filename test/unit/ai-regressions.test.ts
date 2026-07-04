import { describe, expect, it } from "vitest";
import { selectAiPlannerProvider } from "@/lib/ai-planner/config";
import { runEditPlanWorkflow } from "@/lib/ai-planner/edit-plan-workflow";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import type { AiPlannerProvider } from "@/lib/ai-planner/provider";
import {
  chatEditResponseSchema,
  promptToPlanAiResponseSchema
} from "@/lib/schemas/ai-contracts.schema";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";

const preferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

describe("AI pipeline regression coverage", () => {
  it("returns a structured unsupported result for CAD/BIM prompt outputs", async () => {
    const result = await runGeneratePlanWorkflow(
      requestFor("Create a construction-ready BIM model with CAD permit compliance.")
    );

    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_UNSUPPORTED_REQUEST");
      expect(result.body.validation.status).toBe("invalid");
    }
  });

  it("rejects invalid structured prompt output", async () => {
    const invalidProvider: AiPlannerProvider = {
      async generatePlan() {
        return {
          schemaVersion: "plan-generation-response-v1",
          status: "ok",
          planDraft: null,
          clarificationRequest: null,
          warnings: []
        };
      },
      async editPlan() {
        throw new Error("Not used.");
      }
    };
    const result = await runGeneratePlanWorkflow(requestFor("Create a 1+1 apartment."), {
      provider: invalidProvider
    });

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_SCHEMA_MISMATCH");
    }
  });

  it("rejects missing required fields at the schema layer", () => {
    const parsed = promptToPlanAiResponseSchema.safeParse({
      schemaVersion: "plan-generation-response-v1",
      status: "ok",
      clarificationRequest: null,
      warnings: []
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid edit actions before applying them", async () => {
    const invalidProvider: AiPlannerProvider = {
      async generatePlan() {
        throw new Error("Not used.");
      },
      async editPlan() {
        return {
          schemaVersion: "chat-edit-response-v1",
          status: "ok",
          actions: [
            {
              id: "edit_unknown_action",
              type: "teleport_room",
              roomId: "room_living",
              params: {},
              reason: "Invalid action type."
            }
          ],
          requiresRelayout: true,
          clarificationRequest: null,
          userFacingSummary: "Teleport the living room."
        } as never;
      }
    };
    const before = JSON.stringify(mockFloorPlan);
    const result = await runEditPlanWorkflow(
      {
        schemaVersion: "plan-edit-request-v1",
        message: "Teleport the living room.",
        currentPlan: mockFloorPlan
      },
      {
        provider: invalidProvider
      }
    );

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("EDIT_SCHEMA_MISMATCH");
    }

    expect(JSON.stringify(mockFloorPlan)).toBe(before);
  });

  it("rejects missing required chat edit fields at the schema layer", () => {
    const parsed = chatEditResponseSchema.safeParse({
      schemaVersion: "chat-edit-response-v1",
      status: "ok",
      actions: [],
      clarificationRequest: null,
      userFacingSummary: "Missing requiresRelayout."
    });

    expect(parsed.success).toBe(false);
  });

  it("falls back to mock provider when OpenAI is requested without a key", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-test"
    });

    expect(selection.providerName).toBe("mock");
    expect(selection.mode).toBe("mock_missing_key");
    expect(selection.model).toBeNull();
  });
});

function requestFor(prompt: string) {
  return {
    schemaVersion: "plan-generation-request-v1",
    prompt,
    preferences
  };
}
