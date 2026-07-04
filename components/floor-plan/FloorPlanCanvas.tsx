"use client";

import { useMemo, useState } from "react";
import type { FloorPlan } from "@/lib/floor-plan/types";
import { validateFloorPlan } from "@/lib/floor-plan/validation";
import { createFloorPlanRenderModel } from "@/lib/render/render-model";
import { createSvgViewport } from "@/lib/render/canvas-renderer";
import { CanvasToolbar } from "./CanvasToolbar";

type FloorPlanCanvasProps = {
  plan?: FloorPlan | null;
  selectedRoomId?: string | null;
};

export function FloorPlanCanvas({ plan, selectedRoomId }: FloorPlanCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [dimensionsVisible, setDimensionsVisible] = useState(true);

  const validation = useMemo(() => (plan ? validateFloorPlan(plan) : null), [plan]);
  const renderModel = useMemo(() => {
    if (!validation?.ok) return null;

    return createFloorPlanRenderModel(validation.data, {
      selectedRoomId
    });
  }, [selectedRoomId, validation]);

  if (!plan) {
    return (
      <section className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-canvas-background p-8 shadow-panel lg:min-h-[560px]">
        <div className="max-w-sm text-center">
          <h2 className="text-sm font-semibold text-neutral-950">No plan generated yet</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Generate a plan from a prompt to begin rendering the 2D floor plan.
          </p>
        </div>
      </section>
    );
  }

  if (!validation?.ok || !renderModel) {
    const issues = validation?.ok === false ? validation.issues : [];

    return (
      <section className="flex min-h-[420px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 shadow-panel lg:min-h-[560px]">
        <div className="max-w-lg">
          <h2 className="text-sm font-semibold text-red-900">Floor plan cannot be rendered</h2>
          <p className="mt-2 text-sm text-red-800">
            Rendering is blocked because the current floor plan failed validation.
          </p>
          <ul className="mt-4 grid gap-2 text-xs text-red-900">
            {issues.slice(0, 4).map((issue) => (
              <li className="rounded-md border border-red-200 bg-white p-2" key={issue.id}>
                <span className="font-semibold">{issue.code}:</span> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const viewport = createSvgViewport(renderModel, zoom);

  return (
    <section className="relative flex min-h-[420px] flex-1 overflow-hidden rounded-lg border border-neutral-300 bg-canvas-background shadow-panel lg:min-h-[560px]">
      <CanvasToolbar
        dimensionsVisible={dimensionsVisible}
        labelsVisible={labelsVisible}
        onFitToView={() => setZoom(1)}
        onToggleDimensions={() => setDimensionsVisible((visible) => !visible)}
        onToggleLabels={() => setLabelsVisible((visible) => !visible)}
        onZoomIn={() => setZoom((current) => Math.min(current + 0.25, 2))}
        onZoomOut={() => setZoom((current) => Math.max(current - 0.25, 0.75))}
        zoomLabel={`${Math.round(zoom * 100)}%`}
      />

      <div className="floor-plan-grid flex flex-1 items-center justify-center p-3 sm:p-5 lg:p-6">
        <svg
          aria-label={`${renderModel.title} 2D floor plan`}
          className="h-full min-h-[360px] w-full rounded-md border border-neutral-200 bg-white shadow-panel sm:min-h-[460px] lg:min-h-[520px]"
          role="img"
          viewBox={viewport.viewBox}
        >
          <title>{renderModel.title}</title>
          <desc>
            Validated conceptual floor plan with {renderModel.rooms.length} rooms,
            {renderModel.doors.length} doors, and {renderModel.windows.length} windows.
          </desc>

          <rect
            fill="#F8FAFC"
            height={renderModel.viewport.height}
            width={renderModel.viewport.width}
            x={renderModel.viewport.x}
            y={renderModel.viewport.y}
          />

          <g data-render-layer="grid">
            {renderModel.grid.map((line) => (
              <line
                key={line.id}
                stroke="#CBD5E1"
                strokeDasharray="3 9"
                strokeOpacity="0.45"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                x1={line.start.x}
                x2={line.end.x}
                y1={line.start.y}
                y2={line.end.y}
              />
            ))}
          </g>

          <g data-render-layer="rooms">
            {renderModel.rooms.map((room) => (
              <rect
                fill={room.selected ? "#EFF6FF" : room.fill}
                height={room.rect.height}
                key={room.id}
                rx="2"
                stroke={room.selected ? "#1D4ED8" : "#D1D5DB"}
                strokeWidth={room.selected ? 2 : 1}
                vectorEffect="non-scaling-stroke"
                width={room.rect.width}
                x={room.rect.x}
                y={room.rect.y}
              />
            ))}
          </g>

          <g data-render-layer="walls">
            {renderModel.walls.map((wall) => (
              <line
                key={wall.id}
                stroke={wall.kind === "exterior" ? "#111827" : "#374151"}
                strokeLinecap="square"
                strokeWidth={wall.strokeWidth}
                vectorEffect="non-scaling-stroke"
                x1={wall.start.x}
                x2={wall.end.x}
                y1={wall.start.y}
                y2={wall.end.y}
              />
            ))}
          </g>

          <g data-render-layer="doors">
            {renderModel.doors.map((door) => (
              <g key={door.id}>
                <line
                  aria-label={door.label}
                  stroke="#0F766E"
                  strokeLinecap="round"
                  strokeWidth="6"
                  vectorEffect="non-scaling-stroke"
                  x1={door.start.x}
                  x2={door.end.x}
                  y1={door.start.y}
                  y2={door.end.y}
                />
                {door.swingPath ? (
                  <path
                    d={door.swingPath}
                    fill="none"
                    stroke="#0F766E"
                    strokeDasharray="4 4"
                    strokeOpacity="0.75"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </g>
            ))}
          </g>

          <g data-render-layer="windows">
            {renderModel.windows.map((window) => (
              <line
                aria-label={window.label}
                key={window.id}
                stroke="#2563EB"
                strokeLinecap="round"
                strokeWidth="7"
                vectorEffect="non-scaling-stroke"
                x1={window.start.x}
                x2={window.end.x}
                y1={window.start.y}
                y2={window.end.y}
              />
            ))}
          </g>

          {labelsVisible ? (
            <g data-render-layer="labels">
              {renderModel.rooms.map((room) => (
                <text
                  dominantBaseline="middle"
                  fill="#101114"
                  fontFamily="Inter, ui-sans-serif, system-ui"
                  fontSize="12"
                  fontWeight="700"
                  key={`${room.id}_label`}
                  pointerEvents="none"
                  textAnchor="middle"
                  x={room.labelPoint.x}
                  y={dimensionsVisible ? room.labelPoint.y - 8 : room.labelPoint.y}
                >
                  {room.label}
                </text>
              ))}
            </g>
          ) : null}

          {dimensionsVisible ? (
            <g data-render-layer="dimensions">
              {renderModel.rooms.map((room) => (
                <text
                  dominantBaseline="middle"
                  fill="#64748B"
                  fontFamily="Geist Mono, ui-monospace, SFMono-Regular, monospace"
                  fontSize="10.5"
                  key={`${room.id}_area`}
                  pointerEvents="none"
                  textAnchor="middle"
                  x={room.labelPoint.x}
                  y={labelsVisible ? room.labelPoint.y + 9 : room.labelPoint.y}
                >
                  {room.areaLabel} / {room.dimensionLabel}
                </text>
              ))}
            </g>
          ) : null}
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-neutral-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-neutral-600 shadow-panel">
        Validated 2D geometry
      </div>
    </section>
  );
}
