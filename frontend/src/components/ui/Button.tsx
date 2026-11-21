import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<string, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.99]",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80 active:scale-[0.99]",
  outline:
    "border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background active:scale-[0.99]",
  ghost:
    "bg-transparent text-foreground hover:bg-muted active:scale-[0.99]",
  danger:
    "bg-danger text-white hover:bg-danger/90 active:scale-[0.99]",
  destructive:
    "bg-danger text-white hover:bg-danger/90 active:scale-[0.99]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-xs font-semibold uppercase tracking-[0.08em]",
  md: "h-11 px-5 text-xs font-bold uppercase tracking-[0.1em]",
  lg: "h-13 px-8 text-sm font-bold uppercase tracking-[0.14em]",
};

export interface ButtonClassesOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function buttonClasses(
  variantOrOptions?: ButtonVariant | ButtonClassesOptions,
  sizeArg: ButtonSize = "md",
  fullWidthArg = false,
): string {
  let variant: ButtonVariant = "primary";
  let size: ButtonSize = sizeArg;
  let fullWidth = fullWidthArg;

  if (typeof variantOrOptions === "object" && variantOrOptions !== null) {
    variant = variantOrOptions.variant ?? "primary";
    size = variantOrOptions.size ?? "md";
    fullWidth = variantOrOptions.fullWidth ?? false;
  } else if (typeof variantOrOptions === "string") {
    variant = variantOrOptions;
  }

  const vClass = variantClasses[variant] ?? variantClasses.primary;
  const sClass = sizeClasses[size] ?? sizeClasses.md;

  return cn(
    "inline-flex items-center justify-center gap-2 rounded-sm font-sans transition-all duration-150 cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    vClass,
    sClass,
    fullWidth && "w-full",
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant,
  tone,
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const activeVariant = tone ?? variant ?? "primary";

  return (
    <button
      type={type}
      className={cn(buttonClasses(activeVariant, size, fullWidth), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
