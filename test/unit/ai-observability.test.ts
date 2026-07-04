import { describe, expect, it } from "vitest";
import {
  createAiFailureSnapshot,
  createAiProviderMetadata,
  createSafePromptPreview,
  logAiProviderEvent,
  redactObservableValue,
  redactSecrets
} from "@/lib/ai-planner/observability";
import type { ValidationIssue } from "@/lib/floor-plan/types";

describe("AI observability redaction", () => {
  it("redacts OpenAI keys and bearer tokens from strings", () => {
    const redacted = redactSecrets(
      "OPENAI_API_KEY=sk-proj-secret123456789 Bearer sk-testsecret123456789"
    );

    expect(redacted).toContain("OPENAI_API_KEY=[REDACTED]");
    expect(redacted).toContain("Bearer [REDACTED]");
    expect(redacted).not.toContain("sk-proj-secret");
    expect(redacted).not.toContain("sk-testsecret");
  });

  it("redacts sensitive object keys recursively", () => {
    const safe = redactObservableValue({
      apiKey: "sk-testsecret123456789",
      nested: {
        Authorization: "Bearer sk-testsecret123456789",
        prompt: "Create a 2+1 apartment."
      }
    }) as Record<string, unknown>;

    expect(safe.apiKey).toBe("[REDACTED]");
    expect(safe).not.toMatchObject({
      nested: {
        Authorization: "Bearer sk-testsecret123456789"
      }
    });
    expect(JSON.stringify(safe)).not.toContain("sk-testsecret");
  });

  it("creates a short redacted prompt preview", () => {
    const preview = createSafePromptPreview(
      "Create a 3+1 apartment. OPENAI_API_KEY=sk-proj-secret123456789 Add a large balcony.",
      80
    );

    expect(preview).toContain("[REDACTED]");
    expect(preview?.length).toBeLessThanOrEqual(80);
    expect(preview).not.toContain("sk-proj-secret");
  });

  it("captures safe failure snapshots without secret leakage", () => {
    const issue: ValidationIssue = {
      id: "issue_test",
      severity: "critical",
      code: "AI_SCHEMA_MISMATCH",
      message: "Invalid output with sk-proj-secret123456789",
      path: ["planDraft"]
    };
    const metadata = createAiProviderMetadata({
      provider: "openai",
      model: "gpt-test",
      mode: "openai",
      requestType: "prompt_to_plan",
      latencyMs: 12,
      contractSchemaVersion: "plan-generation-response-v1",
      validationStatus: "invalid",
      errorCode: "AI_SCHEMA_MISMATCH",
      prompt: "Create a 1+1 apartment with sk-proj-secret123456789",
      includePromptPreview: true
    });
    const snapshot = createAiFailureSnapshot({
      metadata,
      prompt: "Create a 1+1 apartment with sk-proj-secret123456789",
      issues: [issue],
      warnings: ["Warning mentions sk-proj-secret123456789"]
    });
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.schemaVersion).toBe("ai-failure-snapshot-v1");
    expect(snapshot.issues[0].message).toContain("[REDACTED]");
    expect(serialized).not.toContain("sk-proj-secret");
  });

  it("logs structured metadata only when enabled", () => {
    const lines: string[] = [];
    const metadata = createAiProviderMetadata({
      provider: "mock",
      model: null,
      mode: "mock_default",
      requestType: "chat_edit",
      latencyMs: 3,
      contractSchemaVersion: "chat-edit-response-v1",
      validationStatus: "valid",
      errorCode: null,
      prompt: "Rename Bedroom 3 to Office.",
      includePromptPreview: true
    });

    logAiProviderEvent(metadata, {
      enabled: false,
      logger: (line) => lines.push(line)
    });
    expect(lines).toHaveLength(0);

    logAiProviderEvent(metadata, {
      enabled: true,
      observedAt: "2026-06-19T00:00:00.000Z",
      logger: (line) => lines.push(line)
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("[ai-observability]");
    expect(lines[0]).toContain("\"requestType\":\"chat_edit\"");
    expect(lines[0]).not.toContain("OPENAI_API_KEY");
  });
});
