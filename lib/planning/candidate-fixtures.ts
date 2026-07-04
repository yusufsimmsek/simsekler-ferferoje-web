import type {
  EvaluatedLayoutCandidate,
  LayoutCandidate,
  LayoutOptimizationReport,
  RejectedLayoutCandidate
} from "./candidate-types";
import {
  openKitchenFamilyConstraintFixture,
  privacyPriorityConstraintFixture
} from "./constraint-fixtures";
import { resolvePlanningConstraints } from "./constraint-resolver";
import { generateLayoutCandidates } from "./layout-candidate-generator";
import { optimizeFloorPlanLayout } from "./layout-optimizer";
import { mapResolvedPlanningSpecificationToPlanDraft } from "./planning-to-draft";
import type { ResolvedPlanningSpecification } from "./resolved-planning-types";

export type LayoutCandidateFixture = {
  id: string;
  title: string;
  planning: ResolvedPlanningSpecification;
  candidates: LayoutCandidate[];
  evaluatedCandidates: EvaluatedLayoutCandidate[];
  rejectedCandidates: RejectedLayoutCandidate[];
  optimization: LayoutOptimizationReport;
  expected: {
    minimumCandidateCount: number;
    minimumBestScore: number;
  };
};

export const familyLayoutCandidateFixture = createCandidateFixture({
  id: "candidate_family_open_kitchen",
  title: "Open kitchen family candidate set",
  specification: openKitchenFamilyConstraintFixture,
  expected: {
    minimumCandidateCount: 5,
    minimumBestScore: 60
  }
});

export const privacyLayoutCandidateFixture = createCandidateFixture({
  id: "candidate_privacy_priority",
  title: "Privacy priority candidate set",
  specification: privacyPriorityConstraintFixture,
  expected: {
    minimumCandidateCount: 5,
    minimumBestScore: 50
  }
});

export const layoutCandidateFixtures = [
  familyLayoutCandidateFixture,
  privacyLayoutCandidateFixture
] as const;

function createCandidateFixture(input: {
  id: string;
  title: string;
  specification: typeof openKitchenFamilyConstraintFixture;
  expected: LayoutCandidateFixture["expected"];
}): LayoutCandidateFixture {
  const resolution = resolvePlanningConstraints(input.specification);

  if (!resolution.ok) {
    throw new Error(
      `Candidate fixture planning resolution failed: ${resolution.issues.join(" ")}`
    );
  }

  const mapping = mapResolvedPlanningSpecificationToPlanDraft(resolution.data);

  if (!mapping.ok) {
    throw new Error(
      `Candidate fixture draft mapping failed: ${mapping.issues.join(" ")}`
    );
  }

  const layoutInput = {
    draft: mapping.draft,
    planId: `plan_${input.id}`,
    projectId: `project_${input.id}`,
    promptSummary: input.specification.title,
    createdBy: "mock" as const,
    source: "prompt" as const
  };
  const generation = generateLayoutCandidates(layoutInput);
  const optimization = optimizeFloorPlanLayout({
    ...layoutInput,
    planning: resolution.data
  });

  if (!optimization.ok) {
    throw new Error(
      `Candidate fixture optimization failed: ${optimization.issues
        .map((issue) => issue.message)
        .join(" ")}`
    );
  }

  return {
    id: input.id,
    title: input.title,
    planning: resolution.data,
    candidates: generation.candidates,
    evaluatedCandidates: optimization.candidates,
    rejectedCandidates: optimization.rejectedCandidates,
    optimization: optimization.metadata,
    expected: input.expected
  };
}
