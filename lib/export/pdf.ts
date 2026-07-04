import { pdfExportRequestSchema } from "@/lib/schemas/export.schema";
import { createFloorPlanRenderModel } from "@/lib/render/render-model";
import type { RenderModel, RenderPoint, RenderRect } from "@/lib/render/render-model";
import { pdfRgb, renderPdfLine, renderPdfRect } from "@/lib/render/export-renderer";
import type { PdfExportRequest } from "@/lib/schemas/export.schema";
import type { PdfExportResult, RoomSummaryItem } from "./types";
import {
  createExportFilename,
  createRoomSummary,
  formatNumber,
  requestValidationFailure,
  validateExportPlan
} from "./service";

const pageWidth = 841.89;
const pageHeight = 595.28;
const margin = 36;

export function createPdfExport(input: unknown): PdfExportResult {
  const request = pdfExportRequestSchema.safeParse(input);

  if (!request.success) {
    return requestValidationFailure(request.error, "pdf");
  }

  const planValidation = validateExportPlan(request.data.plan);

  if (!planValidation.ok) {
    return {
      ...planValidation.failure,
      format: "pdf"
    };
  }

  const renderModel = createFloorPlanRenderModel(planValidation.plan, {
    includeGrid: true
  });
  const roomSummary = createRoomSummary(planValidation.plan);
  const bytes = createPdfDocumentBytes({
    renderModel,
    request: request.data,
    roomSummary,
    warnings: planValidation.warnings
  });

  return {
    ok: true,
    code: "PDF_EXPORT_READY",
    format: "pdf",
    delivery: "server_pdf",
    filename: createExportFilename(planValidation.plan, "pdf"),
    mimeType: "application/pdf",
    bytes,
    byteLength: bytes.byteLength,
    disclaimer: planValidation.plan.metadata.disclaimer,
    validation: planValidation.validation,
    warnings: planValidation.warnings,
    roomSummary
  };
}

function createPdfDocumentBytes(input: {
  renderModel: RenderModel;
  request: PdfExportRequest;
  roomSummary: RoomSummaryItem[];
  warnings: string[];
}) {
  const content = createPdfContent(input);
  const contentLength = new TextEncoder().encode(content).byteLength;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(chunks.join("")));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new TextEncoder().encode(chunks.join(""));
}

function createPdfContent(input: {
  renderModel: RenderModel;
  request: PdfExportRequest;
  roomSummary: RoomSummaryItem[];
  warnings: string[];
}) {
  const { renderModel, request, roomSummary, warnings } = input;
  const planBox = {
    x: margin,
    y: 122,
    width: 540,
    height: 390
  };
  const transform = createPdfTransform(renderModel, planBox);
  const lines: string[] = [];

  lines.push(textLine(renderModel.title, margin, pageHeight - 38, 18, "F2", "#101114"));
  lines.push(textLine("AI Floor Plan Generator - conceptual 2D draft", margin, pageHeight - 58, 10, "F1", "#6B7280"));
  lines.push(textLine(`Validation: ${renderModel.validationStatus}`, margin, pageHeight - 74, 10, "F1", "#2563EB"));
  lines.push(`${pdfRgb("#F8FAFC")} rg ${format(planBox.x)} ${format(planBox.y)} ${format(planBox.width)} ${format(planBox.height)} re f\n`);

  renderModel.grid.forEach((line) => {
    lines.push(
      renderPdfLine({
        start: line.start,
        end: line.end,
        transform: transform.point,
        stroke: "#CBD5E1",
        strokeWidth: 0.35
      })
    );
  });

  renderModel.rooms.forEach((room) => {
    lines.push(
      renderPdfRect({
        rect: room.rect,
        transformRect: transform.rect,
        fill: room.fill,
        stroke: "#D1D5DB",
        strokeWidth: 0.75
      })
    );
  });

  renderModel.walls.forEach((wall) => {
    lines.push(
      renderPdfLine({
        start: wall.start,
        end: wall.end,
        transform: transform.point,
        stroke: wall.kind === "exterior" ? "#111827" : "#374151",
        strokeWidth: wall.kind === "exterior" ? 1.25 : 0.85
      })
    );
  });

  renderModel.doors.forEach((door) => {
    lines.push(
      renderPdfLine({
        start: door.start,
        end: door.end,
        transform: transform.point,
        stroke: "#0F766E",
        strokeWidth: 2
      })
    );
  });

  renderModel.windows.forEach((window) => {
    lines.push(
      renderPdfLine({
        start: window.start,
        end: window.end,
        transform: transform.point,
        stroke: "#2563EB",
        strokeWidth: 2
      })
    );
  });

  if (request.settings.includeRoomLabels || request.settings.includeDimensions) {
    renderModel.rooms.forEach((room) => {
      const labelPoint = transform.point(room.labelPoint);

      if (request.settings.includeRoomLabels) {
        lines.push(textLine(room.label, labelPoint.x - 26, labelPoint.y + 4, 7.5, "F2", "#101114"));
      }

      if (request.settings.includeDimensions) {
        lines.push(textLine(`${room.areaLabel} - ${room.dimensionLabel}`, labelPoint.x - 32, labelPoint.y - 8, 6.5, "F1", "#64748B"));
      }
    });
  }

  lines.push(...roomScheduleLines(roomSummary, request, warnings));
  lines.push(...wrapText(renderModel.disclaimer, 112).map((line, index) => textLine(line, margin, 52 - index * 12, 9, "F2", "#DC2626")));
  lines.push(textLine("Not for construction, permits, structural, legal, or code-compliance use.", margin, 24, 8, "F1", "#6B7280"));

  return lines.join("\n");
}

function roomScheduleLines(
  roomSummary: RoomSummaryItem[],
  request: PdfExportRequest,
  warnings: string[]
) {
  const lines: string[] = [];
  const x = 610;
  let y = pageHeight - 42;

  lines.push(textLine("Room Summary", x, y, 13, "F2", "#101114"));
  y -= 20;

  if (request.settings.includeRoomSchedule) {
    roomSummary.slice(0, 14).forEach((room) => {
      lines.push(textLine(`${room.name} - ${formatNumber(room.area)} m2`, x, y, 8.5, "F1", "#101114"));
      y -= 12;
      lines.push(textLine(room.dimensions, x + 10, y, 7.5, "F1", "#6B7280"));
      y -= 12;
    });
  }

  lines.push(textLine(`Rooms: ${roomSummary.length}`, x, y - 4, 8.5, "F2", "#101114"));
  y -= 24;

  if (request.settings.includeWarnings && warnings.length > 0) {
    lines.push(textLine("Warnings", x, y, 10, "F2", "#D97706"));
    y -= 14;
    warnings.slice(0, 5).forEach((warning) => {
      wrapText(warning, 36).forEach((line) => {
        lines.push(textLine(line, x, y, 7, "F1", "#6B7280"));
        y -= 10;
      });
    });
  }

  return lines;
}

function createPdfTransform(
  renderModel: RenderModel,
  box: { x: number; y: number; width: number; height: number }
) {
  const scale = Math.min(
    box.width / renderModel.viewport.width,
    box.height / renderModel.viewport.height
  );
  const drawWidth = renderModel.viewport.width * scale;
  const drawHeight = renderModel.viewport.height * scale;
  const originX = box.x + (box.width - drawWidth) / 2;
  const originY = box.y + (box.height - drawHeight) / 2;

  function point(pointValue: RenderPoint): RenderPoint {
    return {
      x: originX + (pointValue.x - renderModel.viewport.x) * scale,
      y:
        originY +
        drawHeight -
        (pointValue.y - renderModel.viewport.y) * scale
    };
  }

  function rect(rectValue: RenderRect): RenderRect {
    const topLeft = point({ x: rectValue.x, y: rectValue.y });

    return {
      x: topLeft.x,
      y: topLeft.y - rectValue.height * scale,
      width: rectValue.width * scale,
      height: rectValue.height * scale
    };
  }

  return {
    point,
    rect
  };
}

function textLine(
  value: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2",
  color: string
) {
  return `BT ${pdfRgb(color)} rg /${font} ${format(size)} Tf ${format(x)} ${format(y)} Td (${escapePdfText(value)}) Tj ET\n`;
}

function wrapText(value: string, maxLength: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function escapePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function format(value: number) {
  return Number(value.toFixed(3)).toString();
}
