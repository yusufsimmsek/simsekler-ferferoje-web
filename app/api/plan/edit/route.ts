import { NextResponse } from "next/server";
import { runEditPlanWorkflow } from "@/lib/ai-planner/edit-plan-workflow";
import { selectAiPlannerProvider } from "@/lib/ai-planner/config";
import {
  createApiRequestId,
  readAiPlanJsonRequest,
  toPublicAiPlanErrorBody
} from "@/lib/api/ai-plan-route-guard";

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const parsedRequest = await readAiPlanJsonRequest(request, { requestId });

  if (!parsedRequest.ok) {
    return NextResponse.json(parsedRequest.body, { status: parsedRequest.status });
  }

  const providerSelection = selectAiPlannerProvider();
  const result = await runEditPlanWorkflow(parsedRequest.body, {
    provider: providerSelection.provider,
    providerName: providerSelection.providerName,
    providerMode: providerSelection.mode,
    model: providerSelection.model
  });

  if (!result.body.ok) {
    return NextResponse.json(toPublicAiPlanErrorBody(result.body, requestId), {
      status: result.status
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}
