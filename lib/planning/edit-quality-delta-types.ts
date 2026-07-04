export type {
  EditQualityDeltaReportSchema as EditQualityDeltaReport,
  EditQualityMetricDeltaSchema as EditQualityMetricDelta
} from "./edit-quality-delta-schema";

export type EditQualityMetricName =
  import("./edit-quality-delta-schema").EditQualityMetricDeltaSchema["metric"];
