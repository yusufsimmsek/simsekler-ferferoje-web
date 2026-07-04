import type { FloorPlan } from "@/lib/floor-plan/types";

type PlanSummaryProps = {
  plan: FloorPlan;
  projectName?: string | null;
};

export function PlanSummary({ plan, projectName }: PlanSummaryProps) {
  const totalArea = plan.rooms.reduce((sum, room) => sum + room.area, 0);

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-semibold text-neutral-950">{projectName ?? plan.title}</p>
        <p className="text-xs text-neutral-500">Approximate conceptual draft</p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs text-neutral-500">Rooms</dt>
          <dd className="font-semibold text-neutral-950">{plan.rooms.length}</dd>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs text-neutral-500">Area</dt>
          <dd className="font-mono font-semibold text-neutral-950">{totalArea} m2</dd>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs text-neutral-500">Grid</dt>
          <dd className="font-mono font-semibold text-neutral-950">{plan.layout.gridSize} m</dd>
        </div>
      </dl>
      <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
        {plan.metadata.disclaimer}
      </p>
    </div>
  );
}
