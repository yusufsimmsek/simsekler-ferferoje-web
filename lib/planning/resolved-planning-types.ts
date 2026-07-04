export type {
  ResolvedPlanningSpecificationSchema as ResolvedPlanningSpecification
} from "./resolved-planning-schema";

export type ResolvedRoomProgram =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["resolvedRoomProgram"];
export type ResolvedRoomProgramItem = ResolvedRoomProgram["rooms"][number];
export type ResolvedConstraint =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["resolvedConstraints"][number];
export type PlanningRelationshipGraph =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["relationshipGraph"];
export type PlanningRelationshipEdge = PlanningRelationshipGraph["edges"][number];
export type PlanningConflict =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["conflicts"][number];
export type PlanningCompromise =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["compromises"][number];
export type PlanningFeasibilityScore =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["feasibility"];
export type PlanningRecommendation =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["recommendations"][number];
export type UnresolvedPlanningItem =
  import("./resolved-planning-schema").ResolvedPlanningSpecificationSchema["unresolvedItems"][number];
