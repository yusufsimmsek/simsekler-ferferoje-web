import type { ValidationIssue, ValidationSummary } from "@/lib/floor-plan/types";

export type ExportFormat = "png" | "pdf";

export type RoomSummaryItem = {
  id: string;
  name: string;
  type: string;
  area: number;
  dimensions: string;
};

export type ExportErrorCode =
  | "INVALID_EXPORT_REQUEST"
  | "EXPORT_INVALID_PLAN"
  | "EXPORT_RENDER_FAILED";

export type ExportFailure = {
  ok: false;
  code: ExportErrorCode;
  format: ExportFormat | "unknown";
  message: string;
  developerMessage: string;
  retryable: boolean;
  validation: ValidationSummary;
  issues: ValidationIssue[];
  warnings: string[];
};

export type PngExportPayload = {
  ok: true;
  code: "PNG_EXPORT_READY";
  format: "png";
  delivery: "client_png_from_svg";
  filename: string;
  mimeType: "image/svg+xml";
  svg: string;
  width: number;
  height: number;
  disclaimer: string;
  validation: ValidationSummary;
  warnings: string[];
  roomSummary: RoomSummaryItem[];
};

export type PdfExportPayload = {
  ok: true;
  code: "PDF_EXPORT_READY";
  format: "pdf";
  delivery: "server_pdf";
  filename: string;
  mimeType: "application/pdf";
  bytes: Uint8Array;
  byteLength: number;
  disclaimer: string;
  validation: ValidationSummary;
  warnings: string[];
  roomSummary: RoomSummaryItem[];
};

export type PngExportResult = PngExportPayload | ExportFailure;
export type PdfExportResult = PdfExportPayload | ExportFailure;
