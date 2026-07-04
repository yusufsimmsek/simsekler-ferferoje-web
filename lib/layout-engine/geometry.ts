import type { Rect } from "@/lib/floor-plan/types";

export function calculateArea(rect: Pick<Rect, "width" | "height">) {
  return rect.width * rect.height;
}

export function doRectanglesOverlap(a: Rect, b: Rect) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

export function snapToGrid(value: number, gridSize = 0.25) {
  return Math.round(value / gridSize) * gridSize;
}
