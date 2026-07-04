import type { FloorPlan } from "@/lib/floor-plan/types";
import { StatusChip } from "@/components/ui/StatusChip";

type RoomInspectorProps = {
  plan: FloorPlan;
  selectedRoomId?: string | null;
};

export function RoomInspector({ plan, selectedRoomId }: RoomInspectorProps) {
  const room = plan.rooms.find((candidate) => candidate.id === selectedRoomId) ?? plan.rooms[0];

  if (!room) {
    return (
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-500">
        Select a room to inspect details.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950">{room.name}</h3>
          <p className="text-xs text-neutral-500">{room.type}</p>
        </div>
        {room.isExteriorPreferred ? <StatusChip tone="info">Exterior</StatusChip> : null}
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-neutral-500">Dimensions</dt>
          <dd className="font-mono text-neutral-950">
            {room.layout.width} x {room.layout.height} m
          </dd>
        </div>
        <div className="flex justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-neutral-500">Area</dt>
          <dd className="font-mono text-neutral-950">{room.area} m2</dd>
        </div>
        <div className="flex justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-neutral-500">Wet area</dt>
          <dd className="text-neutral-950">{room.isWetArea ? "Yes" : "No"}</dd>
        </div>
      </dl>
      <p className="rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-500">
        Room changes are applied through validated chat actions. Manual CAD-style editing is outside the MVP.
      </p>
    </div>
  );
}
