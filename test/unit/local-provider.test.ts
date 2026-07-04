import { describe, expect, it } from "vitest";
import { selectAiPlannerProvider } from "@/lib/ai-planner/config";
import {
  defaultLocalOpenAiCompatibleBaseUrl,
  defaultOllamaBaseUrl,
  OllamaPlannerProvider,
  OpenAiCompatibleLocalPlannerProvider,
  type LocalLlmFetch
} from "@/lib/ai-planner/local-provider";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import { runEditPlanWorkflow } from "@/lib/ai-planner/edit-plan-workflow";
import {
  chatEditResponseSchema,
  promptToPlanAiResponseSchema
} from "@/lib/schemas/ai-contracts.schema";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";
import {
  planningSpecificationSchema,
  threePlusOnePlanningFixture
} from "@/lib/planning";

describe("local LLM provider selection", () => {
  it("keeps mock as the default mode", () => {
    const selection = selectAiPlannerProvider({});

    expect(selection.providerName).toBe("mock");
    expect(selection.mode).toBe("mock_default");
    expect(selection.model).toBeNull();
  });

  it("selects Ollama without requiring an OpenAI key", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "ollama",
      LOCAL_LLM_MODEL: "qwen2.5:7b",
      LOCAL_LLM_TIMEOUT_MS: "45000"
    });

    expect(selection.providerName).toBe("ollama");
    expect(selection.mode).toBe("ollama");
    expect(selection.model).toBe("qwen2.5:7b");
    expect(selection.validation.localBaseUrl).toBe(defaultOllamaBaseUrl);
    expect(selection.validation.localTimeoutMs).toBe(45000);
    expect(
      selection.validation.issues.some((issue) => issue.code === "OPENAI_KEY_MISSING")
    ).toBe(false);
  });

  it("selects LM Studio with an OpenAI-compatible local base URL", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "lmstudio",
      LOCAL_LLM_BASE_URL: "http://localhost:1234/v1",
      LOCAL_LLM_MODEL: "loaded-model"
    });

    expect(selection.providerName).toBe("lmstudio");
    expect(selection.mode).toBe("lmstudio");
    expect(selection.model).toBe("loaded-model");
    expect(selection.validation.localBaseUrl).toBe("http://localhost:1234/v1");
  });

  it("selects generic OpenAI-compatible local mode", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "openai-compatible-local",
      LOCAL_LLM_MODEL: "local-model"
    });

    expect(selection.providerName).toBe("openai-compatible-local");
    expect(selection.mode).toBe("openai_compatible_local");
    expect(selection.validation.localBaseUrl).toBe(defaultLocalOpenAiCompatibleBaseUrl);
  });

  it("keeps OpenAI optional and falls back to mock without a key", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: ""
    });

    expect(selection.providerName).toBe("mock");
    expect(selection.mode).toBe("mock_missing_key");
  });
});

describe("Ollama planner provider", () => {
  it("constructs a schema-constrained Ollama generate request", async () => {
    const calls: Array<{ input: string; init: Parameters<LocalLlmFetch>[1] }> = [];
    const provider = new OllamaPlannerProvider({
      baseUrl: "http://localhost:11434",
      model: "llama3.1:8b",
      fetcher: createMockOllamaFetch(validPlanningSpecification(), calls)
    });

    const result = await provider.generatePlan(generateRequest());
    const body = JSON.parse(calls[0].init.body);

    expect(calls[0].input).toBe("http://localhost:11434/api/generate");
    expect(body.model).toBe("llama3.1:8b");
    expect(body.stream).toBe(false);
    expect(body.options.temperature).toBe(0);
    expect(body.format).toMatchObject({
      type: "object",
      properties: {
        schemaVersion: { type: "string", enum: ["planning-specification-v1"] }
      }
    });
    expect(promptToPlanAiResponseSchema.safeParse(result).success).toBe(true);
  });

  it("rejects invalid local model output through workflow validation", async () => {
    const provider = new OllamaPlannerProvider({
      baseUrl: "http://localhost:11434",
      model: "llama3.1:8b",
      fetcher: createMockOllamaFetch({
        schemaVersion: "planning-specification-v1",
        title: "Incomplete local output"
      })
    });

    const result = await runGeneratePlanWorkflow(generateRequest(), {
      provider,
      providerName: "ollama",
      providerMode: "ollama",
      model: "llama3.1:8b"
    });

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_SCHEMA_MISMATCH");
      expect(result.body.provider).toBe("ollama");
    }
  });

  it("returns a structured provider error when the local server is missing", async () => {
    const provider = new OllamaPlannerProvider({
      baseUrl: "http://localhost:11434",
      model: "llama3.1:8b",
      fetcher: async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
      }
    });

    const result = await runGeneratePlanWorkflow(generateRequest(), {
      provider,
      providerName: "ollama",
      providerMode: "ollama",
      model: "llama3.1:8b"
    });

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_PROVIDER_FAILED");
      expect(result.body.developerMessage).toContain("Ollama request failed");
    }
  });
});

describe("OpenAI-compatible local planner provider", () => {
  it("constructs an LM Studio structured-output chat request", async () => {
    const calls: Array<{ input: string; init: Parameters<LocalLlmFetch>[1] }> = [];
    const provider = new OpenAiCompatibleLocalPlannerProvider({
      baseUrl: "http://localhost:1234/v1/",
      model: "loaded-model",
      providerLabel: "LM Studio",
      fetcher: createMockOpenAiCompatibleFetch(validPlanningSpecification(), calls)
    });

    const specification = await provider.createPlanningSpecification(generateRequest());
    const body = JSON.parse(calls[0].init.body);

    expect(calls[0].input).toBe("http://localhost:1234/v1/chat/completions");
    expect(body.model).toBe("loaded-model");
    expect(body.stream).toBe(false);
    expect(body.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
        name: "floor_plan_planning_specification",
        strict: true
      }
    });
    expect(planningSpecificationSchema.safeParse(specification).success).toBe(true);
  });

  it("parses valid local chat edit structured output", async () => {
    const provider = new OpenAiCompatibleLocalPlannerProvider({
      baseUrl: "http://localhost:1234/v1",
      model: "loaded-model",
      providerLabel: "LM Studio",
      fetcher: createMockOpenAiCompatibleFetch(validChatEditResponse())
    });

    const result = await runEditPlanWorkflow(
      {
        schemaVersion: "plan-edit-request-v1",
        message: "Rename Bedroom 3 to Office.",
        currentPlan: mockFloorPlan
      },
      {
        provider,
        providerName: "lmstudio",
        providerMode: "lmstudio",
        model: "loaded-model"
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.provider).toBe("lmstudio");
      expect(result.body.meta.mock).toBe(false);
      expect(result.body.plan.metadata.createdBy).toBe("ai");
      expect(chatEditResponseSchema.safeParse(result.body.ai).success).toBe(true);
    }
  });
});

function createMockOllamaFetch(
  structuredContent: unknown,
  calls: Array<{ input: string; init: Parameters<LocalLlmFetch>[1] }> = []
): LocalLlmFetch {
  return async (input, init) => {
    calls.push({ input, init });

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          model: "test-model",
          response: JSON.stringify(structuredContent),
          done: true
        })
    };
  };
}

function createMockOpenAiCompatibleFetch(
  structuredContent: unknown,
  calls: Array<{ input: string; init: Parameters<LocalLlmFetch>[1] }> = []
): LocalLlmFetch {
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
