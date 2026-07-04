import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusChip } from "@/components/ui/StatusChip";

export function ExportModal() {
  return (
    <Modal
      description="Static export modal placeholder for the scaffold."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Export later</Button>
        </div>
      }
      title="Export floor plan"
    >
      <div className="grid gap-3 text-sm text-neutral-700">
        <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
          <span>PNG/PDF export</span>
          <StatusChip tone="warning">Not implemented</StatusChip>
        </div>
        <p className="text-xs text-neutral-500">
          Exports will include labels, approximate dimensions, warnings, and the conceptual-draft disclaimer.
        </p>
      </div>
    </Modal>
  );
}
