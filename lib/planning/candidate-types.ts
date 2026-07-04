export type {
  EvaluatedLayoutCandidateSchema as EvaluatedLayoutCandidate,
  LayoutCandidateSchema as LayoutCandidate,
  LayoutOptimizationReportSchema as LayoutOptimizationReport,
  RejectedLayoutCandidateSchema as RejectedLayoutCandidate
} from "./candidate-schema";

export type LayoutCandidateStrategy =
  import("./candidate-schema").LayoutCandidateSchema["strategy"];
export type LayoutCandidateScoreRow =
  import("./candidate-schema").LayoutOptimizationReportSchema["scoreComparisonTable"][number];
