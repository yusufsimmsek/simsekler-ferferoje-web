export type {
  LayoutQualityReportSchema as LayoutQualityReport
} from "./quality-schema";

export type LayoutQualityMetric =
  import("./quality-schema").LayoutQualityReportSchema["metricDetails"]["geometry"];
export type RelationshipConstraintResult =
  import("./quality-schema").LayoutQualityReportSchema["satisfiedConstraints"][number];
export type LayoutQualityWarning =
  import("./quality-schema").LayoutQualityReportSchema["warnings"][number];
export type LayoutQualityRecommendation =
  import("./quality-schema").LayoutQualityReportSchema["recommendations"][number];
