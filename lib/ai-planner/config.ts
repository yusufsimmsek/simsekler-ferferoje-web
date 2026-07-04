import type { AiPlannerProvider } from "./provider";
import { mockAiPlannerProvider } from "./mock-provider";
import {
  defaultLmStudioModel,
  defaultLocalLlmTimeoutMs,
  defaultLocalOpenAiCompatibleBaseUrl,
  defaultOllamaBaseUrl,
  defaultOllamaModel,
  OllamaPlannerProvider,
  OpenAiCompatibleLocalPlannerProvider
} from "./local-provider";
import { defaultOpenAiModel, OpenAiPlannerProvider } from "./openai-provider";

export type AiProviderName =
  | "mock"
  | "ollama"
  | "lmstudio"
  | "openai-compatible-local"
  | "openai";

export type AiProviderSelection = {
  provider: AiPlannerProvider;
  providerName: AiProviderName;
  model: string | null;
  mode:
    | "mock_default"
    | "mock_missing_key"
    | "ollama"
    | "lmstudio"
    | "openai_compatible_local"
    | "openai";
  validation: AiProviderEnvValidation;
};

export type AiProviderEnv = {
  AI_PROVIDER?: string;
  LOCAL_LLM_BASE_URL?: string;
  LOCAL_LLM_MODEL?: string;
  LOCAL_LLM_TIMEOUT_MS?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  AI_OBSERVABILITY_LOGS?: string;
} & Record<string, string | undefined>;

export type AiProviderEnvValidationIssue = {
  code:
    | "INVALID_AI_PROVIDER"
    | "LOCAL_LLM_BASE_URL_DEFAULTED"
    | "LOCAL_LLM_MODEL_DEFAULTED"
    | "INVALID_LOCAL_LLM_TIMEOUT_MS"
    | "OPENAI_KEY_MISSING"
    | "OPENAI_MODEL_DEFAULTED"
    | "INVALID_AI_OBSERVABILITY_LOGS";
  severity: "warning";
  message: string;
};

export type AiProviderEnvValidation = {
  requestedProvider: AiProviderName;
  effectiveProvider: AiProviderName;
  model: string;
  localBaseUrl: string | null;
  localTimeoutMs: number;
  openAiApiKeyPresent: boolean;
  observabilityLogs: boolean;
  issues: AiProviderEnvValidationIssue[];
};

export function selectAiPlannerProvider(
  env: AiProviderEnv = process.env
): AiProviderSelection {
  const validation = validateAiProviderEnv(env);
  const apiKey = env.OPENAI_API_KEY?.trim();

  if (validation.effectiveProvider === "mock") {
    return {
      provider: mockAiPlannerProvider,
      providerName: "mock",
      model: null,
      mode: validation.requestedProvider === "openai" ? "mock_missing_key" : "mock_default",
      validation
    };
  }

  if (validation.effectiveProvider === "ollama") {
    return {
      provider: new OllamaPlannerProvider({
        baseUrl: validation.localBaseUrl ?? defaultOllamaBaseUrl,
        model: validation.model,
        timeoutMs: validation.localTimeoutMs
      }),
      providerName: "ollama",
      model: validation.model,
      mode: "ollama",
      validation
    };
  }

  if (validation.effectiveProvider === "lmstudio") {
    return {
      provider: new OpenAiCompatibleLocalPlannerProvider({
        baseUrl: validation.localBaseUrl ?? defaultLocalOpenAiCompatibleBaseUrl,
        model: validation.model,
        timeoutMs: validation.localTimeoutMs,
        providerLabel: "LM Studio"
      }),
      providerName: "lmstudio",
      model: validation.model,
      mode: "lmstudio",
      validation
    };
  }

  if (validation.effectiveProvider === "openai-compatible-local") {
    return {
      provider: new OpenAiCompatibleLocalPlannerProvider({
        baseUrl: validation.localBaseUrl ?? defaultLocalOpenAiCompatibleBaseUrl,
        model: validation.model,
        timeoutMs: validation.localTimeoutMs
      }),
      providerName: "openai-compatible-local",
      model: validation.model,
      mode: "openai_compatible_local",
      validation
    };
  }

  return {
    provider: new OpenAiPlannerProvider({
      apiKey: apiKey as string,
      model: validation.model
    }),
    providerName: "openai",
    model: validation.model,
    mode: "openai",
    validation
  };
}

export function validateAiProviderEnv(env: AiProviderEnv = process.env): AiProviderEnvValidation {
  const issues: AiProviderEnvValidationIssue[] = [];
  const rawProvider = env.AI_PROVIDER?.trim();
  const requestedProvider = parseProvider(rawProvider, issues);
  const rawApiKey = env.OPENAI_API_KEY?.trim();
  const rawModel = env.OPENAI_MODEL?.trim();
  const localConfig = resolveLocalLlmConfig(env, requestedProvider, issues);
  const model = isLocalProvider(requestedProvider)
    ? localConfig.model
    : rawModel || defaultOpenAiModel;
  const observabilityLogs = parseBooleanFlag(
    env.AI_OBSERVABILITY_LOGS,
    "AI_OBSERVABILITY_LOGS",
    issues
  );
  const openAiApiKeyPresent = Boolean(rawApiKey);
  const effectiveProvider = isLocalProvider(requestedProvider)
    ? requestedProvider
    : requestedProvider === "openai" && openAiApiKeyPresent
      ? "openai"
      : "mock";

  if (requestedProvider === "openai" && !openAiApiKeyPresent) {
    issues.push({
      code: "OPENAI_KEY_MISSING",
      severity: "warning",
      message: "AI_PROVIDER=openai was requested without OPENAI_API_KEY. Falling back to mock mode."
    });
  }

  if (!rawModel && !isLocalProvider(requestedProvider)) {
    issues.push({
      code: "OPENAI_MODEL_DEFAULTED",
      severity: "warning",
      message: `OPENAI_MODEL was not set. Using ${defaultOpenAiModel}.`
    });
  }

  return {
    requestedProvider,
    effectiveProvider,
    model,
    localBaseUrl: localConfig.baseUrl,
    localTimeoutMs: localConfig.timeoutMs,
    openAiApiKeyPresent,
    observabilityLogs,
    issues
  };
}

function parseProvider(
  value: string | undefined,
  issues: AiProviderEnvValidationIssue[]
): AiProviderName {
  if (!value || value === "mock") return "mock";
  if (value === "ollama") return "ollama";
  if (value === "lmstudio") return "lmstudio";
  if (value === "openai-compatible-local") return "openai-compatible-local";
  if (value === "openai") return "openai";

  issues.push({
    code: "INVALID_AI_PROVIDER",
    severity: "warning",
    message:
      `AI_PROVIDER must be "mock", "ollama", "lmstudio", "openai-compatible-local", or "openai"; received "${value}". Falling back to mock mode.`
  });

  return "mock";
}

function isLocalProvider(provider: AiProviderName) {
  return (
    provider === "ollama" ||
    provider === "lmstudio" ||
    provider === "openai-compatible-local"
  );
}

function resolveLocalLlmConfig(
  env: AiProviderEnv,
  provider: AiProviderName,
  issues: AiProviderEnvValidationIssue[]
) {
  const defaultBaseUrl =
    provider === "ollama"
      ? defaultOllamaBaseUrl
      : defaultLocalOpenAiCompatibleBaseUrl;
  const defaultModel = provider === "ollama" ? defaultOllamaModel : defaultLmStudioModel;
  const rawBaseUrl = env.LOCAL_LLM_BASE_URL?.trim();
  const rawModel = env.LOCAL_LLM_MODEL?.trim();

  if (isLocalProvider(provider) && !rawBaseUrl) {
    issues.push({
      code: "LOCAL_LLM_BASE_URL_DEFAULTED",
      severity: "warning",
      message: `LOCAL_LLM_BASE_URL was not set. Using ${defaultBaseUrl}.`
    });
  }

  if (isLocalProvider(provider) && !rawModel) {
    issues.push({
      code: "LOCAL_LLM_MODEL_DEFAULTED",
      severity: "warning",
      message: `LOCAL_LLM_MODEL was not set. Using ${defaultModel}.`
    });
  }

  return {
    baseUrl: isLocalProvider(provider) ? rawBaseUrl || defaultBaseUrl : null,
    model: rawModel || defaultModel,
    timeoutMs: parseLocalTimeout(env.LOCAL_LLM_TIMEOUT_MS, issues)
  };
}

function parseLocalTimeout(
  value: string | undefined,
  issues: AiProviderEnvValidationIssue[]
) {
  if (!value?.trim()) return defaultLocalLlmTimeoutMs;

  const parsed = Number(value);

  if (Number.isInteger(parsed) && parsed >= 1000 && parsed <= 600000) {
    return parsed;
  }

  issues.push({
    code: "INVALID_LOCAL_LLM_TIMEOUT_MS",
    severity: "warning",
    message:
      `LOCAL_LLM_TIMEOUT_MS must be an integer between 1000 and 600000; received "${value}". Using ${defaultLocalLlmTimeoutMs}.`
  });

  return defaultLocalLlmTimeoutMs;
}

function parseBooleanFlag(
  value: string | undefined,
  name: string,
  issues: AiProviderEnvValidationIssue[]
) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  issues.push({
    code: "INVALID_AI_OBSERVABILITY_LOGS",
    severity: "warning",
    message: `${name} must be "true" or "false"; received "${value}". Disabling observability logs.`
  });

  return false;
}
