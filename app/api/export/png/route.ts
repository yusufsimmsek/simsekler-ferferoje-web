import { NextResponse } from "next/server";
import { createPngExport } from "@/lib/export/png";
import { createApiRequestId, readJsonRequest } from "@/lib/api/json-route-guard";
import { toPublicExportFailure } from "@/lib/export/service";

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const parsedRequest = await readJsonRequest(request, { requestId });

  if (!parsedRequest.ok) {
    return NextResponse.json(parsedRequest.body, { status: parsedRequest.status });
  }

  const result = createPngExport(parsedRequest.body);

  if (!result.ok) {
    return NextResponse.json(toPublicExportFailure(result, requestId), {
      status: result.code === "INVALID_EXPORT_REQUEST" ? 400 : 422
    });
  }

  return NextResponse.json(result, {
    status: 200
  });
}
