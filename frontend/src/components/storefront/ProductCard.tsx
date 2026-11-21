import Link from "next/link";

import type { Product } from "@/lib/types/product";
import { formatCurrency, formatPriceRange } from "@/lib/utils/formatCurrency";

import { ProductThumbnail } from "./ProductThumbnail";

export function ProductCard({ product }: { product: Product }) {
  // Hitung persentase diskon jika base_price lebih tinggi dari price_min
  const hasDiscount = product.base_price > product.price_min;
  const discountPercent = hasDiscount
    ? Math.round(((product.base_price - product.price_min) / product.base_price) * 100)
    : null;

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col">
      {/* 2:3 Fashion Nova portrait ratio container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xs bg-muted">
        <ProductThumbnail
          src={product.thumbnail}
          alt={product.name}
          className="size-full transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 z-10">
          {discountPercent && discountPercent > 0 ? (
            <span className="rounded-xs bg-danger px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
              -{discountPercent}% OFF
            </span>
          ) : null}

          {product.is_featured ? (
            <span className="rounded-xs bg-black px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
              BEST SELLER
            </span>
          ) : null}
        </div>

        {/* Quick View overlay on hover (Fashion Nova desktop style) */}
        <div className="absolute inset-x-2 bottom-2 hidden translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:block">
          <div className="rounded-xs bg-background/95 py-2 text-center text-[11px] font-black uppercase tracking-widest text-foreground shadow-md backdrop-blur-xs">
            LIHAT DETAIL
          </div>
        </div>
      </div>

      {/* Product metadata */}
      <div className="flex flex-1 flex-col pt-2.5">
        {product.category ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {product.category.name}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground transition-colors group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
          {product.name}
        </h3>

        <div className="mt-1 flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="text-xs font-black tabular-nums text-danger sm:text-sm">
                {formatCurrency(product.price_min)}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground line-through">
                {formatCurrency(product.base_price)}
              </span>
            </>
          ) : (
            <span className="text-xs font-black tabular-nums text-foreground sm:text-sm">
              {formatPriceRange(product.price_min, product.price_max)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
