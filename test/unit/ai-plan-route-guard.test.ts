import { describe, expect, it } from "vitest";
import { POST as editPlan } from "@/app/api/plan/edit/route";
import { POST as generatePlan } from "@/app/api/plan/generate/route";
import {
  readAiPlanJsonRequest,
  toPublicAiPlanErrorBody
} from "@/lib/api/ai-plan-route-guard";

describe("AI plan route guard", () => {
  it("rejects non-JSON requests before workflow execution", async () => {
    const response = await generatePlan(
      new Request("http://test.local/api/plan/generate", {
        method: "POST",
        headers: {
          "content-type": "text/plain"
        },
        body: "not json"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body).toMatchObject({
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      retryable: false
    });
    expect(body).toHaveProperty("requestId");
    expect(body).not.toHaveProperty("developerMessage");
  });

  it("rejects malformed JSON before workflow execution", async () => {
    const response = await editPlan(
      new Request("http://test.local/api/plan/edit", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: "{"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      code: "INVALID_JSON_BODY",
      retryable: true
    });
    expect(body).not.toHaveProperty("developerMessage");
  });

  it("rejects oversized streamed request bodies", async () => {
    const oversizedBody = JSON.stringify({
      payload: "x".repeat(32)
    });
    const result = await readAiPlanJsonRequest(
      new Request("http://test.local/api/plan/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: oversizedBody
      }),
      {
        requestId: "req_test",
        maxBytes: 12
      }
    );

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.status).toBe(413);
      expect(result.body).toMatchObject({
        ok: false,
        code: "REQUEST_BODY_TOO_LARGE",
        requestId: "req_test",
        retryable: false
      });
      expect(result.body).not.toHaveProperty("developerMessage");
    }
  });

  it("strips developer diagnostics from workflow errors returned by routes", async () => {
    const response = await generatePlan(
      new Request("http://test.local/api/plan/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      code: "INVALID_GENERATE_REQUEST",
      message: "Generate plan request must include a non-empty prompt and MVP preferences."
    });
    expect(body).toHaveProperty("requestId");
    expect(body).not.toHaveProperty("developerMessage");
    expect(body.issues[0].message).toBe(body.message);
  });

  it("converts workflow errors into public-safe API error bodies", () => {
    const publicBody = toPublicAiPlanErrorBody(
      {
        ok: false,
        code: "AI_PROVIDER_FAILED",
        message: "Plan generation failed before a valid response was produced.",
        developerMessage: "connect ECONNREFUSED 127.0.0.1:11434",
        retryable: true,
        validation: {
          status: "invalid",
          issues: [
            {
              id: "issue_ai_provider_failed",
              severity: "critical",
              code: "AI_PROVIDER_FAILED",
              message: "connect ECONNREFUSED 127.0.0.1:11434"
            }
          ]
        },
        issues: [
          {
            id: "issue_ai_provider_failed",
            severity: "critical",
            code: "AI_PROVIDER_FAILED",
            message: "connect ECONNREFUSED 127.0.0.1:11434"
          }
        ],
        warnings: []
      },
      "req_public"
    );

    expect(publicBody).toEqual({
      ok: false,
      code: "AI_PROVIDER_FAILED",
      message: "Plan generation failed before a valid response was produced.",
      requestId: "req_public",
      retryable: true,
      validation: {
        status: "invalid",
        issues: [
          {
            id: "issue_ai_provider_failed",
            severity: "critical",
            code: "AI_PROVIDER_FAILED",
            message: "Plan generation failed before a valid response was produced."
          }
        ]
      },
      issues: [
        {
          id: "issue_ai_provider_failed",
          severity: "critical",
          code: "AI_PROVIDER_FAILED",
          message: "Plan generation failed before a valid response was produced."
        }
      ],
      warnings: []
    });
  });
});
