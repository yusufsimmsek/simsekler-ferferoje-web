import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ModalProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({ title, description, children, footer, className }: ModalProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-lg border border-neutral-200 bg-white shadow-modal",
        className
      )}
    >
      <header className="border-b border-neutral-200 p-5">
        <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        ) : null}
      </header>
      <div className="p-5">{children}</div>
      {footer ? <footer className="border-t border-neutral-200 p-5">{footer}</footer> : null}
    </section>
  );
}
