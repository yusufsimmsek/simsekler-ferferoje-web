import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SidebarProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function Sidebar({ title, children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "rounded-lg border border-neutral-200 bg-white shadow-panel",
        className
      )}
    >
      <header className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </aside>
  );
}
