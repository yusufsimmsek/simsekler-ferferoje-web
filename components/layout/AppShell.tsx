import type { ReactNode } from "react";
import { Topbar } from "./Topbar";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  return (
    <div className="min-h-screen bg-neutral-100">
      <Topbar actions={actions} subtitle={subtitle} title={title} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
