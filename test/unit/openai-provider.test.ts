import { describe, expect, it } from "vitest";
import { selectAiPlannerProvider } from "@/lib/ai-planner/config";
import { OpenAiPlannerProvider, type OpenAiFetch } from "@/lib/ai-planner/openai-provider";
import { runEditPlanWorkflow } from "@/lib/ai-planner/edit-plan-workflow";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import {
  chatEditResponseSchema,
  promptToPlanAiResponseSchema
} from "@/lib/schemas/ai-contracts.schema";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";
import {
  planningSpecificationSchema,
  threePlusOnePlanningFixture
} from "@/lib/planning";

describe("AI provider selection", () => {
  it("defaults to mock mode", () => {
    const selection = selectAiPlannerProvider({});

    expect(selection.providerName).toBe("mock");
    expect(selection.mode).toBe("mock_default");
    expect(selection.model).toBeNull();
  });

  it("falls back to mock when OpenAI is requested without an API key", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: ""
    });

    expect(selection.providerName).toBe("mock");
    expect(selection.mode).toBe("mock_missing_key");
  });

  it("selects OpenAI only when requested and keyed", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test_key",
      OPENAI_MODEL: "test-model"
    });

    expect(selection.providerName).toBe("openai");
    expect(selection.mode).toBe("openai");
    expect(selection.model).toBe("test-model");
  });
});

describe("OpenAI planner provider", () => {
  it("constructs a structured-output plan generation request", async () => {
    const calls: Array<{ input: string; init: Parameters<OpenAiFetch>[1] }> = [];
    const provider = new OpenAiPlannerProvider({
      apiKey: "test_key",
      model: "test-model",
      fetcher: createMockOpenAiFetch(validPlanningSpecification(), calls)
    });

    const result = await provider.generatePlan({
      schemaVersion: "plan-generation-request-v1",
      prompt: "Create a 1+1 apartment.",
      preferences: {
        units: "m",
        maxRooms: 12,
        style: "simple-residential",
        rectangularRoomsOnly: true
      }
    });
    const body = JSON.parse(calls[0].init.body);

    expect(calls[0].input).toBe("https://api.openai.com/v1/chat/completions");
    expect(calls[0].init.headers.Authorization).toBe("Bearer test_key");
    expect(body.model).toBe("test-model");
    expect(body.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
        name: "floor_plan_planning_specification",
        strict: true
      }
    });
    expect(promptToPlanAiResponseSchema.safeParse(result).success).toBe(true);
  });

  it("rejects invalid OpenAI prompt output through the workflow validator", async () => {
    const provider = new OpenAiPlannerProvider({
      apiKey: "test_key",
      fetcher: createMockOpenAiFetch({
        schemaVersion: "planning-specification-v1",
        title: "Incomplete planning output"
      })
    });

    const result = await runGeneratePlanWorkflow(generateRequest(), {
      provider,
      providerName: "openai",
      providerMode: "openai",
      model: "test-model"
    });

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_SCHEMA_MISMATCH");
    }
  });

  it("parses valid OpenAI prompt-to-plan output and runs deterministic layout", async () => {
    const provider = new OpenAiPlannerProvider({
      apiKey: "test_key",
      fetcher: createMockOpenAiFetch(validPlanningSpecification())
    });

    const result = await runGeneratePlanWorkflow(generateRequest(), {
      provider,
      providerName: "openai",
      providerMode: "openai",
      model: "test-model"
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.provider).toBe("openai");
      expect(result.body.meta.mock).toBe(false);
      expect(result.body.plan.metadata.createdBy).toBe("ai");
      expect(result.body.plan.rooms[0].layout.width).toBeGreaterThan(0);
    }
  });

  it("parses a valid OpenAI PlanningSpecification before draft mapping", async () => {
    const provider = new OpenAiPlannerProvider({
      apiKey: "test_key",
      fetcher: createMockOpenAiFetch(validPlanningSpecification())
    });

    const specification = await provider.createPlanningSpecification(generateRequest());

    expect(planningSpecificationSchema.safeParse(specification).success).toBe(true);
    expect(specification.requestedRooms.bedrooms).toBe(3);
    expect(specification.requestedRooms.openKitchen).toBe(true);
  });

  it("parses valid OpenAI chat edit action output", async () => {
    const provider = new OpenAiPlannerProvider({
      apiKey: "test_key",
      fetcher: createMockOpenAiFetch(validChatEditResponse())
    });

    const result = await runEditPlanWorkflow(
      {
        schemaVersion: "plan-edit-request-v1",
        message: "Rename Bedroom 3 to Office.",
        currentPlan: mockFloorPlan
      },
      {
        provider,
        providerName: "openai",
        providerMode: "openai",
        model: "test-model"
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.provider).toBe("openai");
      expect(result.body.meta.mock).toBe(false);
      expect(result.body.plan.rooms.some((room) => room.name === "Office")).toBe(true);
      expect(chatEditResponseSchema.safeParse(result.body.ai).success).toBe(true);
    }
  });
});

function createMockOpenAiFetch(
  structuredContent: unknown,
  calls: Array<{ input: string; init: Parameters<OpenAiFetch>[1] }> = []
): OpenAiFetch {
  return async (input, init) => {
    calls.push({ input, init });

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(structuredContent)
              }
            }
          ]
        })
    };
  };
}

function generateRequest() {
  return {
    schemaVersion: "plan-generation-request-v1",
    prompt: "Create a compact 1+1 apartment.",
    preferences: {
      units: "m",
      maxRooms: 12,
      style: "simple-residential",
      rectangularRoomsOnly: true
    }
  } as const;
}

function validPlanningSpecification() {
  return structuredClone(threePlusOnePlanningFixture);
}

function validChatEditResponse() {
  return {
    schemaVersion: "chat-edit-response-v1",
    status: "ok",
    actions: [
      {
        id: "edit_rename_bedroom_3",
        type: "rename_room",
        roomId: "room_bedroom_3",
        params: {
          name: "Office"
        },
        reason: "User asked to rename Bedroom 3 to Office."
      }
    ],
    requiresRelayout: false,
    clarificationRequest: null,
    userFacingSummary: "Bedroom 3 was renamed to Office."
  };
}
