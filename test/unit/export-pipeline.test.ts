import { describe, expect, it } from "vitest";
import { createPdfExport } from "@/lib/export/pdf";
import { createPngExport } from "@/lib/export/png";
import { createRoomSummary } from "@/lib/export/service";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";

describe("export pipeline", () => {
  it("validates PNG export requests and returns a stable SVG payload", () => {
    const result = createPngExport(pngRequest());

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.code).toBe("PNG_EXPORT_READY");
      expect(result.delivery).toBe("client_png_from_svg");
      expect(result.filename).toMatch(/\.png$/);
      expect(result.svg).toContain("data-render-layer=\"rooms\"");
      expect(result.svg).toContain(mockFloorPlan.metadata.disclaimer);
    }
  });

  it("validates PDF export requests and returns deterministic PDF bytes", () => {
    const first = createPdfExport(pdfRequest());
    const second = createPdfExport(pdfRequest());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    if (first.ok && second.ok) {
      const firstText = Buffer.from(first.bytes).toString("latin1");
      const secondText = Buffer.from(second.bytes).toString("latin1");

      expect(first.code).toBe("PDF_EXPORT_READY");
      expect(first.filename).toMatch(/\.pdf$/);
      expect(firstText.startsWith("%PDF-1.4")).toBe(true);
      expect(firstText).toContain(mockFloorPlan.title);
      expect(firstText).toContain(mockFloorPlan.metadata.disclaimer);
      expect(firstText).toContain("Room Summary");
      expect(firstText).toBe(secondText);
    }
  });

  it("rejects invalid PNG export request contracts", () => {
    const result = createPngExport({
      ...pngRequest(),
      settings: {
        includeRoomLabels: true,
        includeDimensions: true,
        includeDisclaimer: false,
        resolution: "standard"
      }
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.code).toBe("INVALID_EXPORT_REQUEST");
      expect(result.issues.some((issue) => issue.path?.includes("includeDisclaimer"))).toBe(true);
    }
  });

  it("rejects invalid PDF export request contracts", () => {
    const result = createPdfExport({
      ...pdfRequest(),
      settings: {
        includeRoomLabels: true,
        includeDimensions: true,
        includeDisclaimer: true,
        pageSize: "letter",
        orientation: "portrait",
        includeRoomSchedule: true,
        includeWarnings: true
      }
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.code).toBe("INVALID_EXPORT_REQUEST");
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("blocks export when the plan validation summary is critical", () => {
    const invalidPlan = structuredClone(mockFloorPlan);
    invalidPlan.validation = {
      status: "invalid",
      issues: [
        {
          id: "issue_export_blocked",
          severity: "critical",
          code: "CRITICAL_TEST_ISSUE",
          message: "Critical test issue blocks export."
        }
      ]
    };

    const result = createPdfExport(pdfRequest(invalidPlan));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.code).toBe("EXPORT_INVALID_PLAN");
      expect(result.message).toContain("critical validation");
    }
  });

  it("generates room summary data for exports", () => {
    const summary = createRoomSummary(mockFloorPlan);

    expect(summary).toHaveLength(mockFloorPlan.rooms.length);
    expect(summary[0]).toMatchObject({
      id: mockFloorPlan.rooms[0].id,
      name: mockFloorPlan.rooms[0].name
    });
    expect(summary[0].dimensions).toContain("m");
  });
});

function pngRequest(plan = mockFloorPlan) {
  return {
    schemaVersion: "export-request-v1",
    format: "png",
    plan,
    settings: {
      includeRoomLabels: true,
      includeDimensions: true,
      includeDisclaimer: true,
      resolution: "standard"
    }
  };
}

function pdfRequest(plan = mockFloorPlan) {
  return {
    schemaVersion: "export-request-v1",
    format: "pdf",
    plan,
    settings: {
      includeRoomLabels: true,
      includeDimensions: true,
      includeDisclaimer: true,
      pageSize: "a4",
      orientation: "landscape",
      includeRoomSchedule: true,
      includeWarnings: true
    }
  };
}
