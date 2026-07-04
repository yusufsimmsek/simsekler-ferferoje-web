import type { FloorPlan } from "@/lib/floor-plan/types";
import type {
  ChatEditResponse as ChatEditContractResponse,
  PlanGenerationRequestSchema,
  PromptToPlanAiResponse
} from "@/lib/schemas/ai-contracts.schema";
import type {
  PlanningProviderRequest,
  PlanningProvider
} from "@/lib/planning/planning-provider";
import type { PlanningSpecification } from "@/lib/planning/planning-types";

export type PlanGenerationRequest = PlanGenerationRequestSchema;
export type PlanGenerationResponse = PromptToPlanAiResponse;

export type ChatEditRequest = {
  schemaVersion: "chat-edit-request-v1";
  message: string;
  currentPlan: FloorPlan;
};

export type ChatEditResponse = ChatEditContractResponse;

export type AiPlannerProvider = {
  createPlanningSpecification?: PlanningProvider["createPlanningSpecification"];
  generatePlan(request: PlanGenerationRequest): Promise<PlanGenerationResponse>;
  editPlan(request: ChatEditRequest): Promise<ChatEditResponse>;
};

export type AiPlanningRequest = PlanningProviderRequest;
export type AiPlanningResponse = PlanningSpecification;
