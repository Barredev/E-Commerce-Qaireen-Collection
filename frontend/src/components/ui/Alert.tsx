import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type AlertTone = "error" | "success" | "info";

const toneClasses: Record<AlertTone, string> = {
  error: "border-danger bg-danger/5 text-danger",
  success: "border-success bg-success/5 text-success",
  info: "border-foreground bg-muted text-foreground",
};

export function Alert({
  tone,
  variant,
  children,
  className,
}: {
  tone?: AlertTone;
  variant?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const activeTone = variant ?? tone ?? "info";

  return (
    <div
      role={activeTone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-r-md border-l-2 px-3 py-2.5 text-sm",
        toneClasses[activeTone],
        className,
      )}
    >
      {children}
    </div>
  );
}
