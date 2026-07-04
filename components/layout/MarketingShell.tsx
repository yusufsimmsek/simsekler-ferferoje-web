import Link from "next/link";
import type { ReactNode } from "react";

type MarketingShellProps = {
  children: ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link className="text-sm font-semibold text-neutral-950" href="/">
          AI Floor Plan Generator
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blueprint-500 focus:ring-offset-2"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-md border border-blueprint-700 bg-blueprint-700 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blueprint-600 focus:outline-none focus:ring-2 focus:ring-blueprint-500 focus:ring-offset-2"
            href="/projects/new"
          >
            Create a floor plan
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
