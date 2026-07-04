import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Input({ label, helperText, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm text-neutral-700" htmlFor={inputId}>
      {label ? <span className="font-medium text-neutral-950">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          "h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-blueprint-500 focus:ring-2 focus:ring-blueprint-100",
          error && "border-red-500 focus:border-red-500 focus:ring-red-100",
          className
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-neutral-500">{helperText}</span>
      ) : null}
    </label>
  );
}
