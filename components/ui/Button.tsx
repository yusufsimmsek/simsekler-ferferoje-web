import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "icon";
type ButtonSize = "sm" | "md" | "lg" | "iconSm" | "iconMd";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-blueprint-700 bg-blueprint-700 text-white hover:bg-blueprint-600",
  secondary:
    "border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50",
  ghost:
    "border-transparent bg-transparent text-neutral-700 hover:bg-neutral-100",
  destructive: "border-red-600 bg-red-600 text-white hover:bg-red-500",
  icon: "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
  iconSm: "h-8 w-8 p-0",
  iconMd: "h-10 w-10 p-0"
};

export function Button({
  children,
  className,
  variant = "secondary",
  size = "md",
  leftIcon,
  rightIcon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blueprint-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      type={type}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
