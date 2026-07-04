import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "info" | "warning" | "error";

type ToastProps = {
  tone?: ToastTone;
  title: string;
  children?: ReactNode;
};

const toneClasses: Record<ToastTone, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900"
};

export function Toast({ tone = "info", title, children }: ToastProps) {
  return (
    <div className={cn("rounded-md border p-3 text-sm", toneClasses[tone])}>
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1 text-xs opacity-80">{children}</div> : null}
    </div>
  );
}
