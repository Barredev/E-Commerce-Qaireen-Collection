import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductListing } from "@/components/storefront/ProductListing";
import { ProductGridSkeleton } from "@/components/storefront/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Semua Produk & Koleksi Tren",
};

export default function ProductsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="KATALOG FAST FASHION"
        title="SEMUA KOLEKSI &amp; OUTFIT"
        description="Temukan ribuan tren gaya terkini dengan harga terbaik dan jaminan kualitas."
      />

      <div className="mt-8">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductListing />
        </Suspense>
      </div>
    </div>
  );
}
