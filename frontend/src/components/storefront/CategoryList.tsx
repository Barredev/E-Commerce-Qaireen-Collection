"use client";

import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCategoryTree } from "@/lib/api/categories";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function CategoryList() {
  const categories = useAsyncData(() => fetchCategoryTree(), "categories-list");

  if (categories.loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-xs bg-muted" />
        ))}
      </div>
    );
  }

  if (categories.error) {
    return <Alert tone="error">{categories.error}</Alert>;
  }

  if (!categories.data || categories.data.length === 0) {
    return (
      <EmptyState
        title="Kategori belum tersedia"
        description="Kategori akan muncul setelah ditambahkan dari dashboard admin."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.data.map((parent) => (
        <div
          key={parent.id}
          className="flex flex-col justify-between rounded-xs border-2 border-border bg-card p-6 transition-all hover:border-foreground hover:shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-danger">
                DEPARTEMEN
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {parent.products_count ?? 0} PRODUK
              </span>
            </div>

            <Link
              href={`/categories/${parent.slug}`}
              className="mt-2 block font-display text-2xl font-black uppercase tracking-tight text-foreground hover:text-danger"
            >
              {parent.name}
            </Link>

            {parent.description ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {parent.description}
              </p>
            ) : null}
          </div>

          {parent.children && parent.children.length > 0 ? (
            <ul className="mt-5 space-y-2 border-t border-border pt-4 text-xs font-semibold uppercase text-muted-foreground">
              {parent.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/categories/${child.slug}`}
                    className="flex items-center justify-between transition-colors hover:text-foreground"
                  >
                    <span>{child.name}</span>
                    <span className="text-[10px] text-muted-foreground">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 border-t border-border pt-3">
              <Link
                href={`/categories/${parent.slug}`}
                className="text-xs font-black uppercase tracking-wider text-foreground hover:underline"
              >
                LIHAT SEMUA →
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
