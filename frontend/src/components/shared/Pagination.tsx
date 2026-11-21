"use client";

import { cn } from "@/lib/utils/cn";

type PageItem = number | "ellipsis";

function buildPageWindow(current: number, lastPage: number): PageItem[] {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, lastPage, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= lastPage)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];

    if (previous !== undefined && page - previous > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  });

  return items;
}

export function Pagination({
  page,
  lastPage,
  onChange,
  className,
}: {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (lastPage <= 1) {
    return null;
  }

  const items = buildPageWindow(page, lastPage);
  const baseButton =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border px-3 text-xs tracking-wide tabular-nums transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Navigasi halaman"
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
    >
      <button
        type="button"
        className={cn(baseButton, "hover:border-foreground")}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Sebelumnya
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              baseButton,
              item === page
                ? "border-foreground bg-foreground text-background"
                : "hover:border-foreground",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={cn(baseButton, "hover:border-foreground")}
        onClick={() => onChange(page + 1)}
        disabled={page >= lastPage}
      >
        Berikutnya
      </button>
    </nav>
  );
}
