import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";

type TopbarProps = {
  title?: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  showMockMode?: boolean;
};

export function Topbar({
  title = "ArchiFlow",
  subtitle,
  backHref,
  actions,
  showMockMode = true
}: TopbarProps) {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        {backHref ? (
          <Link
            aria-label="Geri dön"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-700 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blueprint-500 focus:ring-offset-2"
            href={backHref}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-950">{title}</p>
          {subtitle ? <p className="truncate text-xs text-neutral-500">{subtitle}</p> : null}
        </div>
        {showMockMode ? <StatusChip tone="info">Demo mod</StatusChip> : null}
      </div>
      <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
        {actions}
      </div>
    </header>
  );
}
