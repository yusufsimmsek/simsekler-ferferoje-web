import type { AiProviderName } from "./config";
import type { ValidationIssue, ValidationStatus } from "@/lib/floor-plan/types";

export const aiObservabilitySchemaVersion = "ai-observability-v1" as const;
export const aiFailureSnapshotSchemaVersion = "ai-failure-snapshot-v1" as const;

export type AiRequestType = "prompt_to_plan" | "chat_edit";

export type AiProviderMetadata = {
  schemaVersion: typeof aiObservabilitySchemaVersion;
  provider: AiProviderName;
  model: string | null;
  mode: string;
  requestType: AiRequestType;
  latencyMs: number | null;
  contractSchemaVersion: string;
  validationStatus: ValidationStatus | "not_applicable";
  errorCode: string | null;
  promptPreview?: string;
};

export type AiObservableEvent = AiProviderMetadata & {
  source: "ai-planner";
  observedAt: string;
};

export type AiFailureSnapshot = {
  schemaVersion: typeof aiFailureSnapshotSchemaVersion;
  metadata: AiProviderMetadata;
  promptPreview?: string;
  issues: Array<{
    id: string;
    severity: ValidationIssue["severity"];
    code: string;
    message: string;
    path?: Array<string | number>;
    targetId?: string;
  }>;
  warnings: string[];
};

export type AiObservabilityLogger = (line: string) => void;

const redacted = "[REDACTED]";

const secretPatterns = [
  {
    pattern: /sk-proj-[A-Za-z0-9_-]+/g,
    replacement: redacted
  },
  {
    pattern: /sk-[A-Za-z0-9_-]{12,}/g,
    replacement: redacted
  },
  {
    pattern: /(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi,
    replacement: `$1${redacted}`
  },
  {
    pattern: /(OPENAI_API_KEY\s*=\s*)[^\s"']+/gi,
    replacement: `$1${redacted}`
  },
  {
    pattern: /(api[_-]?key\s*[:=]\s*)[^\s,"']+/gi,
    replacement: `$1${redacted}`
  }
];

const sensitiveKeyPattern = /(api[_-]?key|authorization|bearer|token|secret|password)/i;

export function createAiProviderMetadata(input: {
  provider: AiProviderName;
  model: string | null;
  mode: string;
  requestType: AiRequestType;
  latencyMs?: number | null;
  contractSchemaVersion: string;
  validationStatus: ValidationStatus | "not_applicable";
  errorCode?: string | null;
  prompt?: string;
  includePromptPreview?: boolean;
}): AiProviderMetadata {
  const promptPreview =
    input.includePromptPreview && input.prompt
      ? createSafePromptPreview(input.prompt)
      : undefined;

  return {
    schemaVersion: aiObservabilitySchemaVersion,
    provider: input.provider,
    model: input.model,
    mode: input.mode,
    requestType: input.requestType,
    latencyMs: input.latencyMs ?? null,
    contractSchemaVersion: input.contractSchemaVersion,
    validationStatus: input.validationStatus,
    errorCode: input.errorCode ?? null,
    ...(promptPreview ? { promptPreview } : {})
  };
}

export function createSafePromptPreview(value: unknown, maxLength = 96) {
  if (typeof value !== "string") return undefined;

  const compact = redactSecrets(value).replace(/\s+/g, " ").trim();

  if (!compact) return undefined;
  if (compact.length <= maxLength) return compact;

  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function redactSecrets(value: string) {
  return secretPatterns.reduce(
    (result, item) => result.replace(item.pattern, item.replacement),
    value
  );
}

export function redactObservableValue(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactObservableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? redacted : redactObservableValue(nestedValue)
      ])
    );
  }

  return value;
}

export function createAiFailureSnapshot(input: {
  metadata: AiProviderMetadata;
  prompt?: string;
  issues?: ValidationIssue[];
  warnings?: string[];
}): AiFailureSnapshot {
  const promptPreview =
    createSafePromptPreview(input.prompt) ?? input.metadata.promptPreview;
  const metadata = redactObservableValue(input.metadata) as AiProviderMetadata;

  return {
    schemaVersion: aiFailureSnapshotSchemaVersion,
    metadata,
    ...(promptPreview ? { promptPreview } : {}),
    issues: (input.issues ?? []).map((issue) => ({
      id: issue.id,
      severity: issue.severity,
      code: issue.code,
      message: redactSecrets(issue.message),
      path: issue.path,
      targetId: issue.targetId
    })),
    warnings: (input.warnings ?? []).map((warning) => redactSecrets(warning))
  };
}

export function logAiProviderEvent(
  metadata: AiProviderMetadata,
  options: {
    enabled?: boolean;
    env?: Record<string, string | undefined>;
    logger?: AiObservabilityLogger;
    observedAt?: string;
  } = {}
) {
  const enabled =
    options.enabled ??
    (options.env?.AI_OBSERVABILITY_LOGS ?? process.env.AI_OBSERVABILITY_LOGS) === "true";

  if (!enabled) return;

  const event: AiObservableEvent = {
    ...metadata,
    source: "ai-planner",
    observedAt: options.observedAt ?? new Date().toISOString()
  };
  const safeEvent = redactObservableValue(event);
  const logger = options.logger ?? console.info;

  logger(`[ai-observability] ${JSON.stringify(safeEvent)}`);
}
