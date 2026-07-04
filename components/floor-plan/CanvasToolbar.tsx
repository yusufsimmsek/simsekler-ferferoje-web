import { Focus, Minus, Plus, Ruler, Tags } from "lucide-react";
import { Button } from "@/components/ui/Button";

type CanvasToolbarProps = {
  zoomLabel: string;
  labelsVisible: boolean;
  dimensionsVisible: boolean;
  onFitToView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLabels: () => void;
  onToggleDimensions: () => void;
};

export function CanvasToolbar({
  zoomLabel,
  labelsVisible,
  dimensionsVisible,
  onFitToView,
  onZoomIn,
  onZoomOut,
  onToggleLabels,
  onToggleDimensions
}: CanvasToolbarProps) {
  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1 shadow-toolbar">
      <Button aria-label="Fit to view" onClick={onFitToView} size="iconSm" title="Fit to view" variant="icon">
        <Focus className="h-4 w-4" />
      </Button>
      <Button aria-label="Zoom out" onClick={onZoomOut} size="iconSm" title="Zoom out" variant="icon">
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-10 px-1 text-center font-mono text-[11px] text-neutral-500">
        {zoomLabel}
      </span>
      <Button aria-label="Zoom in" onClick={onZoomIn} size="iconSm" title="Zoom in" variant="icon">
        <Plus className="h-4 w-4" />
      </Button>
      <span className="mx-1 h-5 w-px bg-neutral-200" />
      <Button
        aria-label="Toggle labels"
        aria-pressed={labelsVisible}
        onClick={onToggleLabels}
        size="iconSm"
        title="Toggle labels"
        variant="icon"
      >
        <Tags className="h-4 w-4" />
      </Button>
      <Button
        aria-label="Toggle dimensions"
        aria-pressed={dimensionsVisible}
        onClick={onToggleDimensions}
        size="iconSm"
        title="Toggle dimensions"
        variant="icon"
      >
        <Ruler className="h-4 w-4" />
      </Button>
    </div>
  );
}
