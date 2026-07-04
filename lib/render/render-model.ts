import type { Door, Edge, FloorPlan, Rect, Room, Window } from "@/lib/floor-plan/types";

const renderScale = 56;
const renderMargin = 48;
const wallStroke = 3;

export type RenderPoint = {
  x: number;
  y: number;
};

export type RenderRect = RenderPoint & {
  width: number;
  height: number;
};

export type RenderWall = {
  id: string;
  roomId: string;
  edge: Edge;
  kind: "exterior" | "interior";
  start: RenderPoint;
  end: RenderPoint;
  strokeWidth: number;
};

export type RenderRoom = {
  id: string;
  label: string;
  type: Room["type"];
  rect: RenderRect;
  area: number;
  areaLabel: string;
  dimensionLabel: string;
  fill: string;
  stroke: string;
  labelPoint: RenderPoint;
  selected: boolean;
};

export type RenderDoor = {
  id: string;
  type: Door["type"];
  roomId: string;
  fromRoomId: string;
  toRoomId: string | null;
  start: RenderPoint;
  end: RenderPoint;
  swingPath: string | null;
  label: string;
};

export type RenderWindow = {
  id: string;
  roomId: string;
  start: RenderPoint;
  end: RenderPoint;
  label: string;
};

export type RenderGridLine = {
  id: string;
  orientation: "horizontal" | "vertical";
  start: RenderPoint;
  end: RenderPoint;
};

export type RenderModel = {
  planId: string;
  title: string;
  units: FloorPlan["units"];
  bounds: RenderRect;
  viewport: RenderRect;
  rooms: RenderRoom[];
  walls: RenderWall[];
  doors: RenderDoor[];
  windows: RenderWindow[];
  grid: RenderGridLine[];
  disclaimer: string;
  validationStatus: FloorPlan["validation"]["status"];
};

export type CreateRenderModelOptions = {
  selectedRoomId?: string | null;
  includeGrid?: boolean;
};

export function createFloorPlanRenderModel(
  plan: FloorPlan,
  options: CreateRenderModelOptions = {}
): RenderModel {
  const bounds = toRenderRect(plan.bounds);
  const rooms = plan.rooms.map((room) => toRenderRoom(room, options.selectedRoomId));

  return {
    planId: plan.id,
    title: plan.title,
    units: plan.units,
    bounds,
    viewport: {
      x: 0,
      y: 0,
      width: round(bounds.width + renderMargin * 2),
      height: round(bounds.height + renderMargin * 2)
    },
    rooms,
    walls: plan.rooms.flatMap((room) => toRenderWalls(room, plan.rooms)),
    doors: plan.doors.map((door) => toRenderDoor(door, plan)),
    windows: plan.windows.map((window) => toRenderWindow(window, plan)),
    grid: options.includeGrid === false ? [] : toRenderGrid(plan.bounds),
    disclaimer: plan.metadata.disclaimer,
    validationStatus: plan.validation.status
  };
}

export function getZoomedViewport(viewport: RenderRect, zoom: number): RenderRect {
  const clampedZoom = Math.min(Math.max(zoom, 0.75), 2);
  const width = viewport.width / clampedZoom;
  const height = viewport.height / clampedZoom;

  return {
    x: round(viewport.x + (viewport.width - width) / 2),
    y: round(viewport.y + (viewport.height - height) / 2),
    width: round(width),
    height: round(height)
  };
}

function toRenderRoom(room: Room, selectedRoomId?: string | null): RenderRoom {
  const rect = toRenderRect(room.layout);

  return {
    id: room.id,
    label: room.name,
    type: room.type,
    rect,
    area: room.area,
    areaLabel: `${formatNumber(room.area)} m2`,
    dimensionLabel: `${formatNumber(room.layout.width)} x ${formatNumber(room.layout.height)} m`,
    fill: roomFill(room),
    stroke: room.id === selectedRoomId ? "#1D4ED8" : "#111827",
    labelPoint: {
      x: round(rect.x + rect.width / 2),
      y: round(rect.y + rect.height / 2)
    },
    selected: room.id === selectedRoomId
  };
}

function toRenderWalls(room: Room, rooms: Room[]): RenderWall[] {
  const rect = toRenderRect(room.layout);
  const edges: Array<{
    edge: Edge;
    start: RenderPoint;
    end: RenderPoint;
  }> = [
    {
      edge: "top",
      start: { x: rect.x, y: rect.y },
      end: { x: rect.x + rect.width, y: rect.y }
    },
    {
      edge: "right",
      start: { x: rect.x + rect.width, y: rect.y },
      end: { x: rect.x + rect.width, y: rect.y + rect.height }
    },
    {
      edge: "bottom",
      start: { x: rect.x + rect.width, y: rect.y + rect.height },
      end: { x: rect.x, y: rect.y + rect.height }
    },
    {
      edge: "left",
      start: { x: rect.x, y: rect.y + rect.height },
      end: { x: rect.x, y: rect.y }
    }
  ];

  return edges.map((edge) => {
    const kind = isExteriorEdge(room, rooms, edge.edge) ? "exterior" : "interior";

    return {
      id: `wall_${room.id}_${edge.edge}`,
      roomId: room.id,
      edge: edge.edge,
      kind,
      start: edge.start,
      end: edge.end,
      strokeWidth: kind === "exterior" ? wallStroke + 1 : wallStroke
    };
  });
}

function toRenderDoor(door: Door, plan: FloorPlan): RenderDoor {
  const room = getRoom(plan, door.placement.roomId);
  const segment = openingSegment(room.layout, door.placement.edge, door.placement.offset, door.width);

  return {
    id: door.id,
    type: door.type,
    roomId: door.placement.roomId,
    fromRoomId: door.fromRoomId,
    toRoomId: door.toRoomId,
    start: segment.start,
    end: segment.end,
    swingPath: createDoorSwingPath(room.layout, door.placement.edge, door.placement.offset, door.width),
    label: `${formatNumber(door.width)} m ${door.type} door`
  };
}

function toRenderWindow(window: Window, plan: FloorPlan): RenderWindow {
  const room = getRoom(plan, window.roomId);
  const segment = openingSegment(room.layout, window.placement.edge, window.placement.offset, window.width);

  return {
    id: window.id,
    roomId: window.roomId,
    start: segment.start,
    end: segment.end,
    label: `${formatNumber(window.width)} m window`
  };
}

function toRenderGrid(bounds: Rect): RenderGridLine[] {
  const lines: RenderGridLine[] = [];

  for (let x = 0; x <= bounds.width; x += 1) {
    const renderX = round(renderMargin + x * renderScale);

    lines.push({
      id: `grid_vertical_${x}`,
      orientation: "vertical",
      start: { x: renderX, y: renderMargin },
      end: { x: renderX, y: round(renderMargin + bounds.height * renderScale) }
    });
  }

  for (let y = 0; y <= bounds.height; y += 1) {
    const renderY = round(renderMargin + y * renderScale);

    lines.push({
      id: `grid_horizontal_${y}`,
      orientation: "horizontal",
      start: { x: renderMargin, y: renderY },
      end: { x: round(renderMargin + bounds.width * renderScale), y: renderY }
    });
  }

  return lines;
}

function openingSegment(layout: Rect, edge: Edge, offset: number, width: number) {
  const x = renderMargin + layout.x * renderScale;
  const y = renderMargin + layout.y * renderScale;
  const renderWidth = width * renderScale;
  const renderOffset = offset * renderScale;

  if (edge === "top") {
    return {
      start: { x: round(x + renderOffset), y: round(y) },
      end: { x: round(x + renderOffset + renderWidth), y: round(y) }
    };
  }

  if (edge === "right") {
    const right = x + layout.width * renderScale;

    return {
      start: { x: round(right), y: round(y + renderOffset) },
      end: { x: round(right), y: round(y + renderOffset + renderWidth) }
    };
  }

  if (edge === "bottom") {
    const bottom = y + layout.height * renderScale;

    return {
      start: { x: round(x + renderOffset + renderWidth), y: round(bottom) },
      end: { x: round(x + renderOffset), y: round(bottom) }
    };
  }

  return {
    start: { x: round(x), y: round(y + renderOffset + renderWidth) },
    end: { x: round(x), y: round(y + renderOffset) }
  };
}

function createDoorSwingPath(layout: Rect, edge: Edge, offset: number, width: number) {
  const segment = openingSegment(layout, edge, offset, width);
  const radius = round(width * renderScale * 0.85);
  const sweep = edge === "top" || edge === "right" ? 1 : 0;
  const end = edge === "top" || edge === "bottom" ? segment.end : segment.start;

  return `M ${segment.start.x} ${segment.start.y} A ${radius} ${radius} 0 0 ${sweep} ${end.x} ${end.y}`;
}

function toRenderRect(rect: Rect): RenderRect {
  return {
    x: round(renderMargin + rect.x * renderScale),
    y: round(renderMargin + rect.y * renderScale),
    width: round(rect.width * renderScale),
    height: round(rect.height * renderScale)
  };
}

function getRoom(plan: FloorPlan, roomId: string) {
  const room = plan.rooms.find((candidate) => candidate.id === roomId);

  if (!room) {
    throw new Error(`Render model cannot find room ${roomId}.`);
  }

  return room;
}

function isExteriorEdge(room: Room, rooms: Room[], edge: Edge) {
  return !rooms.some((candidate) => {
    if (candidate.id === room.id) return false;

    if (edge === "top") {
      return (
        nearlyEqual(candidate.layout.y + candidate.layout.height, room.layout.y) &&
        intervalsOverlap(candidate.layout.x, candidate.layout.x + candidate.layout.width, room.layout.x, room.layout.x + room.layout.width)
      );
    }

    if (edge === "right") {
      return (
        nearlyEqual(candidate.layout.x, room.layout.x + room.layout.width) &&
        intervalsOverlap(candidate.layout.y, candidate.layout.y + candidate.layout.height, room.layout.y, room.layout.y + room.layout.height)
      );
    }

    if (edge === "bottom") {
      return (
        nearlyEqual(candidate.layout.y, room.layout.y + room.layout.height) &&
        intervalsOverlap(candidate.layout.x, candidate.layout.x + candidate.layout.width, room.layout.x, room.layout.x + room.layout.width)
      );
    }

    return (
      nearlyEqual(candidate.layout.x + candidate.layout.width, room.layout.x) &&
      intervalsOverlap(candidate.layout.y, candidate.layout.y + candidate.layout.height, room.layout.y, room.layout.y + room.layout.height)
    );
  });
}

function roomFill(room: Room) {
  if (room.type === "balcony") return "#ECFEFF";
  if (room.isWetArea) return "#F0FDFA";
  if (room.type === "living" || room.type === "kitchen") return "#F8FAFC";
  if (room.type === "entry" || room.type === "hallway") return "#F9FAFB";
  return "#FFFFFF";
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd) - 0.01;
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) <= 0.01;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function round(value: number) {
  return Number(value.toFixed(2));
}
