import { editQualityDeltaReportSchema } from "./edit-quality-delta-schema";
import type {
  EditQualityDeltaReport,
  EditQualityMetricDelta,
  EditQualityMetricName
} from "./edit-quality-delta-types";
import type {
  LayoutQualityRecommendation,
  LayoutQualityReport,
  LayoutQualityWarning
} from "./quality-types";

const metricLabels: Record<EditQualityMetricName, string> = {
  relationshipSatisfaction: "Relationship satisfaction",
  circulation: "Circulation",
  privacy: "Privacy",
  daylight: "Daylight",
  accessibility: "Accessibility",
  efficiency: "Efficiency",
  adjacency: "Adjacency",
  geometry: "Geometry",
  roomBalance: "Room balance"
};

const metricAccessors: Array<{
  metric: EditQualityMetricName;
  score: (report: LayoutQualityReport) => number;
}> = [
  {
    metric: "relationshipSatisfaction",
    score: (report) => report.relationshipSatisfactionScore
  },
  {
    metric: "circulation",
    score: (report) => report.circulationScore
  },
  {
    metric: "privacy",
    score: (report) => report.privacyScore
  },
  {
    metric: "daylight",
    score: (report) => report.daylightScore
  },
  {
    metric: "accessibility",
    score: (report) => report.accessibilityScore
  },
  {
    metric: "efficiency",
    score: (report) => report.efficiencyScore
  },
  {
    metric: "adjacency",
    score: (report) => report.adjacencyScore
  },
  {
    metric: "geometry",
    score: (report) => report.geometryScore
  },
  {
    metric: "roomBalance",
    score: (report) => report.roomBalanceScore
  }
];

export function createEditQualityDeltaReport(input: {
  before: LayoutQualityReport;
  after: LayoutQualityReport;
}): EditQualityDeltaReport {
  const metricDeltas = metricAccessors.map(({ metric, score }) => {
    const beforeScore = score(input.before);
    const afterScore = score(input.after);

    return {
      metric,
      label: metricLabels[metric],
      beforeScore,
      afterScore,
      delta: roundDelta(afterScore - beforeScore)
    };
  });
  const improvedMetrics = metricDeltas.filter((metric) => metric.delta > 0.01);
  const worsenedMetrics = metricDeltas.filter((metric) => metric.delta < -0.01);
  const unchangedMetrics = metricDeltas.filter(
    (metric) => Math.abs(metric.delta) <= 0.01
  );
  const payload = {
    schemaVersion: "edit-quality-delta-v1",
    beforeOverallScore: input.before.overallScore,
    afterOverallScore: input.after.overallScore,
    scoreDelta: roundDelta(input.after.overallScore - input.before.overallScore),
    ratingBefore: input.before.rating,
    ratingAfter: input.after.rating,
    improvedMetrics,
    worsenedMetrics,
    unchangedMetrics,
    relationshipSatisfactionDelta: deltaFor(
      metricDeltas,
      "relationshipSatisfaction"
    ),
    circulationDelta: deltaFor(metricDeltas, "circulation"),
    privacyDelta: deltaFor(metricDeltas, "privacy"),
    daylightDelta: deltaFor(metricDeltas, "daylight"),
    roomBalanceDelta: deltaFor(metricDeltas, "roomBalance"),
    warningsAdded: diffWarnings(input.after.warnings, input.before.warnings),
    warningsResolved: diffWarnings(input.before.warnings, input.after.warnings),
    recommendationsAdded: diffRecommendations(
      input.after.recommendations,
      input.before.recommendations
    ),
    recommendationsResolved: diffRecommendations(
      input.before.recommendations,
      input.after.recommendations
    ),
    summary: summarizeDelta({
      before: input.before,
      after: input.after,
      metricDeltas
    })
  };

  return editQualityDeltaReportSchema.parse(payload);
}

export function formatSignedScoreDelta(delta: number) {
  if (Math.abs(delta) <= 0.01) return "0";

  return `${delta > 0 ? "+" : ""}${roundDelta(delta)}`;
}

export function topEditQualityDeltaReason(delta: EditQualityDeltaReport) {
  const bestImprovement = [...delta.improvedMetrics].sort(
    (left, right) => right.delta - left.delta
  )[0];
  const worstDecline = [...delta.worsenedMetrics].sort(
    (left, right) => left.delta - right.delta
  )[0];

  if (bestImprovement && delta.scoreDelta >= 0) {
    return `${bestImprovement.label} improved by ${formatSignedScoreDelta(bestImprovement.delta)}.`;
  }

  if (worstDecline) {
    return `${worstDecline.label} changed by ${formatSignedScoreDelta(worstDecline.delta)}.`;
  }

  return "Quality metrics stayed broadly stable.";
}

function summarizeDelta(input: {
  before: LayoutQualityReport;
  after: LayoutQualityReport;
  metricDeltas: EditQualityMetricDelta[];
}) {
  const scoreDelta = roundDelta(
    input.after.overallScore - input.before.overallScore
  );
  const trend =
    scoreDelta > 0.01
      ? "improved"
      : scoreDelta < -0.01
        ? "decreased"
        : "remained stable";
  const topReason = topEditQualityDeltaReason({
    schemaVersion: "edit-quality-delta-v1",
    beforeOverallScore: input.before.overallScore,
    afterOverallScore: input.after.overallScore,
    scoreDelta,
    ratingBefore: input.before.rating,
    ratingAfter: input.after.rating,
    improvedMetrics: input.metricDeltas.filter((metric) => metric.delta > 0.01),
    worsenedMetrics: input.metricDeltas.filter((metric) => metric.delta < -0.01),
    unchangedMetrics: input.metricDeltas.filter(
      (metric) => Math.abs(metric.delta) <= 0.01
    ),
    relationshipSatisfactionDelta: deltaFor(
      input.metricDeltas,
      "relationshipSatisfaction"
    ),
    circulationDelta: deltaFor(input.metricDeltas, "circulation"),
    privacyDelta: deltaFor(input.metricDeltas, "privacy"),
    daylightDelta: deltaFor(input.metricDeltas, "daylight"),
    roomBalanceDelta: deltaFor(input.metricDeltas, "roomBalance"),
    warningsAdded: [],
    warningsResolved: [],
    recommendationsAdded: [],
    recommendationsResolved: [],
    summary: "Temporary summary for reason selection."
  });

  return `Layout quality ${trend}: ${input.before.overallScore} -> ${input.after.overallScore} (${formatSignedScoreDelta(scoreDelta)}). ${topReason}`;
}

function diffWarnings(
  source: LayoutQualityWarning[],
  comparison: LayoutQualityWarning[]
) {
  const comparisonKeys = new Set(comparison.map(warningKey));

  return source.filter((warning) => !comparisonKeys.has(warningKey(warning)));
}

function diffRecommendations(
  source: LayoutQualityRecommendation[],
  comparison: LayoutQualityRecommendation[]
) {
  const comparisonKeys = new Set(comparison.map(recommendationKey));

  return source.filter((recommendation) =>
    !comparisonKeys.has(recommendationKey(recommendation))
  );
}

function warningKey(warning: LayoutQualityWarning) {
  return [
    warning.code,
    warning.message,
    warning.roomIds.slice().sort().join(",")
  ].join(":");
}

function recommendationKey(recommendation: LayoutQualityRecommendation) {
  return [
    recommendation.code,
    recommendation.message,
    recommendation.roomIds.slice().sort().join(",")
  ].join(":");
}

function deltaFor(
  metrics: EditQualityMetricDelta[],
  metricName: EditQualityMetricName
) {
  return metrics.find((metric) => metric.metric === metricName)?.delta ?? 0;
}

function roundDelta(value: number) {
  return Number(value.toFixed(2));
}
