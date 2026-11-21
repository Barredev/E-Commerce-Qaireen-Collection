import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Judul bagian bergaya editorial: eyebrow kecil berhuruf kapital, judul serif
 * besar, dan area aksi di kanan. Dipakai agar seluruh halaman memakai satu
 * perlakuan judul yang sama.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4",
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-danger">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
