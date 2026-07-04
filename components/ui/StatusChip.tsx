import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

type StatusChipProps = {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700"
};

export function StatusChip({ tone = "neutral", children, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
