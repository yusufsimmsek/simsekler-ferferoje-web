import type {
  ChatEditRequest,
  ChatEditResponse,
  PlanGenerationRequest,
  PlanGenerationResponse,
  AiPlannerProvider
} from "./provider";
import {
  chatEditResponseJsonSchema,
  planningSpecificationJsonSchema
} from "./openai-json-schemas";
import {
  buildChatEditUserPrompt,
  buildPlanGenerationUserPrompt,
  openAiChatEditSystemPrompt,
  openAiPlanGenerationSystemPrompt
} from "./openai-prompts";
import {
  createPlanningFixture,
  mapPlanningSpecificationToPlanDraft,
  normalizePlanningSpecification,
  PlanningProviderValidationError,
  validatePlanningSpecification
} from "@/lib/planning";
import type { PlanningSpecification } from "@/lib/planning";
import { promptToPlanAiResponseSchema } from "@/lib/schemas/ai-contracts.schema";

export const defaultOpenAiModel = "gpt-4.1-mini";

export type OpenAiFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export type OpenAiPlannerProviderOptions = {
  apiKey: string;
  model?: string;
  fetcher?: OpenAiFetch;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }>;
};

export class OpenAiPlannerProvider implements AiPlannerProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: OpenAiFetch;

  constructor(options: OpenAiPlannerProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? defaultOpenAiModel;
    this.fetcher = options.fetcher ?? fetch;
  }

  async createPlanningSpecification(
    request: PlanGenerationRequest
  ): Promise<PlanningSpecification> {
    const payload = await this.requestStructuredJson({
      schemaName: "floor_plan_planning_specification",
      schema: planningSpecificationJsonSchema,
      systemPrompt: openAiPlanGenerationSystemPrompt,
      userPrompt: buildPlanGenerationUserPrompt({
        prompt: request.prompt,
        maxRooms: request.preferences.maxRooms
      }),
      refusalPayload: (refusal) => ({
        ...createPlanningFixture({
          title: "Refused Planning Request",
          targetArea: null,
          buildingType: "unsupported",
          classification: "unknown",
          unsupportedRequests: [
            {
              code: "other",
              message: refusal
            }
          ],
          warnings: [refusal],
          confidenceScore: 1
        })
      })
    });
    const validation = validatePlanningSpecification(payload);

    if (!validation.ok) {
      throw new PlanningProviderValidationError(
        "OpenAI planning output failed PlanningSpecification validation.",
        validation.issues
      );
    }

    return normalizePlanningSpecification(validation.data);
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
      throw new Error(`Planning-to-draft mapping failed: ${mapping.issues.join(" ")}`);
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
    const payload = await this.requestStructuredJson({
      schemaName: "floor_plan_chat_edit_response",
      schema: chatEditResponseJsonSchema,
      systemPrompt: openAiChatEditSystemPrompt,
      userPrompt: buildChatEditUserPrompt({
        message: request.message,
        currentPlan: request.currentPlan
      }),
      refusalPayload: (refusal) => ({
        schemaVersion: "chat-edit-response-v1",
        status: "refused",
        actions: [],
        requiresRelayout: false,
        clarificationRequest: null,
        userFacingSummary: refusal
      })
    });

    return normalizeChatEditResponse(payload) as ChatEditResponse;
  }

  private async requestStructuredJson(input: {
    schemaName: string;
    schema: Record<string, unknown>;
    systemPrompt: string;
    userPrompt: string;
    refusalPayload: (refusal: string) => unknown;
  }) {
    const response = await this.fetcher("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: input.systemPrompt
          },
          {
            role: "user",
            content: input.userPrompt
          }
        ],
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.schemaName,
            strict: true,
            schema: input.schema
          }
        }
      })
    });

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`OpenAI request failed with HTTP ${response.status}.`);
    }

    const parsed = parseJson(raw) as OpenAiChatCompletionResponse;
    const message = parsed.choices?.[0]?.message;

    if (message?.refusal) {
      return input.refusalPayload(message.refusal);
    }

    if (!message?.content) {
      throw new Error("OpenAI response did not include message content.");
    }

    return parseJson(message.content);
  }
}

export function normalizePromptToPlanResponse(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const response = structuredClone(value) as {
    planDraft?: {
      rooms?: Array<Record<string, unknown>>;
      openings?: Array<Record<string, unknown>>;
    } | null;
  };

  response.planDraft?.rooms?.forEach((room) => {
    removeNullishOptional(room, "targetArea");
    removeNullishOptional(room, "targetWidth");
    removeNullishOptional(room, "targetHeight");
  });

  response.planDraft?.openings?.forEach((opening) => {
    removeNullishOptional(opening, "connectedRoomId");
    removeNullishOptional(opening, "preferredEdge");
  });

  return response;
}

export function normalizeChatEditResponse(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const response = structuredClone(value) as {
    actions?: Array<{
      type?: string;
      params?: Record<string, unknown>;
    }>;
  };

  response.actions?.forEach((action) => {
    if (action.type === "add_room") {
      const room = action.params?.room;

      if (room && typeof room === "object") {
        removeNullishOptional(room as Record<string, unknown>, "targetArea");
        removeNullishOptional(room as Record<string, unknown>, "targetWidth");
        removeNullishOptional(room as Record<string, unknown>, "targetHeight");
      }

      removeNullishOptional(action.params ?? {}, "adjacency");
    }

    if (action.type === "resize_room") {
      removeNullishOptional(action.params ?? {}, "lockAdjacentRooms");
    }
  });

  return response;
}

function removeNullishOptional(value: Record<string, unknown>, key: string) {
  if (value[key] === null || value[key] === undefined) {
    delete value[key];
  }
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }
}
