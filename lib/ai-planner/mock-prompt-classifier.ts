import type { FloorPlan } from "@/lib/floor-plan/types";
import {
  simpleOnePlusOneFixture,
  threePlusOneFixture,
  twoPlusOneFixture
} from "@/lib/floor-plan/fixtures";
import { floorPlanToPlanDraft } from "@/lib/floor-plan/draft";
import type { PlanDraft } from "@/lib/schemas/ai-contracts.schema";
import {
  normalizePromptText,
  planningSpecificationFromPrompt
} from "@/lib/planning/planning-normalizer";
import type { PlanningUnsupportedRequest } from "@/lib/planning/planning-types";

export type MockPromptFixtureKey = "1plus1" | "2plus1" | "3plus1" | "fallback_generic";

export type MockUnsupportedReason =
  | "cad_bim"
  | "permit_legal_compliance"
  | "structural_engineering"
  | "three_dimensional_render"
  | "multi_floor"
  | "non_residential"
  | "interior_only"
  | "out_of_scope";

export type MockPromptClassification =
  | {
      kind: "fixture";
      fixtureKey: MockPromptFixtureKey;
      fixture: FloorPlan;
      reason: string;
      warnings: string[];
    }
  | {
      kind: "needs_clarification";
      fixtureKey: null;
      fixture: null;
      reason: string;
      warnings: string[];
      clarificationRequest: string;
    }
  | {
      kind: "unsupported";
      fixtureKey: null;
      fixture: null;
      unsupportedReason: MockUnsupportedReason;
      reason: string;
      warnings: string[];
    };

export function classifyMockPrompt(prompt: string): MockPromptClassification {
  const specification = planningSpecificationFromPrompt(prompt);

  if (specification.unsupportedRequests.length > 0) {
    const first = specification.unsupportedRequests[0];

    return {
      kind: "unsupported",
      fixtureKey: null,
      fixture: null,
      unsupportedReason: mockUnsupportedReason(first),
      reason: first.message,
      warnings: [
        ...specification.unsupportedRequests.map((request) => request.message),
        ...specification.warnings
      ]
    };
  }

  if (specification.clarificationQuestions.length > 0) {
    return {
      kind: "needs_clarification",
      fixtureKey: null,
      fixture: null,
      reason: specification.missingInformation.join(", ") || "Prompt needs clarification.",
      warnings: specification.warnings,
      clarificationRequest: specification.clarificationQuestions
        .map((question) => question.question)
        .join(" ")
    };
  }

  const fixtureKey = fixtureKeyForPlanning(prompt, specification.requestedRooms.bedrooms);

  return {
    kind: "fixture",
    fixtureKey,
    fixture: fixtureForKey(fixtureKey),
    reason: `PlanningSpecification normalized the request as ${specification.title}.`,
    warnings: [
      fixtureWarning(fixtureKey),
      ...specification.warnings
    ]
  };
}

function fixtureWarning(key: MockPromptFixtureKey) {
  if (key === "fallback_generic") {
    return "Mock provider used the generic apartment fallback fixture.";
  }

  const label = key === "1plus1" ? "1+1" : key === "2plus1" ? "2+1" : "3+1";
  return `Mock provider selected the deterministic ${label} fixture.`;
}

export function getMockFloorPlanForPrompt(prompt: string): FloorPlan | null {
  const classification = classifyMockPrompt(prompt);

  if (classification.kind !== "fixture") return null;

  return structuredClone(classification.fixture);
}

export function floorPlanFixtureToPlanDraft(plan: FloorPlan): PlanDraft {
  return floorPlanToPlanDraft(plan);
}

function fixtureKeyForPlanning(prompt: string, bedrooms: number): MockPromptFixtureKey {
  const normalized = normalizePromptText(prompt);
  const hasExplicitRoomCount = /\b[1-8]\s*\+\s*1\b/.test(normalized)
    || /\b[1-8]\s*bed(?:room)?s?\b/.test(normalized)
    || /\b(one|two|three|four|five)\s+bed(?:room)?s?\b/.test(normalized)
    || /\b[1-8]\s*yatak\s+odali\b/.test(normalized)
    || /\b(bir|iki|uc|dort|bes)\s+yatak\s+odali\b/.test(normalized);
  const hasKnownProfile = /\b(student|pet|wheelchair|accessible|vacation\s+home|tiny\s+house|luxury\s+villa|145\s*(sqm|m2))\b/.test(normalized);

  if (!hasExplicitRoomCount && !hasKnownProfile) return "fallback_generic";
  if (bedrooms <= 1) return "1plus1";
  if (bedrooms === 2) return "2plus1";
  return "3plus1";
}

function fixtureForKey(key: MockPromptFixtureKey) {
  if (key === "1plus1") return simpleOnePlusOneFixture;
  if (key === "3plus1") return threePlusOneFixture;
  return twoPlusOneFixture;
}

function mockUnsupportedReason(
  request: PlanningUnsupportedRequest
): MockUnsupportedReason {
  if (request.code === "permit_legal" || request.code === "construction_drawings") {
    return "permit_legal_compliance";
  }
  if (request.code === "three_dimensional_render") return "three_dimensional_render";
  if (request.code === "cad_bim") return "cad_bim";
  if (request.code === "structural_engineering") return "structural_engineering";
  if (request.code === "multi_floor") return "multi_floor";
  if (request.code === "non_residential") return "non_residential";
  if (request.code === "interior_only") return "interior_only";
  return "out_of_scope";
}
