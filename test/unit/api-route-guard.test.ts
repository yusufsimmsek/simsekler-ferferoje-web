import { describe, expect, it } from "vitest";
import { POST as exportPdf } from "@/app/api/export/pdf/route";
import { POST as exportPng } from "@/app/api/export/png/route";
import { POST as validatePlan } from "@/app/api/plan/validate/route";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";

describe("shared API route guard", () => {
  it("rejects non-JSON validation requests before schema parsing", async () => {
    const response = await validatePlan(
      new Request("http://test.local/api/plan/validate", {
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
      code: "UNSUPPORTED_MEDIA_TYPE"
    });
    expect(body).toHaveProperty("requestId");
    expect(body).not.toHaveProperty("developerMessage");
  });

  it("adds a request id to validation schema failures", async () => {
    const response = await validatePlan(
      new Request("http://test.local/api/plan/validate", {
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
      code: "FLOOR_PLAN_SCHEMA_MISMATCH"
    });
    expect(body).toHaveProperty("requestId");
    expect(body).not.toHaveProperty("developerMessage");
  });

  it("strips export developer diagnostics from invalid PNG requests", async () => {
    const response = await exportPng(
      new Request("http://test.local/api/export/png", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          schemaVersion: "export-request-v1",
          format: "png",
          plan: mockFloorPlan,
          settings: {
            includeRoomLabels: true,
            includeDimensions: true,
            includeDisclaimer: false,
            resolution: "standard"
          }
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      code: "INVALID_EXPORT_REQUEST",
      format: "png"
    });
    expect(body).toHaveProperty("requestId");
    expect(body).not.toHaveProperty("developerMessage");
    expect(body.issues[0].message).toBe(body.message);
  });

  it("strips export developer diagnostics from invalid PDF requests", async () => {
    const response = await exportPdf(
      new Request("http://test.local/api/export/pdf", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          schemaVersion: "export-request-v1",
          format: "pdf",
          plan: mockFloorPlan,
          settings: {
            includeRoomLabels: true,
            includeDimensions: true,
            includeDisclaimer: true,
            pageSize: "letter",
            orientation: "portrait",
            includeRoomSchedule: true,
            includeWarnings: true
          }
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      code: "INVALID_EXPORT_REQUEST",
      format: "pdf"
    });
    expect(body).toHaveProperty("requestId");
    expect(body).not.toHaveProperty("developerMessage");
    expect(body.issues[0].message).toBe(body.message);
  });
});
