import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone =
  | "neutral"
  | "success"
  | "danger"
  | "info"
  | "warning"
  | "error";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-foreground text-background",
  success: "bg-success text-white",
  danger: "bg-danger text-white",
  error: "bg-danger text-white",
  info: "bg-muted text-foreground border border-border",
  warning: "bg-warning text-black font-bold",
};

export function Badge({
  children,
  tone,
  variant,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  variant?: BadgeTone | "destructive";
  className?: string;
}) {
  const normalizedVariant = variant === "destructive" ? "danger" : variant;
  const activeTone = normalizedVariant ?? tone ?? "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] shadow-xs",
        toneClasses[activeTone],
        className,
      )}
    >
      {children}
    </span>
  );
}
