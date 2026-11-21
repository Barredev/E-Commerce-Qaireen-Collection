import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function Table({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto border border-border">
      <table
        className={cn("w-full min-w-[640px] text-left text-sm", className)}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={className}>{children}</tr>;
}

export function TH({
  children,
  className,
  align,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : align === "left"
          ? "text-left"
          : "";

  return (
    <th
      colSpan={colSpan}
      className={cn("px-4 py-3 font-medium whitespace-nowrap", alignClass, className)}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  align,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : align === "left"
          ? "text-left"
          : "";

  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3 align-middle tabular-nums",
        alignClass,
        className,
      )}
    >
      {children}
    </td>
  );
}
