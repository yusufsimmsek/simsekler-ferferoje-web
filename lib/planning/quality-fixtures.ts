import type { FloorPlan } from "@/lib/floor-plan/types";
import { generateFloorPlanLayout } from "@/lib/layout-engine/generate-layout";
import {
  openKitchenFamilyConstraintFixture,
  privacyPriorityConstraintFixture
} from "./constraint-fixtures";
import { resolvePlanningConstraints } from "./constraint-resolver";
import { mapResolvedPlanningSpecificationToPlanDraft } from "./planning-to-draft";
import type { ResolvedPlanningSpecification } from "./resolved-planning-types";

export type LayoutQualityFixture = {
  id: string;
  title: string;
  planning: ResolvedPlanningSpecification;
  plan: FloorPlan;
  expected: {
    minimumOverallScore?: number;
    maximumOverallScore?: number;
    warningCode?: string;
  };
};

const highQualityInput = createLayoutQualityInput(
  openKitchenFamilyConstraintFixture,
  "quality_high"
);
const privacyInput = createLayoutQualityInput(
  privacyPriorityConstraintFixture,
  "quality_privacy"
);

export const highQualityLayoutFixture: LayoutQualityFixture = {
  id: "quality_high_family_layout",
  title: "High quality family layout",
  planning: highQualityInput.planning,
  plan: highQualityInput.plan,
  expected: {
    minimumOverallScore: 65
  }
};

export const lowQualityLayoutFixture: LayoutQualityFixture = {
  id: "quality_low_disconnected_layout",
  title: "Low quality disconnected layout",
  planning: highQualityInput.planning,
  plan: createLowQualityPlan(highQualityInput.plan),
  expected: {
    maximumOverallScore: 60,
    warningCode: "balcony_isolated"
  }
};

export const privacyQualityLayoutFixture: LayoutQualityFixture = {
  id: "quality_privacy_layout",
  title: "Privacy-priority generated layout",
  planning: privacyInput.planning,
  plan: privacyInput.plan,
  expected: {
    minimumOverallScore: 50
  }
};

export const layoutQualityFixtures = [
  highQualityLayoutFixture,
  lowQualityLayoutFixture,
  privacyQualityLayoutFixture
] as const;

function createLayoutQualityInput(
  specification: Parameters<typeof resolvePlanningConstraints>[0],
  idSuffix: string
) {
  const resolution = resolvePlanningConstraints(specification);

  if (!resolution.ok) {
    throw new Error(
      `Quality fixture planning resolution failed: ${resolution.issues.join(" ")}`
    );
  }

  const mapping = mapResolvedPlanningSpecificationToPlanDraft(resolution.data);

  if (!mapping.ok) {
    throw new Error(
      `Quality fixture draft mapping failed: ${mapping.issues.join(" ")}`
    );
  }

  const layout = generateFloorPlanLayout({
    draft: mapping.draft,
    planId: `plan_${idSuffix}`,
    projectId: `project_${idSuffix}`,
    promptSummary: specification.title,
    createdBy: "mock",
    source: "prompt"
  });

  return {
    planning: resolution.data,
    plan: layout.plan
  };
}

function createLowQualityPlan(source: FloorPlan): FloorPlan {
  const plan = structuredClone(source);

  return {
    ...plan,
    id: "plan_quality_low",
    projectId: "project_quality_low",
    bounds: {
      ...plan.bounds,
      width: Number((plan.bounds.width * 1.8).toFixed(2)),
      height: Number((plan.bounds.height * 1.4).toFixed(2))
    },
    rooms: plan.rooms.map((room) => ({
      ...room,
      targetArea: Number((room.area * 2.5).toFixed(2))
    })),
    doors: [],
    windows: []
  };
}
