import { NextResponse } from "next/server";
import {
  exportFailure,
  toPublicExportFailure
} from "@/lib/export/service";
import { createPdfExport } from "@/lib/export/pdf";
import { createApiRequestId, readJsonRequest } from "@/lib/api/json-route-guard";

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const parsedRequest = await readJsonRequest(request, { requestId });

  if (!parsedRequest.ok) {
    return NextResponse.json(parsedRequest.body, { status: parsedRequest.status });
  }

  const result = (() => {
    try {
      return createPdfExport(parsedRequest.body);
    } catch (error) {
      return exportFailure({
        code: "EXPORT_RENDER_FAILED",
        format: "pdf",
        message: "PDF export failed while rendering the floor plan.",
        developerMessage: error instanceof Error ? error.message : "Unknown PDF export failure.",
        retryable: true
      });
    }
  })();

  if (!result.ok) {
    return NextResponse.json(toPublicExportFailure(result, requestId), {
      status: result.code === "INVALID_EXPORT_REQUEST" ? 400 : 422
    });
  }

  const pdfBody = result.bytes.buffer.slice(
    result.bytes.byteOffset,
    result.bytes.byteOffset + result.bytes.byteLength
  ) as ArrayBuffer;

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "X-Export-Code": result.code,
      "X-Export-Filename": result.filename,
      "X-Validation-Status": result.validation.status
    }
  });
}
