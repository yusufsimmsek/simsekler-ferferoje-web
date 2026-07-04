import { describe, expect, it } from "vitest";
import {
  chatEditEvaluationFixtures,
  planningEvaluationFixtures,
  promptToPlanEvaluationFixtures
} from "@/lib/ai-planner/evaluation-fixtures";
import {
  runAiEvaluationFixtures,
  runChatEditEvaluationFixture,
  runPlanningConstraintEvaluationFixtures,
  runPlanningEvaluationFixtures,
  runPromptToPlanEvaluationFixture
} from "@/lib/ai-planner/evaluation";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";

describe("AI evaluation fixtures", () => {
  it("includes the required prompt-to-plan fixture coverage", () => {
    expect(promptToPlanEvaluationFixtures.map((fixture) => fixture.id)).toEqual([
      "prompt_1plus1_apartment",
      "prompt_2plus1_apartment",
      "prompt_3plus1_apartment",
      "prompt_villa",
      "prompt_office",
      "prompt_unsupported_cad_bim",
      "prompt_impossible_ambiguous"
    ]);
  });

  it("includes the required chat-edit fixture coverage", () => {
    expect(chatEditEvaluationFixtures.map((fixture) => fixture.id)).toEqual([
      "edit_enlarge_living_room",
      "edit_shrink_kitchen",
      "edit_add_bathroom",
      "edit_add_balcony",
      "edit_rename_bedroom_to_office",
      "edit_unsupported_3d_render",
      "edit_invalid_destructive_command"
    ]);
  });

  it("includes the required planning-level fixture coverage", () => {
    expect(planningEvaluationFixtures.map((fixture) => fixture.id)).toEqual([
      "planning_modern_family_apartment",
      "planning_open_kitchen",
      "planning_daylight_priority",
      "planning_office_request",
      "planning_accessibility",
      "planning_pet_friendly",
      "planning_ambiguous",
      "planning_unsupported"
    ]);
  });

  it("runs planning-level fixtures through deterministic mock planning", async () => {
    const results = await runPlanningEvaluationFixtures();

    expect(results).toHaveLength(8);
    expect(results.every((result) => result.passed)).toBe(true);
  });

  it("runs resolved planning constraint fixtures deterministically", () => {
    const results = runPlanningConstraintEvaluationFixtures();

    expect(results).toHaveLength(10);
    expect(results.every((result) => result.passed)).toBe(true);
  });

  it("runs prompt-to-plan fixtures against mock mode with deterministic expectations", async () => {
    const results = await Promise.all(
      promptToPlanEvaluationFixtures.map((fixture) => runPromptToPlanEvaluationFixture(fixture))
    );

    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.find((result) => result.id === "prompt_unsupported_cad_bim")?.actual).toMatchObject({
      ok: false,
      code: "AI_UNSUPPORTED_REQUEST"
    });
    expect(results.find((result) => result.id === "prompt_3plus1_apartment")?.actual).toMatchObject({
      ok: true,
      planId: "plan_3plus1",
      promptClassification: "3plus1"
    });
  });

  it("runs chat-edit fixtures against mock mode with deterministic expectations", async () => {
    const before = JSON.stringify(mockFloorPlan);
    const results = await Promise.all(
      chatEditEvaluationFixtures.map((fixture) => runChatEditEvaluationFixture(fixture))
    );

    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.find((result) => result.id === "edit_shrink_kitchen")?.actual).toMatchObject({
      ok: false,
      code: "EDIT_UNSUPPORTED_COMMAND"
    });
    expect(results.find((result) => result.id === "edit_rename_bedroom_to_office")?.actual).toMatchObject({
      ok: true,
      actionTypes: ["rename_room"]
    });
    expect(JSON.stringify(mockFloorPlan)).toBe(before);
  });

  it("returns a deterministic aggregate pass/fail report", async () => {
    const report = await runAiEvaluationFixtures();

    expect(report.schemaVersion).toBe("ai-evaluation-report-v1");
    expect(report.provider).toBe("mock");
    expect(report.summary).toEqual({
      total: 14,
      passed: 14,
      failed: 0
    });
    expect(report.results.every((result) => result.metadata.provider === "mock")).toBe(true);
  });
});
