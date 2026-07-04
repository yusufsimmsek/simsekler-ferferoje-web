import { describe, expect, it } from "vitest";
import {
  analyzeLayoutQuality,
  highQualityLayoutFixture,
  layoutQualityFixtures,
  layoutQualityReportSchema,
  lowQualityLayoutFixture,
  scorePlanningRelationships
} from "@/lib/planning";
import { runGeneratePlanWorkflow } from "@/lib/ai-planner/generate-plan-workflow";
import { validateFloorPlan } from "@/lib/floor-plan/validation";

const preferences = {
  units: "m",
  maxRooms: 12,
  style: "simple-residential",
  rectangularRoomsOnly: true
} as const;

describe("post-layout relationship satisfaction", () => {
  it("scores kitchen/living and balcony/living relationships from geometry", () => {
    const result = scorePlanningRelationships({
      planning: highQualityLayoutFixture.planning,
      plan: highQualityLayoutFixture.plan
    });

    expect(result.score).toBeGreaterThan(0);
    expect(
      result.satisfied.some(
        (constraint) =>
          constraint.ruleId === "rule_open_kitchen_connection" &&
          constraint.actualRelationship === "connected"
      )
    ).toBe(true);
    expect(
      result.satisfied.some(
        (constraint) =>
          constraint.ruleId === "rule_balcony_living_connection" &&
          constraint.actualRelationship === "connected"
      )
    ).toBe(true);
  });

  it("reports partial or failed relationships when doors are removed", () => {
    const result = scorePlanningRelationships({
      planning: lowQualityLayoutFixture.planning,
      plan: lowQualityLayoutFixture.plan
    });

    expect(result.failed.length).toBeGreaterThan(0);
    expect(
      result.failed.some(
        (constraint) =>
          constraint.ruleId === "rule_balcony_living_connection"
      )
    ).toBe(true);
    expect(result.score).toBeLessThan(100);
  });
});

describe("layout geometric quality scoring", () => {
  it("generates a strict, deterministic quality report", () => {
    const first = expectReport(
      analyzeLayoutQuality({
        planning: highQualityLayoutFixture.planning,
        plan: highQualityLayoutFixture.plan
      })
    );
    const second = expectReport(
      analyzeLayoutQuality({
        planning: highQualityLayoutFixture.planning,
        plan: highQualityLayoutFixture.plan
      })
    );

    expect(layoutQualityReportSchema.safeParse(first).success).toBe(true);
    expect(second).toEqual(first);
    expect(first.geometryScore).toBe(100);
    expect(first.metadata.deterministic).toBe(true);
  });

  it("scores a high-quality generated layout above its fixture threshold", () => {
    const report = expectReport(
      analyzeLayoutQuality({
        planning: highQualityLayoutFixture.planning,
        plan: highQualityLayoutFixture.plan
      })
    );

    expect(report.overallScore).toBeGreaterThanOrEqual(
      highQualityLayoutFixture.expected.minimumOverallScore ?? 0
    );
    expect(["excellent", "good", "fair"]).toContain(report.rating);
  });

  it("scores disconnected, windowless geometry below the low-quality threshold", () => {
    expect(validateFloorPlan(lowQualityLayoutFixture.plan).ok).toBe(true);

    const report = expectReport(
      analyzeLayoutQuality({
        planning: lowQualityLayoutFixture.planning,
        plan: lowQualityLayoutFixture.plan
      })
    );

    expect(report.overallScore).toBeLessThanOrEqual(
      lowQualityLayoutFixture.expected.maximumOverallScore ?? 100
    );
    expect(report.warnings.map((warning) => warning.code)).toContain(
      lowQualityLayoutFixture.expected.warningCode
    );
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("detects overlapping geometry independently from layout generation", () => {
    const overlappingPlan = structuredClone(highQualityLayoutFixture.plan);
    const firstRoom = overlappingPlan.rooms[0];
    const secondRoom = overlappingPlan.rooms[1];

    secondRoom.layout = { ...firstRoom.layout };
    secondRoom.area = firstRoom.area;
    const report = expectReport(
      analyzeLayoutQuality({
        planning: highQualityLayoutFixture.planning,
        plan: overlappingPlan
      })
    );

    expect(report.geometryScore).toBeLessThan(100);
    expect(report.warnings.some((warning) => warning.code === "geometry_overlap")).toBe(
      true
    );
  });

  it("keeps every canonical quality fixture analyzable", () => {
    const reports = layoutQualityFixtures.map((fixture) =>
      expectReport(
        analyzeLayoutQuality({
          planning: fixture.planning,
          plan: fixture.plan
        })
      )
    );

    expect(reports).toHaveLength(3);
    expect(reports.every((report) => report.overallScore >= 0)).toBe(true);
  });
});

describe("generation workflow quality metadata", () => {
  it("attaches LayoutQualityReport to successful API metadata", async () => {
    const result = await runGeneratePlanWorkflow({
      schemaVersion: "plan-generation-request-v1",
      prompt: "Create a 3+1 family apartment with open kitchen and balcony.",
      preferences
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.meta.quality.schemaVersion).toBe(
        "layout-quality-report-v1"
      );
      expect(
        layoutQualityReportSchema.safeParse(result.body.meta.quality).success
      ).toBe(true);
      expect(result.body.meta.quality.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.body.meta.quality.geometryScore).toBe(100);
    }
  });
});

function expectReport(result: ReturnType<typeof analyzeLayoutQuality>) {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.issues.join(" "));
  }

  return result.report;
}
