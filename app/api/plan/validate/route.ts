import { NextResponse } from "next/server";
import type { FloorPlan } from "@/lib/floor-plan/types";
import { validateFloorPlanPlaceholder } from "@/lib/floor-plan/validation";
import { floorPlanSchema } from "@/lib/schemas/floor-plan.schema";
import { createApiRequestId, readJsonRequest } from "@/lib/api/json-route-guard";

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const parsedRequest = await readJsonRequest(request, { requestId });

  if (!parsedRequest.ok) {
    return NextResponse.json(parsedRequest.body, { status: parsedRequest.status });
  }

  const parsed = floorPlanSchema.safeParse(parsedRequest.body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "FLOOR_PLAN_SCHEMA_MISMATCH",
        message: "Floor plan JSON does not match the scaffold schema.",
        requestId
      },
      { status: 400 }
    );
  }

  const validation = validateFloorPlanPlaceholder(parsed.data as unknown as FloorPlan);

  return NextResponse.json({
    ok: validation.ok,
    validation: validation.summary
  });
}
