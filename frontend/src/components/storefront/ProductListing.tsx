"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { FilterSidebar, type FilterValues } from "@/components/storefront/FilterSidebar";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/storefront/ProductGrid";
import { Pagination } from "@/components/shared/Pagination";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClasses } from "@/components/ui/Field";
import { fetchCategoryTree } from "@/lib/api/categories";
import { fetchProducts } from "@/lib/api/products";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ProductSort } from "@/lib/types/product";
import { cn } from "@/lib/utils/cn";

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "TERBARU (NEW IN)" },
  { value: "price_asc", label: "HARGA: TERENDAH - TERTINGGI" },
  { value: "price_desc", label: "HARGA: TERTINGGI - TERENDAH" },
  { value: "name", label: "NAMA PRODUK: A - Z" },
];

function readFilters(params: URLSearchParams): FilterValues {
  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    size: params.get("size") ?? "",
    color: params.get("color") ?? "",
    minPrice: params.get("min_price") ?? "",
    maxPrice: params.get("max_price") ?? "",
  };
}

export function ProductListing() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filters = readFilters(new URLSearchParams(searchParams.toString()));
  const sort = (searchParams.get("sort") as ProductSort | null) ?? "newest";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const queryKey = searchParams.toString();

  const products = useAsyncData(
    () =>
      fetchProducts({
        q: filters.q || undefined,
        category: filters.category || undefined,
        size: filters.size || undefined,
        color: filters.color || undefined,
        min_price: filters.minPrice || undefined,
        max_price: filters.maxPrice || undefined,
        sort,
        page,
        per_page: PRODUCTS_PER_PAGE,
      }),
    queryKey,
  );

  const categories = useAsyncData(
    () => fetchCategoryTree(),
    "listing-categories",
  );

  function applyParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }

    next.delete("page");

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function handleFilterChange(updates: Partial<FilterValues>) {
    const next: FilterValues = { ...filters, ...updates };

    applyParams({
      q: next.q || null,
      category: next.category || null,
      size: next.size || null,
      color: next.color || null,
      min_price: next.minPrice || null,
      max_price: next.maxPrice || null,
    });
  }

  function handleReset() {
    router.replace(pathname, { scroll: false });
  }

  function handleSortChange(value: string) {
    applyParams({ sort: value === "newest" ? null : value });
  }

  function handlePageChange(nextPage: number) {
    const next = new URLSearchParams(searchParams.toString());

    if (nextPage <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(nextPage));
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: true,
    });
  }

  const activeFilters = [
    filters.q ? { label: `Cari: "${filters.q}"`, clear: () => handleFilterChange({ q: "" }) } : null,
    filters.category ? { label: `Kategori: ${filters.category}`, clear: () => handleFilterChange({ category: "" }) } : null,
    filters.size ? { label: `Ukuran: ${filters.size}`, clear: () => handleFilterChange({ size: "" }) } : null,
    filters.color ? { label: `Warna: ${filters.color}`, clear: () => handleFilterChange({ color: "" }) } : null,
    filters.minPrice || filters.maxPrice ? {
      label: `Harga: ${filters.minPrice || "0"} - ${filters.maxPrice || "∞"}`,
      clear: () => handleFilterChange({ minPrice: "", maxPrice: "" }),
    } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between lg:hidden border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setMobileFilterOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xs border border-foreground bg-foreground px-4 py-2 text-xs font-black uppercase tracking-wider text-background cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {mobileFilterOpen ? "TUTUP FILTER" : `FILTER & URUTKAN (${activeFilters.length})`}
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {products.data?.meta.total ?? 0} PRODUK
        </span>
      </div>

      {/* Filter Sidebar (Desktop + Mobile drawer toggle) */}
      <div className={cn("w-full lg:w-64", mobileFilterOpen ? "block" : "hidden lg:block")}>
        <FilterSidebar
          values={filters}
          categories={categories.data ?? []}
          loading={categories.loading}
          onChange={(updates) => {
            handleFilterChange(updates);
            setMobileFilterOpen(false);
          }}
          onReset={() => {
            handleReset();
            setMobileFilterOpen(false);
          }}
        />
      </div>

      {/* Products Column */}
      <div className="min-w-0 flex-1">
        {/* Top Control Bar: Total count + Sort selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-xs bg-muted px-2.5 py-1 text-xs font-black uppercase tracking-wider text-foreground">
              {products.loading
                ? "MEMUAT..."
                : `${products.data?.meta.total ?? 0} ITEM DITEMUKAN`}
            </span>
          </div>

          <label className="flex w-full items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground sm:w-auto">
            <span className="shrink-0 text-muted-foreground">URUTKAN:</span>
            <select
              value={sort}
              onChange={(event) => handleSortChange(event.target.value)}
              className={cn(fieldClasses, "py-1.5 text-xs font-bold uppercase rounded-xs sm:w-64")}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Active filter badges strip */}
        {activeFilters.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Filter aktif:
            </span>
            {activeFilters.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={f.clear}
                className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-danger hover:text-white transition-colors cursor-pointer"
              >
                <span>{f.label}</span>
                <span>✕</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-bold uppercase tracking-wider text-danger underline hover:opacity-80 cursor-pointer ml-1"
            >
              Hapus Semua
            </button>
          </div>
        ) : null}

        {/* Product Grid */}
        <div className="mt-6">
          {products.loading ? (
            <ProductGridSkeleton count={PRODUCTS_PER_PAGE} />
          ) : products.error ? (
            <Alert tone="error">{products.error}</Alert>
          ) : products.data && products.data.data.length > 0 ? (
            <ProductGrid products={products.data.data} />
          ) : (
            <EmptyState
              title="Tidak ada produk yang cocok"
              description="Coba ubah kata kunci atau hapus beberapa filter."
            />
          )}
        </div>

        {/* Pagination */}
        {products.data && products.data.meta.last_page > 1 ? (
          <Pagination
            page={products.data.meta.current_page}
            lastPage={products.data.meta.last_page}
            onChange={handlePageChange}
            className="mt-12"
          />
        ) : null}
      </div>
    </div>
  );
}
