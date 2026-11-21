import type { Product } from "@/lib/types/product";

import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col">
          <div className="aspect-[2/3] w-full animate-pulse rounded-xs bg-muted" />
          <div className="space-y-1.5 pt-2.5">
            <div className="h-2.5 w-1/3 animate-pulse bg-muted" />
            <div className="h-3.5 w-3/4 animate-pulse bg-muted" />
            <div className="h-3.5 w-1/2 animate-pulse bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
