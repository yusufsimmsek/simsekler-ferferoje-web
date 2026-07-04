import { describe, expect, it } from "vitest";
import {
  selectAiPlannerProvider,
  validateAiProviderEnv
} from "@/lib/ai-planner/config";
import { classifyMockPrompt } from "@/lib/ai-planner/mock-prompt-classifier";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import {
  generatedPlanStorageKey,
  loadGeneratedProject,
  type GeneratedProjectStore,
  type StorageLike
} from "@/lib/projects/generated-plan-storage";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";
import type { FloorPlan } from "@/lib/floor-plan/types";

const preferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

describe("MVP demo readiness hardening", () => {
  it("classifies major unsupported prompt categories", () => {
    expect(classifyMockPrompt("Create a BIM model in Revit.")).toMatchObject({
      kind: "unsupported",
      unsupportedReason: "cad_bim"
    });
    expect(classifyMockPrompt("Make a permit-ready legal compliance plan.")).toMatchObject({
      kind: "unsupported",
      unsupportedReason: "permit_legal_compliance"
    });
    expect(classifyMockPrompt("Calculate structural beams and load-bearing columns.")).toMatchObject({
      kind: "unsupported",
      unsupportedReason: "structural_engineering"
    });
    expect(classifyMockPrompt("Create a photorealistic 3D render.")).toMatchObject({
      kind: "unsupported",
      unsupportedReason: "three_dimensional_render"
    });
    expect(classifyMockPrompt("Design a duplex with a second floor.")).toMatchObject({
      kind: "unsupported",
      unsupportedReason: "multi_floor"
    });
    expect(classifyMockPrompt("Create a small office with workstations.")).toMatchObject({
      kind: "unsupported",
      unsupportedReason: "non_residential"
    });
    expect(classifyMockPrompt("Do interior design with furniture and decor.")).toMatchObject({
      kind: "unsupported",
      unsupportedReason: "interior_only"
    });
  });

  it("classifies ambiguous or impossible prompts as clarification requests", () => {
    const classification = classifyMockPrompt(
      "Make a perfect home for everyone with all rooms huge but the total area tiny."
    );

    expect(classification.kind).toBe("needs_clarification");

    if (classification.kind === "needs_clarification") {
      expect(classification.clarificationRequest).toContain("one-floor residential");
    }
  });

  it("returns a user-friendly unsupported generation error shape", async () => {
    const result = await runGeneratePlanWorkflow(
      requestFor("Create a construction-ready BIM and AutoCAD permit plan.")
    );

    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_UNSUPPORTED_REQUEST");
      expect(result.body.message).toContain("outside this MVP");
      expect(result.body.message).toContain("Try:");
      expect(result.body.retryable).toBe(false);
      expect(result.body.warnings[0]).toContain("Try:");
    }
  });

  it("blocks unsupported prompts before local or cloud provider execution", async () => {
    let providerCalled = false;
    const result = await runGeneratePlanWorkflow(
      requestFor("Create a BIM model."),
      {
        providerName: "ollama",
        providerMode: "ollama",
        model: "test-local-model",
        provider: {
          async generatePlan() {
            providerCalled = true;
            throw new Error("Provider should not be called for deterministic unsupported prompts.");
          },
          async editPlan() {
            throw new Error("Not used.");
          }
        }
      }
    );

    expect(providerCalled).toBe(false);
    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_UNSUPPORTED_REQUEST");
      expect(result.body.provider).toBe("ollama");
      expect(result.body.aiStatus).toBe("unsupported");
    }
  });

  it("returns clarification before provider execution for vague local prompts", async () => {
    let providerCalled = false;
    const result = await runGeneratePlanWorkflow(
      requestFor("Make me a plan"),
      {
        providerName: "ollama",
        providerMode: "ollama",
        model: "test-local-model",
        provider: {
          async generatePlan() {
            providerCalled = true;
            throw new Error("Provider should not be called for deterministic clarification prompts.");
          },
          async editPlan() {
            throw new Error("Not used.");
          }
        }
      }
    );

    expect(providerCalled).toBe(false);
    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.code).toBe("AI_NEEDS_CLARIFICATION");
      expect(result.body.provider).toBe("ollama");
      expect(result.body.aiStatus).toBe("needs_clarification");
      expect(result.body.message).toContain("How many bedrooms and bathrooms");
    }
  });

  it("validates environment config without crashing mock mode", () => {
    const validation = validateAiProviderEnv({
      AI_PROVIDER: "invalid",
      AI_OBSERVABILITY_LOGS: "sometimes"
    });

    expect(validation.requestedProvider).toBe("mock");
    expect(validation.effectiveProvider).toBe("mock");
    expect(validation.model).toBe("gpt-4.1-mini");
    expect(validation.observabilityLogs).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "INVALID_AI_PROVIDER",
      "INVALID_AI_OBSERVABILITY_LOGS",
      "OPENAI_MODEL_DEFAULTED"
    ]);
  });

  it("falls back to mock when OpenAI is requested without a key", () => {
    const selection = selectAiPlannerProvider({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-test",
      AI_OBSERVABILITY_LOGS: "false"
    });

    expect(selection.providerName).toBe("mock");
    expect(selection.mode).toBe("mock_missing_key");
    expect(selection.model).toBeNull();
    expect(selection.validation.issues.some((issue) => issue.code === "OPENAI_KEY_MISSING")).toBe(true);
  });

  it("recovers from corrupted localStorage with a demo fallback result", () => {
    const storage = createMemoryStorage();

    storage.setItem(generatedPlanStorageKey, "{not-valid-json");
    const result = loadGeneratedProject(storage, mockFloorPlan.projectId);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.fallback).toBe(true);
      expect(result.message).toContain("could not be read");
      expect(result.issues[0].code).toBe("PROJECT_STORE_CORRUPTED_JSON");
    }
  });

  it("falls back on localStorage schema version mismatch", () => {
    const storage = createMemoryStorage();

    storage.setItem(
      generatedPlanStorageKey,
      JSON.stringify({
        version: 99,
        projects: {},
        lastProjectId: null
      })
    );
    const result = loadGeneratedProject(storage, mockFloorPlan.projectId);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.message).toContain("unsupported schema version");
      expect(result.issues[0].code).toBe("PROJECT_STORE_SCHEMA_VERSION_MISMATCH");
    }
  });

  it("falls back on stored floor plan schema mismatch while preserving valid projects", () => {
    const storage = createMemoryStorage();
    const validProject = storedProject("valid_project", mockFloorPlan);
    const invalidPlan = {
      ...mockFloorPlan,
      schemaVersion: "floor-plan-v0"
    } as unknown as FloorPlan;
    const invalidProject = storedProject("invalid_project", invalidPlan);
    const store: GeneratedProjectStore = {
      version: 1,
      projects: {
        valid_project: validProject,
        invalid_project: invalidProject
      },
      lastProjectId: "invalid_project"
    };

    storage.setItem(generatedPlanStorageKey, JSON.stringify(store));

    const validResult = loadGeneratedProject(storage, "valid_project");
    const invalidResult = loadGeneratedProject(storage, "invalid_project");

    expect(validResult.ok).toBe(true);
    expect(invalidResult.ok).toBe(false);

    if (!invalidResult.ok) {
      expect(invalidResult.message).toContain("unsupported floor plan schema version");
      expect(invalidResult.issues[0].code).toBe("FLOOR_PLAN_SCHEMA_VERSION_MISMATCH");
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

function storedProject(projectId: string, plan: FloorPlan) {
  return {
    projectId,
    projectName: null,
    plan: {
      ...plan,
      projectId
    },
    prompt: "Create a 3+1 apartment.",
    aiSummary: "Stored demo project.",
    warnings: [],
    createdAt: "2026-06-19T00:00:00.000Z"
  };
}

function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>();

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    }
  };
}
