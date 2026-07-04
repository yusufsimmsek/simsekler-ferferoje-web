import type { FloorPlan } from "@/lib/floor-plan/types";

export type RectanglePackingResult = {
  plan: FloorPlan;
  warnings: string[];
};

export function packRectanglesPlaceholder(plan: FloorPlan): RectanglePackingResult {
  return {
    plan,
    warnings: [
      "Rectangle packing is a placeholder. TASK-005 will implement deterministic layout."
    ]
  };
}
