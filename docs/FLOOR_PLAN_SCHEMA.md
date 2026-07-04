# Floor Plan Schema

## Schema Goals

The schema defines a simple, validated, renderable 2D floor plan for the MVP. It supports rectangular rooms, doors, windows, adjacencies, layout coordinates, validation issues, and chat edit actions.

The MVP schema is intentionally not a CAD, BIM, or legal architecture format.

## Coordinate System

- Units: meters.
- Origin: top-left of the plan bounds.
- Axis: `x` increases right, `y` increases downward.
- Room shapes: axis-aligned rectangles only.
- Grid snap: default `0.25m`.
- Dimensions are approximate unless explicitly marked otherwise.

## FloorPlan JSON Contract

```json
{
  "schemaVersion": "floor-plan-v1",
  "id": "plan_001",
  "projectId": "project_001",
  "title": "3+1 Apartment Concept",
  "units": "m",
  "precision": "conceptual",
  "bounds": {
    "x": 0,
    "y": 0,
    "width": 13.5,
    "height": 10
  },
  "rooms": [],
  "doors": [],
  "windows": [],
  "adjacencies": [],
  "layout": {
    "engine": "rectangular-grid-v1",
    "gridSize": 0.25,
    "strategy": "deterministic-rectangle-packing",
    "generatedAt": "2026-06-17T00:00:00.000Z"
  },
  "assumptions": [],
  "validation": {
    "status": "valid",
    "issues": []
  },
  "metadata": {
    "createdBy": "ai",
    "source": "prompt",
    "promptSummary": "3+1 apartment with living room, kitchen, bathrooms, balcony",
    "disclaimer": "Conceptual draft only. Not for construction, permits, structural, legal, or code-compliance use."
  }
}
```

## Room Schema

```json
{
  "id": "room_living",
  "name": "Living Room",
  "type": "living",
  "level": 1,
  "layout": {
    "x": 0,
    "y": 0,
    "width": 5,
    "height": 4
  },
  "area": 20,
  "minArea": 12,
  "targetArea": 20,
  "isWetArea": false,
  "isExteriorPreferred": true,
  "notes": []
}
```

Room fields:

- `id`: stable unique room identifier.
- `name`: user-facing room label.
- `type`: controlled room category.
- `level`: floor number, always `1` for MVP.
- `layout`: rectangular coordinates after layout generation.
- `area`: computed or normalized area in square meters.
- `minArea`: optional lower bound used by validation.
- `targetArea`: requested or AI-estimated target area.
- `isWetArea`: true for bathroom, WC, laundry, or similar rooms.
- `isExteriorPreferred`: true when the room should touch an exterior wall.
- `notes`: non-authoritative product or layout notes.

Allowed MVP room types:

```text
entry, hallway, living, kitchen, dining, bedroom, bathroom, wc, ensuite, storage, laundry, balcony, utility, other
```

## Door Schema

```json
{
  "id": "door_living_hall",
  "type": "interior",
  "fromRoomId": "room_hall",
  "toRoomId": "room_living",
  "width": 0.9,
  "placement": {
    "roomId": "room_living",
    "edge": "left",
    "offset": 1.5
  },
  "swing": "unspecified"
}
```

Door fields:

- `id`: stable unique door identifier.
- `type`: `entry`, `interior`, or `balcony`.
- `fromRoomId`: room on one side of the door.
- `toRoomId`: room on the other side, or `null` for entry doors.
- `width`: approximate door width in meters.
- `placement.roomId`: room whose edge anchors the door.
- `placement.edge`: `top`, `right`, `bottom`, or `left`.
- `placement.offset`: distance from the start of the edge in meters.
- `swing`: `left`, `right`, `sliding`, or `unspecified`.

## Window Schema

```json
{
  "id": "window_living_1",
  "roomId": "room_living",
  "width": 1.8,
  "placement": {
    "edge": "top",
    "offset": 1.2
  },
  "sillHeight": null
}
```

Window fields:

- `id`: stable unique window identifier.
- `roomId`: room that owns the window.
- `width`: approximate window width in meters.
- `placement.edge`: exterior edge where the window is placed.
- `placement.offset`: distance from the start of the edge in meters.
- `sillHeight`: optional approximate sill height; `null` for MVP default.

## Adjacency Schema

```json
{
  "id": "adj_living_kitchen",
  "roomAId": "room_living",
  "roomBId": "room_kitchen",
  "type": "preferred",
  "reason": "Open kitchen should connect visually to living room.",
  "satisfied": true
}
```

Adjacency fields:

- `id`: stable unique adjacency identifier.
- `roomAId`: first room.
- `roomBId`: second room.
- `type`: `required`, `preferred`, or `avoid`.
- `reason`: human-readable intent.
- `satisfied`: result after layout validation.

## Layout Schema

```json
{
  "engine": "rectangular-grid-v1",
  "gridSize": 0.25,
  "strategy": "deterministic-rectangle-packing",
  "generatedAt": "2026-06-17T00:00:00.000Z",
  "warnings": [
    "Preferred bedroom-balcony adjacency could not be satisfied."
  ]
}
```

Layout rules:

- The layout engine owns coordinates.
- AI may suggest target dimensions and adjacencies, but final coordinates are deterministic.
- All layout values are in meters.
- Every room must have a layout before rendering.

## Edit Action Schema

Chat edits must be represented as an array of structured actions.

```json
{
  "schemaVersion": "edit-actions-v1",
  "actions": [
    {
      "id": "edit_001",
      "type": "resize_room",
      "roomId": "room_living",
      "params": {
        "targetArea": 24,
        "lockAdjacentRooms": false
      },
      "reason": "User asked to make the living room larger."
    }
  ],
  "requiresRelayout": true,
  "userFacingSummary": "The living room will be enlarged and the layout will be recalculated."
}
```

Supported action types:

- `add_room`
- `remove_room`
- `rename_room`
- `resize_room`
- `set_room_dimensions`
- `set_adjacency`
- `remove_adjacency`
- `add_door`
- `move_door`
- `remove_door`
- `add_window`
- `move_window`
- `remove_window`
- `regenerate_layout`

Unsupported or ambiguous requests:

```json
{
  "schemaVersion": "edit-actions-v1",
  "actions": [],
  "requiresRelayout": false,
  "clarificationRequest": "Which bedroom should become larger?",
  "userFacingSummary": "I need one clarification before changing the plan."
}
```

## Validation Rules

### Schema Validation

- `schemaVersion` is required.
- `units` must be `m` for MVP.
- All IDs must be unique within their collection.
- Room, door, window, and adjacency references must point to existing IDs.
- Unknown top-level properties are rejected in strict mode.

### Room Validation

- Every room must have positive `width`, `height`, and `area`.
- `area` must match `width * height` within tolerance.
- Rooms must be axis-aligned rectangles.
- Room interiors must not overlap.
- Rooms must fit within `bounds`.
- MVP room count should not exceed 12.

### Door Validation

- Door width must be positive.
- Door placement must fit on the selected room edge.
- Interior doors must connect rooms that share an edge or have a valid hallway/circulation connection.
- Entry doors may have `toRoomId: null`.

### Window Validation

- Window width must be positive.
- Window placement must fit on the selected room edge.
- Windows must be placed on exterior edges only.

### Adjacency Validation

- Required adjacencies should be satisfied or produce a critical issue.
- Preferred adjacencies may produce warnings.
- Avoid adjacencies should not share an edge unless unavoidable and warned.

### Export Validation

- Critical validation errors block PNG/PDF export.
- Warnings are included in PDF notes where useful.
- Export must use the current validated plan version.

## Example JSON for a 3+1 Apartment

```json
{
  "schemaVersion": "floor-plan-v1",
  "id": "plan_3plus1_001",
  "projectId": "project_demo_001",
  "title": "3+1 Apartment Concept",
  "units": "m",
  "precision": "conceptual",
  "bounds": {
    "x": 0,
    "y": 0,
    "width": 13,
    "height": 9
  },
  "rooms": [
    {
      "id": "room_entry",
      "name": "Entry",
      "type": "entry",
      "level": 1,
      "layout": { "x": 0, "y": 3.5, "width": 2, "height": 2 },
      "area": 4,
      "minArea": 2,
      "targetArea": 4,
      "isWetArea": false,
      "isExteriorPreferred": false,
      "notes": []
    },
    {
      "id": "room_hall",
      "name": "Hallway",
      "type": "hallway",
      "level": 1,
      "layout": { "x": 2, "y": 3, "width": 2, "height": 3 },
      "area": 6,
      "minArea": 4,
      "targetArea": 6,
      "isWetArea": false,
      "isExteriorPreferred": false,
      "notes": []
    },
    {
      "id": "room_living",
      "name": "Living Room",
      "type": "living",
      "level": 1,
      "layout": { "x": 4, "y": 0, "width": 5, "height": 4 },
      "area": 20,
      "minArea": 14,
      "targetArea": 20,
      "isWetArea": false,
      "isExteriorPreferred": true,
      "notes": ["Open connection preferred with kitchen."]
    },
    {
      "id": "room_kitchen",
      "name": "Kitchen",
      "type": "kitchen",
      "level": 1,
      "layout": { "x": 9, "y": 0, "width": 4, "height": 3 },
      "area": 12,
      "minArea": 7,
      "targetArea": 12,
      "isWetArea": true,
      "isExteriorPreferred": true,
      "notes": []
    },
    {
      "id": "room_bedroom_1",
      "name": "Bedroom 1",
      "type": "bedroom",
      "level": 1,
      "layout": { "x": 4, "y": 4, "width": 3.5, "height": 3 },
      "area": 10.5,
      "minArea": 8,
      "targetArea": 10.5,
      "isWetArea": false,
      "isExteriorPreferred": true,
      "notes": []
    },
    {
      "id": "room_bedroom_2",
      "name": "Bedroom 2",
      "type": "bedroom",
      "level": 1,
      "layout": { "x": 7.5, "y": 4, "width": 3, "height": 3 },
      "area": 9,
      "minArea": 8,
      "targetArea": 9,
      "isWetArea": false,
      "isExteriorPreferred": true,
      "notes": []
    },
    {
      "id": "room_bedroom_3",
      "name": "Bedroom 3",
      "type": "bedroom",
      "level": 1,
      "layout": { "x": 10.5, "y": 4, "width": 2.5, "height": 3 },
      "area": 7.5,
      "minArea": 7,
      "targetArea": 7.5,
      "isWetArea": false,
      "isExteriorPreferred": true,
      "notes": []
    },
    {
      "id": "room_bath",
      "name": "Bathroom",
      "type": "bathroom",
      "level": 1,
      "layout": { "x": 0, "y": 5.5, "width": 2, "height": 2 },
      "area": 4,
      "minArea": 3,
      "targetArea": 4,
      "isWetArea": true,
      "isExteriorPreferred": false,
      "notes": []
    },
    {
      "id": "room_wc",
      "name": "WC",
      "type": "wc",
      "level": 1,
      "layout": { "x": 2, "y": 6, "width": 2, "height": 1.5 },
      "area": 3,
      "minArea": 1.5,
      "targetArea": 3,
      "isWetArea": true,
      "isExteriorPreferred": false,
      "notes": []
    },
    {
      "id": "room_balcony",
      "name": "Balcony",
      "type": "balcony",
      "level": 1,
      "layout": { "x": 9, "y": 3, "width": 4, "height": 1 },
      "area": 4,
      "minArea": 2,
      "targetArea": 4,
      "isWetArea": false,
      "isExteriorPreferred": true,
      "notes": []
    }
  ],
  "doors": [
    {
      "id": "door_entry_hall",
      "type": "entry",
      "fromRoomId": "room_entry",
      "toRoomId": null,
      "width": 1,
      "placement": { "roomId": "room_entry", "edge": "left", "offset": 0.5 },
      "swing": "unspecified"
    },
    {
      "id": "door_hall_living",
      "type": "interior",
      "fromRoomId": "room_hall",
      "toRoomId": "room_living",
      "width": 0.9,
      "placement": { "roomId": "room_living", "edge": "left", "offset": 2 },
      "swing": "unspecified"
    },
    {
      "id": "door_living_balcony",
      "type": "balcony",
      "fromRoomId": "room_living",
      "toRoomId": "room_balcony",
      "width": 1.2,
      "placement": { "roomId": "room_living", "edge": "right", "offset": 3 },
      "swing": "sliding"
    }
  ],
  "windows": [
    {
      "id": "window_living",
      "roomId": "room_living",
      "width": 2,
      "placement": { "edge": "top", "offset": 1.5 },
      "sillHeight": null
    },
    {
      "id": "window_kitchen",
      "roomId": "room_kitchen",
      "width": 1.4,
      "placement": { "edge": "top", "offset": 1 },
      "sillHeight": null
    },
    {
      "id": "window_bedroom_1",
      "roomId": "room_bedroom_1",
      "width": 1.2,
      "placement": { "edge": "bottom", "offset": 1 },
      "sillHeight": null
    }
  ],
  "adjacencies": [
    {
      "id": "adj_living_kitchen",
      "roomAId": "room_living",
      "roomBId": "room_kitchen",
      "type": "preferred",
      "reason": "Open living and kitchen relationship.",
      "satisfied": true
    },
    {
      "id": "adj_living_balcony",
      "roomAId": "room_living",
      "roomBId": "room_balcony",
      "type": "required",
      "reason": "Balcony should connect to living room.",
      "satisfied": true
    }
  ],
  "layout": {
    "engine": "rectangular-grid-v1",
    "gridSize": 0.25,
    "strategy": "deterministic-rectangle-packing",
    "generatedAt": "2026-06-17T00:00:00.000Z",
    "warnings": []
  },
  "assumptions": [
    "All dimensions are approximate.",
    "Rooms are rectangular for MVP.",
    "The plan is a conceptual draft only."
  ],
  "validation": {
    "status": "valid",
    "issues": []
  },
  "metadata": {
    "createdBy": "ai",
    "source": "prompt",
    "promptSummary": "3+1 apartment with open kitchen, bathroom, WC, and balcony",
    "disclaimer": "Conceptual draft only. Not for construction, permits, structural, legal, or code-compliance use."
  }
}
```
