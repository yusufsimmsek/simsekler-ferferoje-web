import type { RenderModel, RenderRect } from "./render-model";
import { getZoomedViewport } from "./render-model";

export type SvgViewport = RenderRect & {
  viewBox: string;
};

export function createSvgViewport(renderModel: RenderModel, zoom = 1): SvgViewport {
  const viewport = getZoomedViewport(renderModel.viewport, zoom);

  return {
    ...viewport,
    viewBox: `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`
  };
}
