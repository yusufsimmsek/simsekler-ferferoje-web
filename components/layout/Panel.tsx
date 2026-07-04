import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-neutral-200 bg-white shadow-panel",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <header
      className={cn("border-b border-neutral-200 px-4 py-3", className)}
      {...props}
    />
  );
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
