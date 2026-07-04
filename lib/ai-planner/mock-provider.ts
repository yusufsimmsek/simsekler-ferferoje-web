import { promptToPlanAiResponseSchema } from "@/lib/schemas/ai-contracts.schema";
import {
  mapPlanningSpecificationToPlanDraft,
  mockPlanningProvider
} from "@/lib/planning";
import { classifyMockChatEdit } from "./mock-chat-edit-classifier";
import type {
  AiPlannerProvider,
  ChatEditRequest,
  ChatEditResponse,
  PlanGenerationRequest,
  PlanGenerationResponse
} from "./provider";

export class MockAiPlannerProvider implements AiPlannerProvider {
  async createPlanningSpecification(request: PlanGenerationRequest) {
    return mockPlanningProvider.createPlanningSpecification(request);
  }

  async generatePlan(request: PlanGenerationRequest): Promise<PlanGenerationResponse> {
    const specification = await this.createPlanningSpecification(request);

    if (specification.unsupportedRequests.length > 0) {
      return promptToPlanAiResponseSchema.parse({
        schemaVersion: "plan-generation-response-v1",
        status: "unsupported",
        planDraft: null,
        clarificationRequest: null,
        warnings: [
          ...specification.unsupportedRequests.map((item) => item.message),
          ...specification.warnings
        ]
      });
    }

    if (specification.clarificationQuestions.length > 0) {
      return promptToPlanAiResponseSchema.parse({
        schemaVersion: "plan-generation-response-v1",
        status: "needs_clarification",
        planDraft: null,
        clarificationRequest: specification.clarificationQuestions
          .map((question) => question.question)
          .join(" "),
        warnings: specification.warnings
      });
    }

    const mapping = mapPlanningSpecificationToPlanDraft(specification);

    if (!mapping.ok) {
      throw new Error(`Mock planning-to-draft mapping failed: ${mapping.issues.join(" ")}`);
    }

    return promptToPlanAiResponseSchema.parse({
      schemaVersion: "plan-generation-response-v1",
      status: "ok",
      planDraft: mapping.draft,
      clarificationRequest: null,
      warnings: mapping.warnings
    });
  }

  async editPlan(request: ChatEditRequest): Promise<ChatEditResponse> {
    return classifyMockChatEdit({
      message: request.message,
      currentPlan: request.currentPlan
    }).response;
  }
}

export const mockAiPlannerProvider = new MockAiPlannerProvider();
