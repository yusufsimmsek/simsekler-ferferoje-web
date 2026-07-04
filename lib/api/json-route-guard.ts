import type { ValidationIssue, ValidationSummary } from "@/lib/floor-plan/types";

export const jsonRouteMaxBodyBytes = 256 * 1024;

export type JsonRouteRequestErrorCode =
  | "UNSUPPORTED_MEDIA_TYPE"
  | "REQUEST_BODY_TOO_LARGE"
  | "INVALID_JSON_BODY"
  | "REQUEST_BODY_UNREADABLE";

export type PublicApiErrorBody = {
  ok: false;
  code: string;
  message: string;
  requestId: string;
  retryable: boolean;
  validation: ValidationSummary;
  issues: ValidationIssue[];
  warnings: string[];
};

export type JsonRequestResult =
  | {
      ok: true;
      body: unknown;
    }
  | {
      ok: false;
      status: number;
      body: PublicApiErrorBody;
    };

export async function readJsonRequest(
  request: Request,
  options: {
    requestId?: string;
    maxBytes?: number;
  } = {}
): Promise<JsonRequestResult> {
  const requestId = options.requestId ?? createApiRequestId();
  const maxBytes = options.maxBytes ?? jsonRouteMaxBodyBytes;
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return requestError({
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Request body must be sent as application/json.",
      requestId,
      retryable: false
    });
  }

  const contentLength = parseContentLength(request.headers.get("content-length"));

  if (contentLength !== null && contentLength > maxBytes) {
    return requestError({
      status: 413,
      code: "REQUEST_BODY_TOO_LARGE",
      message: `Request body must be ${maxBytes} bytes or smaller.`,
      requestId,
      retryable: false
    });
  }

  let rawBody: string;

  try {
    rawBody = await readTextWithLimit(request, maxBytes);
  } catch (error) {
    return requestError({
      status: error instanceof RequestBodyTooLargeError ? 413 : 400,
      code:
        error instanceof RequestBodyTooLargeError
          ? "REQUEST_BODY_TOO_LARGE"
          : "REQUEST_BODY_UNREADABLE",
      message:
        error instanceof RequestBodyTooLargeError
          ? `Request body must be ${maxBytes} bytes or smaller.`
          : "Request body could not be read safely.",
      requestId,
      retryable: false
    });
  }

  try {
    return {
      ok: true,
      body: JSON.parse(rawBody)
    };
  } catch {
    return requestError({
      status: 400,
      code: "INVALID_JSON_BODY",
      message: "Request body must be valid JSON.",
      requestId,
      retryable: true
    });
  }
}

export function createApiRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function requestError(input: {
  status: number;
  code: JsonRouteRequestErrorCode;
  message: string;
  requestId: string;
  retryable: boolean;
}): JsonRequestResult {
  const issue: ValidationIssue = {
    id: `issue_${input.code.toLowerCase()}`,
    severity: "critical",
    code: input.code,
    message: input.message
  };

  return {
    ok: false,
    status: input.status,
    body: {
      ok: false,
      code: input.code,
      message: input.message,
      requestId: input.requestId,
      retryable: input.retryable,
      validation: {
        status: "invalid",
        issues: [issue]
      },
      issues: [issue],
      warnings: []
    }
  };
}

function parseContentLength(value: string | null) {
  if (!value) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readTextWithLimit(request: Request, maxBytes: number) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let result = "";

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) break;

    totalBytes += chunk.value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyTooLargeError();
    }

    result += decoder.decode(chunk.value, { stream: true });
  }

  result += decoder.decode();

  return result;
}

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeded the configured limit.");
    this.name = "RequestBodyTooLargeError";
  }
}
