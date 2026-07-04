import { planningSpecificationFromPrompt } from "./planning-normalizer";
import type { PlanningSpecification } from "./planning-types";
import type { PlanningValidationIssue } from "./planning-validation";

export type PlanningProviderRequest = {
  prompt: string;
  preferences: {
    units: "m";
    maxRooms: number;
    style: "simple-residential";
    rectangularRoomsOnly: true;
  };
};

export interface PlanningProvider {
  createPlanningSpecification(
    request: PlanningProviderRequest
  ): Promise<PlanningSpecification>;
}

export class PlanningProviderValidationError extends Error {
  readonly issues: PlanningValidationIssue[];

  constructor(message: string, issues: PlanningValidationIssue[]) {
    super(message);
    this.name = "PlanningProviderValidationError";
    this.issues = issues;
  }
}

export class MockPlanningProvider implements PlanningProvider {
  async createPlanningSpecification(
    request: PlanningProviderRequest
  ): Promise<PlanningSpecification> {
    return planningSpecificationFromPrompt(request.prompt);
  }
}

export const mockPlanningProvider = new MockPlanningProvider();
