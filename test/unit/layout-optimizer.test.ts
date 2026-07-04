import { describe, expect, it } from "vitest";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import {
  evaluateLayoutCandidates,
  familyLayoutCandidateFixture,
  generateLayoutCandidates,
  layoutCandidateFixtures,
  layoutOptimizationReportSchema,
  optimizeFloorPlanLayout,
  openKitchenFamilyConstraintFixture,
  mapResolvedPlanningSpecificationToPlanDraft,
  rankLayoutCandidates,
  resolvePlanningConstraints,
  selectBestLayoutCandidate
} from "@/lib/planning";
import type {
  EvaluatedLayoutCandidate,
  LayoutCandidate
} from "@/lib/planning";

const preferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

describe("layout candidate generation", () => {
  it("generates the required deterministic candidate set", () => {
    const input = createOptimizationInput();
    const first = generateLayoutCandidates(input.layoutInput);
    const second = generateLayoutCandidates(input.layoutInput);

    expect(first.candidates.map((candidate) => candidate.id)).toEqual([
      "candidate_a",
      "candidate_b",
      "candidate_c",
      "candidate_d",
      "candidate_e",
      "candidate_f"
    ]);
    expect(first.candidates.length).toBeGreaterThanOrEqual(5);
    expect(second).toEqual(first);
    expect(first.rejectedCandidates).toHaveLength(0);
    expect(
      new Set(first.candidates.map((candidate) => candidate.strategy)).size
    ).toBeGreaterThanOrEqual(5);
  });

  it("keeps generated candidates schema-valid and geometry-valid", () => {
    familyLayoutCandidateFixture.candidates.forEach((candidate) => {
      const validation = validateFloorPlan(candidate.plan);

      expect(validation.ok).toBe(true);
      expect(candidate.plan.layout.strategy).toContain("deterministic-zone-grid-v1");
    });
  });
});

describe("layout optimizer", () => {
  it("selects the highest-ranked valid candidate and returns strict metadata", () => {
    const input = createOptimizationInput();
    const result = optimizeFloorPlanLayout({
      ...input.layoutInput,
      planning: input.planning
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.issues.map((issue) => issue.message).join(" "));
    }

    const ranked = rankLayoutCandidates(result.candidates);

    expect(result.metadata.selectedCandidate.id).toBe(ranked[0].id);
    expect(result.metadata.bestScore).toBe(ranked[0].quality.overallScore);
    expect(result.metadata.candidateCount).toBeGreaterThanOrEqual(5);
    expect(result.metadata.validCandidateCount).toBe(result.candidates.length);
    expect(
      layoutOptimizationReportSchema.safeParse(result.metadata).success
    ).toBe(true);
    expect(validateFloorPlan(result.plan).ok).toBe(true);
  });

  it("rejects invalid candidate geometry without replacing valid candidates", () => {
    const input = createOptimizationInput();
    const generation = generateLayoutCandidates(input.layoutInput);
    const invalidCandidate = makeOverlappingCandidate(generation.candidates[0]);
    const evaluation = evaluateLayoutCandidates({
      planning: input.planning,
      candidates: [invalidCandidate, generation.candidates[1]]
    });

    expect(evaluation.evaluatedCandidates).toHaveLength(1);
    expect(evaluation.rejectedCandidates).toHaveLength(1);
    expect(evaluation.rejectedCandidates[0].reason).toContain(
      "FloorPlan failed validation"
    );
  });

  it("uses relationship, circulation, and room balance tie-breakers", () => {
    const base = familyLayoutCandidateFixture.evaluatedCandidates[0];
    const relationshipWinner = candidateWithScores(base, {
      id: "candidate_b",
      order: 2,
      overallScore: 80,
      relationshipSatisfactionScore: 75,
      circulationScore: 70,
      roomBalanceScore: 70
    });
    const overallTieLoser = candidateWithScores(base, {
      id: "candidate_a",
      order: 1,
      overallScore: 80,
      relationshipSatisfactionScore: 70,
      circulationScore: 100,
      roomBalanceScore: 100
    });

    expect(
      selectBestLayoutCandidate([overallTieLoser, relationshipWinner]).id
    ).toBe("candidate_b");
  });

  it("runs every canonical candidate fixture through optimization", () => {
    layoutCandidateFixtures.forEach((fixture) => {
      expect(fixture.candidates.length).toBeGreaterThanOrEqual(
        fixture.expected.minimumCandidateCount
      );
      expect(fixture.optimization.bestScore).toBeGreaterThanOrEqual(
        fixture.expected.minimumBestScore
      );
      expect(fixture.optimization.scoreComparisonTable[0].selected).toBe(true);
    });
  });
});

describe("generation workflow optimization metadata", () => {
  it("attaches layout optimization metadata to successful generation responses", async () => {
    const result = await runGeneratePlanWorkflow({
      schemaVersion: "plan-generation-request-v1",
      prompt: "Create a 3+1 family apartment with open kitchen and balcony.",
      preferences
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.meta.optimization.schemaVersion).toBe(
        "layout-optimization-report-v1"
      );
      expect(result.body.meta.optimization.candidateCount).toBeGreaterThanOrEqual(
        5
      );
      expect(result.body.meta.optimization.bestScore).toBe(
        result.body.meta.quality.overallScore
      );
      expect(
        result.body.meta.optimization.scoreComparisonTable.some(
          (row) => row.selected
        )
      ).toBe(true);
    }
  });
});

function createOptimizationInput() {
  const resolution = resolvePlanningConstraints(openKitchenFamilyConstraintFixture);

  expect(resolution.ok).toBe(true);

  if (!resolution.ok) {
    throw new Error(resolution.issues.join(" "));
  }

  const mapping = mapResolvedPlanningSpecificationToPlanDraft(resolution.data);

  expect(mapping.ok).toBe(true);

  if (!mapping.ok) {
    throw new Error(mapping.issues.join(" "));
  }

  return {
    planning: resolution.data,
    layoutInput: {
      draft: mapping.draft,
      planId: "plan_candidate_test",
      projectId: "project_candidate_test",
      promptSummary: "Candidate optimization test",
      createdBy: "mock" as const,
      source: "prompt" as const
    }
  };
}

function makeOverlappingCandidate(candidate: LayoutCandidate): LayoutCandidate {
  const invalidCandidate = structuredClone(candidate);

  invalidCandidate.id = "candidate_invalid";
  invalidCandidate.label = "Candidate Invalid";
  invalidCandidate.plan.rooms[1].layout = {
    ...invalidCandidate.plan.rooms[0].layout
  };
  invalidCandidate.plan.rooms[1].area = invalidCandidate.plan.rooms[0].area;

  return invalidCandidate;
}

function candidateWithScores(
  candidate: EvaluatedLayoutCandidate,
  scores: {
    id: string;
    order: number;
    overallScore: number;
    relationshipSatisfactionScore: number;
    circulationScore: number;
    roomBalanceScore: number;
  }
): EvaluatedLayoutCandidate {
  return {
    ...candidate,
    id: scores.id,
    metadata: {
      ...candidate.metadata,
      order: scores.order
    },
    quality: {
      ...candidate.quality,
      overallScore: scores.overallScore,
      relationshipSatisfactionScore: scores.relationshipSatisfactionScore,
      circulationScore: scores.circulationScore,
      roomBalanceScore: scores.roomBalanceScore
    }
  };
}
