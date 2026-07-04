import type {
  RenderDoor,
  RenderModel,
  RenderPoint,
  RenderRect,
  RenderWall,
  RenderWindow
} from "./render-model";

export type SvgExportOptions = {
  includeRoomLabels: boolean;
  includeDimensions: boolean;
  includeDisclaimer: boolean;
};

export type SvgExportDocument = {
  svg: string;
  width: number;
  height: number;
};

export function createFloorPlanSvgDocument(
  renderModel: RenderModel,
  options: SvgExportOptions
): SvgExportDocument {
  const width = Math.ceil(renderModel.viewport.width);
  const height = Math.ceil(renderModel.viewport.height);
  const description = `Validated conceptual floor plan with ${renderModel.rooms.length} rooms, ${renderModel.doors.length} doors, and ${renderModel.windows.length} windows.`;

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${renderModel.viewport.x} ${renderModel.viewport.y} ${renderModel.viewport.width} ${renderModel.viewport.height}" role="img">`,
    `<title>${escapeXml(renderModel.title)}</title>`,
    `<desc>${escapeXml(description)}</desc>`,
    `<rect fill="#F8FAFC" height="${renderModel.viewport.height}" width="${renderModel.viewport.width}" x="${renderModel.viewport.x}" y="${renderModel.viewport.y}"/>`,
    renderGrid(renderModel),
    renderRooms(renderModel),
    renderWalls(renderModel.walls),
    renderDoors(renderModel.doors),
    renderWindows(renderModel.windows),
    options.includeRoomLabels ? renderLabels(renderModel, options.includeDimensions) : "",
    options.includeDimensions ? renderDimensions(renderModel, options.includeRoomLabels) : "",
    options.includeDisclaimer ? renderDisclaimer(renderModel) : "",
    `</svg>`
  ]
    .filter(Boolean)
    .join("");

  return {
    svg,
    width,
    height
  };
}

function renderGrid(renderModel: RenderModel) {
  return `<g data-render-layer="grid">${renderModel.grid
    .map(
      (line) =>
        `<line stroke="#CBD5E1" stroke-dasharray="3 9" stroke-opacity="0.45" stroke-width="1" vector-effect="non-scaling-stroke" x1="${line.start.x}" x2="${line.end.x}" y1="${line.start.y}" y2="${line.end.y}"/>`
    )
    .join("")}</g>`;
}

function renderRooms(renderModel: RenderModel) {
  return `<g data-render-layer="rooms">${renderModel.rooms
    .map(
      (room) =>
        `<rect fill="${room.fill}" height="${room.rect.height}" rx="2" stroke="#D1D5DB" stroke-width="1" vector-effect="non-scaling-stroke" width="${room.rect.width}" x="${room.rect.x}" y="${room.rect.y}"/>`
    )
    .join("")}</g>`;
}

function renderWalls(walls: RenderWall[]) {
  return `<g data-render-layer="walls">${walls
    .map(
      (wall) =>
        `<line stroke="${wall.kind === "exterior" ? "#111827" : "#374151"}" stroke-linecap="square" stroke-width="${wall.strokeWidth}" vector-effect="non-scaling-stroke" x1="${wall.start.x}" x2="${wall.end.x}" y1="${wall.start.y}" y2="${wall.end.y}"/>`
    )
    .join("")}</g>`;
}

function renderDoors(doors: RenderDoor[]) {
  return `<g data-render-layer="doors">${doors
    .map(
      (door) =>
        `<g><line aria-label="${escapeXml(door.label)}" stroke="#0F766E" stroke-linecap="round" stroke-width="6" vector-effect="non-scaling-stroke" x1="${door.start.x}" x2="${door.end.x}" y1="${door.start.y}" y2="${door.end.y}"/>${
          door.swingPath
            ? `<path d="${escapeXml(door.swingPath)}" fill="none" stroke="#0F766E" stroke-dasharray="4 4" stroke-opacity="0.75" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`
            : ""
        }</g>`
    )
    .join("")}</g>`;
}

function renderWindows(windows: RenderWindow[]) {
  return `<g data-render-layer="windows">${windows
    .map(
      (window) =>
        `<line aria-label="${escapeXml(window.label)}" stroke="#2563EB" stroke-linecap="round" stroke-width="7" vector-effect="non-scaling-stroke" x1="${window.start.x}" x2="${window.end.x}" y1="${window.start.y}" y2="${window.end.y}"/>`
    )
    .join("")}</g>`;
}

function renderLabels(renderModel: RenderModel, dimensionsVisible: boolean) {
  return `<g data-render-layer="labels">${renderModel.rooms
    .map(
      (room) =>
        `<text dominant-baseline="middle" fill="#101114" font-family="Inter, ui-sans-serif, system-ui" font-size="12" font-weight="700" pointer-events="none" text-anchor="middle" x="${room.labelPoint.x}" y="${dimensionsVisible ? room.labelPoint.y - 8 : room.labelPoint.y}">${escapeXml(room.label)}</text>`
    )
    .join("")}</g>`;
}

function renderDimensions(renderModel: RenderModel, labelsVisible: boolean) {
  return `<g data-render-layer="dimensions">${renderModel.rooms
    .map(
      (room) =>
        `<text dominant-baseline="middle" fill="#64748B" font-family="ui-monospace, SFMono-Regular, monospace" font-size="10.5" pointer-events="none" text-anchor="middle" x="${room.labelPoint.x}" y="${labelsVisible ? room.labelPoint.y + 9 : room.labelPoint.y}">${escapeXml(`${room.areaLabel} - ${room.dimensionLabel}`)}</text>`
    )
    .join("")}</g>`;
}

function renderDisclaimer(renderModel: RenderModel) {
  const y = renderModel.viewport.y + renderModel.viewport.height - 16;

  return `<g data-render-layer="disclaimer"><rect fill="#FFFFFF" fill-opacity="0.9" height="28" width="${renderModel.viewport.width}" x="${renderModel.viewport.x}" y="${y - 18}"/><text fill="#6B7280" font-family="Inter, ui-sans-serif, system-ui" font-size="10" text-anchor="middle" x="${renderModel.viewport.x + renderModel.viewport.width / 2}" y="${y}">${escapeXml(renderModel.disclaimer)}</text></g>`;
}

export function renderPdfLine(input: {
  start: RenderPoint;
  end: RenderPoint;
  transform: (point: RenderPoint) => RenderPoint;
  stroke: string;
  strokeWidth: number;
}) {
  const start = input.transform(input.start);
  const end = input.transform(input.end);
  const color = pdfRgb(input.stroke);

  return `${color} RG ${format(input.strokeWidth)} w ${format(start.x)} ${format(start.y)} m ${format(end.x)} ${format(end.y)} l S\n`;
}

export function renderPdfRect(input: {
  rect: RenderRect;
  transformRect: (rect: RenderRect) => RenderRect;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  const rect = input.transformRect(input.rect);

  return [
    `${pdfRgb(input.fill)} rg ${format(rect.x)} ${format(rect.y)} ${format(rect.width)} ${format(rect.height)} re f`,
    `${pdfRgb(input.stroke)} RG ${format(input.strokeWidth)} w ${format(rect.x)} ${format(rect.y)} ${format(rect.width)} ${format(rect.height)} re S`
  ].join("\n");
}

export function pdfRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  return `${format(r)} ${format(g)} ${format(b)}`;
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function format(value: number) {
  return Number(value.toFixed(3)).toString();
}
