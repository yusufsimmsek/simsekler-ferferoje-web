export type {
  PlanningSpecificationSchema as PlanningSpecification
} from "./planning-schema";

export type PlanningPriority = "low" | "medium" | "high";
export type PlanningRoomRelationship =
  import("./planning-schema").PlanningSpecificationSchema["roomRelationships"][number];
export type PlanningUnsupportedRequest =
  import("./planning-schema").PlanningSpecificationSchema["unsupportedRequests"][number];
export type PlanningClarificationQuestion =
  import("./planning-schema").PlanningSpecificationSchema["clarificationQuestions"][number];
