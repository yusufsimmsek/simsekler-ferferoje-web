import { generateFloorPlanLayout } from "@/lib/layout-engine/generate-layout";
import { floorPlanToPlanDraft } from "./draft";
import {
  conceptualDraftDisclaimer,
  mockWarningIssue,
  threePlusOneFixture,
  validFloorPlanFixtures
} from "./fixtures";

export const mockFloorPlan = generateFloorPlanLayout({
  draft: floorPlanToPlanDraft(threePlusOneFixture),
  planId: "plan_3plus1",
  projectId: "project_fixture_3plus1",
  promptSummary: threePlusOneFixture.metadata.promptSummary,
  createdBy: "mock",
  source: "prompt"
}).plan;

export {
  conceptualDraftDisclaimer,
  mockWarningIssue,
  validFloorPlanFixtures
};
