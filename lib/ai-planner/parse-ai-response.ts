import type { ZodType } from "zod";

export type ParseAiResponseResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      code: "AI_INVALID_JSON" | "AI_SCHEMA_MISMATCH";
      message: string;
    };

export function parseAiJsonResponse<T>(
  rawResponse: string,
  schema: ZodType<T>
): ParseAiResponseResult<T> {
  try {
    const parsed: unknown = JSON.parse(rawResponse);
    const result = schema.safeParse(parsed);

    if (!result.success) {
      return {
        ok: false,
        code: "AI_SCHEMA_MISMATCH",
        message: "The AI response did not match the required schema."
      };
    }

    return {
      ok: true,
      data: result.data
    };
  } catch {
    return {
      ok: false,
      code: "AI_INVALID_JSON",
      message: "The AI response was not valid JSON."
    };
  }
}
