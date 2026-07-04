import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Textarea({
  label,
  helperText,
  error,
  id,
  className,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm text-neutral-700" htmlFor={textareaId}>
      {label ? <span className="font-medium text-neutral-950">{label}</span> : null}
      <textarea
        id={textareaId}
        className={cn(
          "min-h-24 resize-none rounded-md border border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-950 outline-none transition focus:border-blueprint-500 focus:ring-2 focus:ring-blueprint-100",
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
