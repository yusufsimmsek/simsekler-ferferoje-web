import type {
  AiPlannerProvider,
  ChatEditRequest,
  ChatEditResponse,
  PlanGenerationRequest,
  PlanGenerationResponse
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
  normalizeChatEditResponse
} from "./openai-provider";
import {
  createPlanningFixture,
  mapPlanningSpecificationToPlanDraft,
  normalizePlanningSpecification,
  PlanningProviderValidationError,
  validatePlanningSpecification
} from "@/lib/planning";
import type { PlanningSpecification } from "@/lib/planning";
import { promptToPlanAiResponseSchema } from "@/lib/schemas/ai-contracts.schema";

export const defaultOllamaBaseUrl = "http://127.0.0.1:11434";
export const defaultLocalOpenAiCompatibleBaseUrl = "http://127.0.0.1:1234/v1";
export const defaultOllamaModel = "llama3.1:8b";
export const defaultLmStudioModel = "local-model";
export const defaultLocalLlmTimeoutMs = 120000;

export type LocalLlmFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export type LocalPlannerProviderOptions = {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  fetcher?: LocalLlmFetch;
};

type StructuredJsonRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  refusalPayload: (refusal: string) => unknown;
};

type OpenAiCompatibleChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }>;
};

type OllamaGenerateResponse = {
  response?: string;
  error?: string;
};

abstract class LocalStructuredPlannerProvider implements AiPlannerProvider {
  protected readonly baseUrl: string;
  protected readonly model: string;
  protected readonly timeoutMs: number;
  protected readonly fetcher: LocalLlmFetch;
  protected abstract readonly providerLabel: string;

  constructor(options: LocalPlannerProviderOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? defaultLocalLlmTimeoutMs;
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
          title: "Refused Local Planning Request",
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
        `${this.providerLabel} planning output failed PlanningSpecification validation.`,
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

  protected abstract requestStructuredJson(input: StructuredJsonRequest): Promise<unknown>;

  protected createTimeoutSignal() {
    if (this.timeoutMs <= 0 || typeof AbortController === "undefined") {
      return {
        signal: undefined,
        clear: () => undefined
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    return {
      signal: controller.signal,
      clear: () => clearTimeout(timer)
    };
  }
}

export class OllamaPlannerProvider extends LocalStructuredPlannerProvider {
  protected readonly providerLabel = "Ollama";

  async requestStructuredJson(input: StructuredJsonRequest) {
    const timeout = this.createTimeoutSignal();
    let response: Awaited<ReturnType<LocalLlmFetch>>;

    try {
      response = await this.fetcher(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: timeout.signal,
        body: JSON.stringify({
          model: this.model,
          system: input.systemPrompt,
          prompt: [
            input.userPrompt,
            "Respond with JSON only. Do not include markdown or commentary."
          ].join("\n"),
          stream: false,
          format: input.schema,
          options: {
            temperature: 0
          }
        })
      });
    } catch (error) {
      throw new Error(`${this.providerLabel} request failed: ${getErrorMessage(error)}`);
    } finally {
      timeout.clear();
    }

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`${this.providerLabel} request failed with HTTP ${response.status}.`);
    }

    const parsed = parseJson(raw, `${this.providerLabel} response was not valid JSON.`) as OllamaGenerateResponse;

    if (parsed.error) {
      throw new Error(`${this.providerLabel} returned an error: ${parsed.error}`);
    }

    if (typeof parsed.response !== "string" || !parsed.response.trim()) {
      throw new Error(`${this.providerLabel} response did not include JSON content.`);
    }

    return parseJson(
      parsed.response,
      `${this.providerLabel} structured content was not valid JSON.`
    );
  }
}

export class OpenAiCompatibleLocalPlannerProvider extends LocalStructuredPlannerProvider {
  protected readonly providerLabel: string;

  constructor(
    options: LocalPlannerProviderOptions & {
      providerLabel?: string;
    }
  ) {
    super(options);
    this.providerLabel = options.providerLabel ?? "OpenAI-compatible local provider";
  }

  async requestStructuredJson(input: StructuredJsonRequest) {
    const timeout = this.createTimeoutSignal();
    let response: Awaited<ReturnType<LocalLlmFetch>>;

    try {
      response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: timeout.signal,
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
          stream: false,
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
    } catch (error) {
      throw new Error(`${this.providerLabel} request failed: ${getErrorMessage(error)}`);
    } finally {
      timeout.clear();
    }

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`${this.providerLabel} request failed with HTTP ${response.status}.`);
    }

    const parsed = parseJson(
      raw,
      `${this.providerLabel} response was not valid JSON.`
    ) as OpenAiCompatibleChatCompletionResponse;
    const message = parsed.choices?.[0]?.message;

    if (message?.refusal) {
      return input.refusalPayload(message.refusal);
    }

    if (!message?.content) {
      throw new Error(`${this.providerLabel} response did not include message content.`);
    }

    return parseJson(
      message.content,
      `${this.providerLabel} structured content was not valid JSON.`
    );
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function parseJson(value: string, message: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(message);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown local provider failure.";
}
