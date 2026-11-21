"use client";

import Link from "next/link";

import { HomeHero } from "@/components/storefront/HomeHero";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/storefront/ProductGrid";
import { PromotionCards } from "@/components/storefront/PromotionCards";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fetchCategoryTree } from "@/lib/api/categories";
import { fetchProducts } from "@/lib/api/products";
import { SITE_DESCRIPTION } from "@/lib/constants";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

const textLinkClasses =
  "text-xs font-black uppercase tracking-[0.14em] text-foreground underline decoration-2 underline-offset-4 transition-colors hover:text-danger hover:decoration-danger";

export default function HomePage() {
  const featured = useAsyncData(
    () => fetchProducts({ featured: true, per_page: 8 }),
    "home-featured",
  );
  const latest = useAsyncData(
    () => fetchProducts({ sort: "newest", per_page: 8 }),
    "home-latest",
  );
  const categories = useAsyncData(() => fetchCategoryTree(), "home-categories");

  return (
    <div className="flex flex-col gap-16 pb-20 sm:gap-24">
      {/* 1. Full-bleed Hero Billboard */}
      <HomeHero />

      {/* 2. Active Promotions / Coupon Strip */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="PROMO HARI INI"
          title="KLAIM VOUCHER DISKON"
          description="Gunakan kode promo berikut saat checkout untuk mendapatkan potongan harga eksklusif."
          action={
            <Link href="/products" className={textLinkClasses}>
              BELANJA SEMUA →
            </Link>
          }
        />

        <div className="mt-8">
          <PromotionCards />
        </div>
      </section>

      {/* 3. Fast Fashion Categories Grid (High Impact Tiles) */}
      <section className="border-y border-border bg-muted/30 py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="JELAJAHI GAYA"
            title="KATEGORI PILIHAN"
            description="Temukan outfit sesuai gaya dan kebutuhan harian Anda."
            action={
              <Link href="/categories" className={textLinkClasses}>
                SEMUA KATEGORI ({categories.data?.length ?? 0}) →
              </Link>
            }
          />

          <div className="mt-8">
            {categories.loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-xs bg-muted"
                  />
                ))}
              </div>
            ) : categories.error ? (
              <Alert tone="error">{categories.error}</Alert>
            ) : categories.data && categories.data.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {categories.data.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xs border-2 border-border bg-card p-4 transition-all hover:border-foreground hover:shadow-md"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {cat.products_count ?? 0} PRODUK
                      </span>
                      <h3 className="mt-1 font-display text-base font-black uppercase tracking-tight text-foreground group-hover:text-danger">
                        {cat.name}
                      </h3>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-foreground">
                      <span>BELANJA</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Kategori belum tersedia"
                description="Kategori produk akan muncul di sini setelah ditambahkan oleh admin."
              />
            )}
          </div>
        </div>
      </section>

      {/* 4. Best Sellers / Trending Section */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="SEDANG TREN"
          title="PRODUK UNGGULAN &amp; BEST SELLER"
          description="Koleksi paling banyak dicari dan terlaris pekan ini."
          action={
            <Link href="/products" className={textLinkClasses}>
              LIHAT SEMUA BEST SELLER →
            </Link>
          }
        />

        <div className="mt-8">
          {featured.loading ? (
            <ProductGridSkeleton count={8} />
          ) : featured.error ? (
            <Alert tone="error">{featured.error}</Alert>
          ) : featured.data && featured.data.data.length > 0 ? (
            <ProductGrid products={featured.data.data} />
          ) : (
            <EmptyState
              title="Belum ada produk unggulan"
              description="Tandai produk sebagai unggulan dari dashboard admin."
            />
          )}
        </div>
      </section>

      {/* 5. Mid-page Urgency Billboard Banner */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-xs bg-black px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-500">
            LIMITED TIME OFFER
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-5xl md:text-6xl">
            TAMPIL LEBIH TRENDY DENGAN HARGA TERJANGKAU
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm text-neutral-300">
            Update lemari pakaian Anda setiap minggu dengan tren busana terkini tanpa menguras kantong.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/products?sort=newest"
              className="rounded-xs bg-white px-8 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition-colors hover:bg-neutral-200"
            >
              LIHAT KOLEKSI TERBARU
            </Link>
          </div>
        </div>
      </section>

      {/* 6. New In / Latest Arrivals */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="BARU SAJA RILIS"
          title="PRODUK TERBARU MINGGU INI"
          description="Inspirasi gaya paling segar yang baru saja masuk ke katalog."
          action={
            <Link href="/products?sort=newest" className={textLinkClasses}>
              LIHAT SEMUA TERBARU →
            </Link>
          }
        />

        <div className="mt-8">
          {latest.loading ? (
            <ProductGridSkeleton count={8} />
          ) : latest.error ? (
            <Alert tone="error">{latest.error}</Alert>
          ) : latest.data && latest.data.data.length > 0 ? (
            <ProductGrid products={latest.data.data} />
          ) : (
            <EmptyState
              title="Belum ada produk baru"
              description="Produk yang baru dirilis akan tampil di sini."
            />
          )}
        </div>
      </section>

      {/* 7. Brand Value Guarantee Strip */}
      <section className="border-t border-border bg-muted/40 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 text-center sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <span className="text-2xl">✨</span>
              <h4 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
                KUALITAS TERJAMIN
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Material pilihan dengan standar jahitan rapi.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">⚡</span>
              <h4 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
                PENGIRIMAN CEPAT
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Diproses dan diserahkan ke kurir di hari yang sama.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">💬</span>
              <h4 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
                CS RESPONSIF
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Bantuan cepat untuk ukuran dan kendala pengiriman.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">💳</span>
              <h4 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
                BAYAR AMAN
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Dukungan transfer bank, QRIS, dan COD.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
