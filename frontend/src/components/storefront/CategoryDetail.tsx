"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Pagination } from "@/components/shared/Pagination";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/storefront/ProductGrid";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCategory } from "@/lib/api/categories";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const category = useAsyncData(
    () => fetchCategory(slug, page),
    `category-${slug}-${page}`,
  );

  function handlePageChange(nextPage: number) {
    router.replace(
      nextPage <= 1
        ? `/categories/${slug}`
        : `/categories/${slug}?page=${nextPage}`,
    );
  }

  if (category.loading) {
    return (
      <div className="space-y-8">
        <div className="h-24 animate-pulse rounded-xs bg-muted" />
        <ProductGridSkeleton />
      </div>
    );
  }

  if (category.error) {
    return <Alert tone="error">{category.error}</Alert>;
  }

  if (!category.data) {
    return (
      <EmptyState
        title="Kategori tidak ditemukan"
        description="Kategori mungkin sudah tidak aktif."
      />
    );
  }

  const detail = category.data.data;
  const products = category.data.products;

  return (
    <div>
      <div className="border-b-2 border-foreground pb-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
          DEPARTEMEN
        </p>
        <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
          {detail.name}
        </h1>
        {detail.description ? (
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {detail.description}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {products.meta.total} ITEM DITEMUKAN
        </p>
      </div>

      {detail.children && detail.children.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {detail.children.map((child) => (
            <Link
              key={child.id}
              href={`/categories/${child.slug}`}
              className="rounded-xs border-2 border-border bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:border-foreground"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        {products.data.length > 0 ? (
          <ProductGrid products={products.data} />
        ) : (
          <EmptyState
            title="Belum ada produk"
            description="Kategori ini belum memiliki produk yang tayang."
          />
        )}
      </div>

      <Pagination
        page={products.meta.current_page}
        lastPage={products.meta.last_page}
        onChange={handlePageChange}
        className="mt-12"
      />
    </div>
  );
}
