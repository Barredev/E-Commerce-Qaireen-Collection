"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ProductReviewsSection } from "@/components/storefront/ProductReviewsSection";
import { ProductThumbnail } from "@/components/storefront/ProductThumbnail";
import { StarRating } from "@/components/shared/StarRating";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api/client";
import { fetchProduct } from "@/lib/api/products";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCartStore } from "@/lib/stores/cartStore";
import type { ProductVariant } from "@/lib/types/product";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export function ProductDetail() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const product = useAsyncData(() => fetchProduct(slug), `product-${slug}`);

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [cartSuccess, setCartSuccess] = useState(false);

  // Accordion states
  const [descOpen, setDescOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const addItem = useCartStore((state) => state.addItem);

  if (product.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner />
        MEMUAT PRODUK...
      </div>
    );
  }

  if (product.error) {
    return (
      <div className="mx-auto max-w-2xl py-12 space-y-4">
        <Alert tone="error">{product.error}</Alert>
        <Link
          href="/products"
          className="inline-block text-xs font-bold uppercase tracking-wider text-foreground underline underline-offset-4"
        >
          ← KEMBALI KE KATALOG
        </Link>
      </div>
    );
  }

  if (!product.data) {
    return (
      <EmptyState
        title="PRODUK TIDAK DITEMUKAN"
        description="Produk mungkin sudah habis terjual atau tautan telah kedaluwarsa."
        action={
          <Link
            href="/products"
            className={buttonClasses("primary", "md")}
          >
            LIHAT SEMUA PRODUK
          </Link>
        }
      />
    );
  }

  const detail = product.data;
  const variants = detail.variants ?? [];
  const images = detail.images ?? [];
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const colors = [
    ...new Set(
      variants
        .filter((variant) =>
          selectedSize ? variant.size === selectedSize : true,
        )
        .map((variant) => variant.color),
    ),
  ];

  const selectedVariant: ProductVariant | undefined = variants.find(
    (variant) =>
      variant.size === (selectedSize ?? sizes[0]) &&
      variant.color === (selectedColor ?? colors[0]),
  );

  const heroImage =
    activeImage ??
    images.find((image) => image.is_primary)?.image_url ??
    images[0]?.image_url ??
    detail.thumbnail;

  const currentPrice = selectedVariant?.price ?? detail.price_min;
  const hasDiscount = detail.base_price > currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(((detail.base_price - currentPrice) / detail.base_price) * 100)
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb navigation */}
      <nav
        aria-label="Breadcrumb"
        className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground">
              BERANDA
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/products" className="hover:text-foreground">
              PRODUK
            </Link>
          </li>
          {detail.category ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/categories/${detail.category.slug}`}
                  className="hover:text-foreground"
                >
                  {detail.category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden="true">/</li>
          <li className="text-foreground line-clamp-1">{detail.name}</li>
        </ol>
      </nav>

      {/* Main 2-column PDP layout */}
      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Portrait Gallery Stack (Fashion Nova Style) */}
        <div className="lg:col-span-7 flex flex-col-reverse gap-4 sm:flex-row">
          {/* Thumbnails strip */}
          {images.length > 1 ? (
            <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:w-20 shrink-0 pb-1">
              {images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(image.image_url)}
                  aria-label={`Lihat gambar ${image.alt_text ?? detail.name}`}
                  className={cn(
                    "relative aspect-[2/3] w-16 sm:w-full shrink-0 overflow-hidden rounded-xs border-2 transition-all cursor-pointer",
                    heroImage === image.image_url
                      ? "border-foreground shadow-sm"
                      : "border-border hover:border-foreground/50 opacity-70 hover:opacity-100",
                  )}
                >
                  <ProductThumbnail
                    src={image.image_url}
                    alt={image.alt_text ?? detail.name}
                    className="size-full"
                  />
                </button>
              ))}
            </div>
          ) : null}

          {/* Main Hero Image */}
          <div className="relative aspect-[2/3] flex-1 overflow-hidden rounded-xs border border-border bg-muted">
            <ProductThumbnail
              src={heroImage}
              alt={detail.name}
              className="size-full"
              placeholder="Gambar produk belum tersedia"
            />

            {discountPercent && discountPercent > 0 ? (
              <span className="absolute left-3 top-3 rounded-xs bg-danger px-2 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
                -{discountPercent}% OFF
              </span>
            ) : null}
          </div>
        </div>

        {/* Right Column: Sticky Buy Box */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <div className="space-y-5">
            {/* Category eyebrow */}
            {detail.category ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-danger">
                {detail.category.name}
              </p>
            ) : null}

            {/* Product Title */}
            <h1 className="font-display text-2xl font-black uppercase leading-tight tracking-tight text-foreground sm:text-3xl">
              {detail.name}
            </h1>

            {/* Price section with discount */}
            <div className="flex items-baseline gap-3 border-b border-border pb-4">
              <span className="font-display text-3xl font-black tabular-nums text-danger">
                {formatCurrency(currentPrice)}
              </span>
              {hasDiscount ? (
                <>
                  <span className="text-base tabular-nums text-muted-foreground line-through">
                    {formatCurrency(detail.base_price)}
                  </span>
                  <span className="rounded-xs bg-danger/10 px-2 py-0.5 text-xs font-black uppercase text-danger">
                    HEMAT {formatCurrency(detail.base_price - currentPrice)}
                  </span>
                </>
              ) : null}
            </div>

            {/* Urgency note */}
            <div className="flex items-center gap-2 rounded-xs border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="text-base">⚡</span>
              <span>SELLING FAST! Lebih dari 150+ orang melihat produk ini hari ini.</span>
            </div>

            {/* Color Swatches */}
            {colors.length > 0 ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    WARNA: <span className="text-muted-foreground">{selectedColor ?? colors[0]}</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const variant = variants.find(
                      (item) =>
                        item.size === (selectedSize ?? sizes[0]) &&
                        item.color === color,
                    );
                    const active = (selectedColor ?? colors[0]) === color;

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        aria-pressed={active}
                        className={cn(
                          "flex h-9 items-center gap-2 rounded-xs border-2 px-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                          active
                            ? "border-foreground bg-foreground text-background shadow-xs"
                            : "border-border bg-card text-foreground hover:border-foreground",
                        )}
                      >
                        {variant?.color_hex ? (
                          <span
                            aria-hidden="true"
                            className="size-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: variant.color_hex }}
                          />
                        ) : null}
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Size Selector */}
            {sizes.length > 0 ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    PILIH UKURAN: <span className="text-muted-foreground">{selectedSize ?? sizes[0]}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen((prev) => !prev)}
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    📏 PANDUAN UKURAN
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {sizes.map((size) => {
                    const active = (selectedSize ?? sizes[0]) === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSelectedSize(size);
                          setSelectedColor(null);
                        }}
                        aria-pressed={active}
                        className={cn(
                          "flex h-11 items-center justify-center rounded-xs border-2 text-xs font-black uppercase transition-all cursor-pointer",
                          active
                            ? "border-foreground bg-foreground text-background shadow-xs"
                            : "border-border bg-card text-foreground hover:border-foreground",
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Quantity and Add to Bag */}
            <div className="space-y-3 pt-2">
              {cartError ? <Alert tone="error">{cartError}</Alert> : null}
              {cartSuccess ? (
                <div className="rounded-xs border-2 border-green-600 bg-green-50 p-4 text-xs font-bold text-green-900 dark:bg-green-950/40 dark:text-green-300">
                  <p>✓ PRODUK BERHASIL DITAMBAHKAN KE KERANJANG!</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Link href="/cart" className={buttonClasses("primary", "sm")}>
                      LIHAT KERANJANG
                    </Link>
                    <button
                      type="button"
                      onClick={() => setCartSuccess(false)}
                      className="text-xs uppercase underline tracking-wider text-green-800 dark:text-green-200 cursor-pointer"
                    >
                      LANJUT BELANJA
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  JUMLAH:
                </span>
                <div className="flex items-center rounded-xs border-2 border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="flex size-9 items-center justify-center text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-30 cursor-pointer"
                    aria-label="Kurangi jumlah"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-mono text-sm font-bold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="flex size-9 items-center justify-center text-sm font-bold text-foreground transition-colors hover:bg-muted cursor-pointer"
                    aria-label="Tambah jumlah"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* High impact Fashion Nova Add to Bag Button */}
              <Button
                size="lg"
                fullWidth
                loading={addingToCart}
                disabled={!selectedVariant}
                onClick={async () => {
                  if (!isAuthenticated) {
                    router.push(`/auth/login?redirect=/products/${slug}`);
                    return;
                  }

                  if (!selectedVariant) {
                    setCartError("Pilih ukuran dan warna terlebih dahulu.");
                    return;
                  }

                  setAddingToCart(true);
                  setCartError(null);
                  setCartSuccess(false);

                  try {
                    await addItem(selectedVariant.id, quantity);
                    setCartSuccess(true);
                  } catch (error) {
                    setCartError(getApiErrorMessage(error));
                  } finally {
                    setAddingToCart(false);
                  }
                }}
                className="h-14 rounded-xs text-sm font-black uppercase tracking-[0.2em]"
              >
                {!selectedVariant
                  ? "PILIH VARIAN TERLEBIH DAHULU"
                  : "TAMBAH KE KERANJANG (ADD TO BAG)"}
              </Button>
            </div>

            {/* Fast-fashion trust strip */}
            <div className="space-y-2 rounded-xs border border-border bg-muted/40 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="text-sm">🚚</span>
                <span>GRATIS ONGKIR UNTUK PESANAN DI ATAS RP 250.000</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="text-sm">🔄</span>
                <span>GARANSI 3 HARI RETUR / TUKAR UKURAN</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="text-sm">🛡️</span>
                <span>100% PRODUK ORIGINAL QAIREEN COLLECTION</span>
              </div>
            </div>

            {/* Collapsible Accordions: Description, Materials, Size Guide */}
            <div className="border-t border-border divide-y divide-border pt-2">
              {/* Description Accordion */}
              {detail.description ? (
                <div className="py-3">
                  <button
                    type="button"
                    onClick={() => setDescOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between text-xs font-black uppercase tracking-wider text-foreground cursor-pointer"
                  >
                    <span>DESKRIPSI PRODUK</span>
                    <span>{descOpen ? "−" : "+"}</span>
                  </button>
                  {descOpen ? (
                    <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                      {detail.description}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Material & Care Accordion */}
              {detail.material || detail.care_instructions ? (
                <div className="py-3">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between text-xs font-black uppercase tracking-wider text-foreground cursor-pointer"
                  >
                    <span>BAHAN &amp; PERAWATAN</span>
                    <span>{detailsOpen ? "−" : "+"}</span>
                  </button>
                  {detailsOpen ? (
                    <dl className="mt-3 space-y-2 text-xs">
                      {detail.material ? (
                        <div className="flex gap-4">
                          <dt className="w-24 shrink-0 font-bold text-foreground">Bahan:</dt>
                          <dd className="text-muted-foreground">{detail.material}</dd>
                        </div>
                      ) : null}
                      {detail.care_instructions ? (
                        <div className="flex gap-4">
                          <dt className="w-24 shrink-0 font-bold text-foreground">Perawatan:</dt>
                          <dd className="whitespace-pre-line text-muted-foreground">
                            {detail.care_instructions}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
              ) : null}

              {/* Size Guide Accordion */}
              {detail.size_guides.length > 0 ? (
                <div className="py-3">
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between text-xs font-black uppercase tracking-wider text-foreground cursor-pointer"
                  >
                    <span>PANDUAN UKURAN (SIZE CHART)</span>
                    <span>{sizeGuideOpen ? "−" : "+"}</span>
                  </button>
                  {sizeGuideOpen ? (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            <th className="py-2 pr-2">Ukuran</th>
                            <th className="py-2 pr-2">Dada (cm)</th>
                            <th className="py-2 pr-2">Pinggang (cm)</th>
                            <th className="py-2 pr-2">Pinggul (cm)</th>
                            <th className="py-2">Panjang (cm)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {detail.size_guides.map((guide) => (
                            <tr key={guide.id}>
                              <td className="py-2 pr-2 font-bold text-foreground">
                                {guide.size_label}
                              </td>
                              <td className="py-2 pr-2 text-muted-foreground">{guide.chest_cm ?? "—"}</td>
                              <td className="py-2 pr-2 text-muted-foreground">{guide.waist_cm ?? "—"}</td>
                              <td className="py-2 pr-2 text-muted-foreground">{guide.hip_cm ?? "—"}</td>
                              <td className="py-2 text-muted-foreground">{guide.length_cm ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Product Reviews Section */}
      <div className="mt-20 border-t-2 border-foreground pt-12">
        <ProductReviewsSection slug={slug} />
      </div>
    </div>
  );
}
