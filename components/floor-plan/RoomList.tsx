import type { FloorPlan } from "@/lib/floor-plan/types";
import { StatusChip } from "@/components/ui/StatusChip";

type RoomListProps = {
  plan: FloorPlan;
  selectedRoomId?: string | null;
};

export function RoomList({ plan, selectedRoomId }: RoomListProps) {
  return (
    <div className="grid gap-1.5">
      {plan.rooms.map((room, index) => (
        <div
          aria-current={room.id === selectedRoomId ? "true" : undefined}
          className={
            room.id === selectedRoomId
              ? "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-blueprint-300 bg-blueprint-50 px-2.5 py-2"
              : "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2"
          }
          key={room.id}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white font-mono text-[11px] text-neutral-500">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-950">{room.name}</p>
            <p className="truncate text-xs capitalize text-neutral-500">{room.type}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs font-medium text-neutral-800">{room.area} m2</p>
            <p className="font-mono text-[10px] text-neutral-500">
              {room.layout.width} x {room.layout.height} m
            </p>
            {room.id === selectedRoomId ? <StatusChip tone="info">Selected</StatusChip> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
