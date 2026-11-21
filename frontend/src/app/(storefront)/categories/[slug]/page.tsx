import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryDetail } from "@/components/storefront/CategoryDetail";
import { ProductGridSkeleton } from "@/components/storefront/ProductGrid";

export const metadata: Metadata = {
  title: "Kategori Produk",
};

export default function CategoryDetailPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="h-20 animate-pulse rounded-xs bg-muted" />
            <ProductGridSkeleton />
          </div>
        }
      >
        <CategoryDetail />
      </Suspense>
    </div>
  );
}
