import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
        VIP ACCESS
      </p>
      <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-8 rounded-xs border-2 border-foreground bg-card p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function AuthFormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-3 w-20 animate-pulse bg-muted" />
          <div className="h-10 w-full animate-pulse bg-muted" />
        </div>
      ))}
      <div className="h-11 w-full animate-pulse bg-muted" />
    </div>
  );
}
