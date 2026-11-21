import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductDetail } from "@/components/storefront/ProductDetail";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Detail Produk",
};

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center gap-2 px-4 py-12 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:px-6 lg:px-8">
          <Spinner />
          MEMUAT DETAIL PRODUK...
        </div>
      }
    >
      <ProductDetail />
    </Suspense>
  );
}
