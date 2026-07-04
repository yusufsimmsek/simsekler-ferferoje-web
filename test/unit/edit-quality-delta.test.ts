import { describe, expect, it } from "vitest";
import {
  createEditQualityDeltaReport,
  highQualityLayoutFixture,
  layoutQualityReportSchema,
  lowQualityLayoutFixture,
  analyzeLayoutQuality,
  formatSignedScoreDelta,
  topEditQualityDeltaReason
} from "@/lib/planning";

describe("edit quality delta reporting", () => {
  it("calculates before/after score movement and metric buckets", () => {
    const before = reportFor(lowQualityLayoutFixture);
    const after = reportFor(highQualityLayoutFixture);
    const delta = createEditQualityDeltaReport({ before, after });

    expect(delta.schemaVersion).toBe("edit-quality-delta-v1");
    expect(delta.beforeOverallScore).toBe(before.overallScore);
    expect(delta.afterOverallScore).toBe(after.overallScore);
    expect(delta.scoreDelta).toBeCloseTo(after.overallScore - before.overallScore);
    expect(delta.improvedMetrics.length).toBeGreaterThan(0);
    expect(
      delta.improvedMetrics.length +
        delta.worsenedMetrics.length +
        delta.unchangedMetrics.length
    ).toBe(9);
    expect(delta.relationshipSatisfactionDelta).toBeGreaterThan(0);
    expect(delta.summary).toMatch(/quality/i);
  });

  it("detects warnings and recommendations added or resolved", () => {
    const before = reportFor(lowQualityLayoutFixture);
    const after = reportFor(highQualityLayoutFixture);
    const delta = createEditQualityDeltaReport({ before, after });

    expect(delta.warningsResolved.length).toBeGreaterThan(0);
    expect(delta.recommendationsResolved.length).toBeGreaterThan(0);

    const reverseDelta = createEditQualityDeltaReport({
      before: after,
      after: before
    });

    expect(reverseDelta.warningsAdded.length).toBeGreaterThan(0);
    expect(reverseDelta.scoreDelta).toBeLessThan(0);
  });

  it("formats signed deltas and top reasons for assistant copy", () => {
    const before = reportFor(lowQualityLayoutFixture);
    const after = reportFor(highQualityLayoutFixture);
    const delta = createEditQualityDeltaReport({ before, after });

    expect(formatSignedScoreDelta(delta.scoreDelta)).toMatch(/^\+/);
    expect(topEditQualityDeltaReason(delta)).toMatch(/improved|changed|stable/i);
  });
});

function reportFor(fixture: typeof highQualityLayoutFixture | typeof lowQualityLayoutFixture) {
  const result = analyzeLayoutQuality({
    planning: fixture.planning,
    plan: fixture.plan
  });

  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.issues.join(" "));
  }

  expect(layoutQualityReportSchema.safeParse(result.report).success).toBe(true);

  return result.report;
}
