"use client";

import Link from "next/link";

import { fetchActivePromotions } from "@/lib/api/promotions";
import { SITE_DESCRIPTION } from "@/lib/constants";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { Promotion } from "@/lib/types/promotion";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const HERO_PHOTO = "/hero-01.jpg";

function heroPromoSummary(promotion: Promotion): string {
  switch (promotion.type) {
    case "percentage":
      return `Diskon ${promotion.value}%`;
    case "fixed_amount":
      return `Potongan ${formatCurrency(promotion.value)}`;
    case "free_shipping":
      return "Gratis Ongkir";
    default:
      return promotion.name;
  }
}

export function HomeHero() {
  const promotions = useAsyncData(
    () => fetchActivePromotions(1),
    "hero-active-promotion",
  );
  const featuredPromo = promotions.data?.[0] ?? null;

  return (
    <section className="relative isolate overflow-hidden bg-black text-white">
      {/* Background photo & scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: `url(${HERO_PHOTO})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/30"
      />

      <div className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        {/* Flash Sale / Active Promo Pill Tag */}
        <div className="inline-flex items-center gap-2 self-start rounded-xs bg-danger px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white shadow-md">
          <span className="size-2 animate-ping rounded-full bg-white" />
          {featuredPromo ? featuredPromo.name : "KOLEKSI TERBARU MUSIM INI"}
        </div>

        {/* Billboard Headline */}
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          {featuredPromo ? (
            <>
              <span className="text-rose-500">
                {heroPromoSummary(featuredPromo)}
              </span>{" "}
              KOLEKSI PILIHAN
            </>
          ) : (
            <>
              GAYA MODERN{" "}
              <span className="text-rose-500">UNTUK SETIAP HARI</span>
            </>
          )}
        </h1>

        <p className="mt-4 max-w-xl text-sm font-medium tracking-wide text-neutral-300 sm:text-base">
          {featuredPromo ? (
            <>
              Gunakan kode kupon{" "}
              <span className="rounded-xs bg-white/20 px-2 py-0.5 font-mono font-bold text-white">
                {featuredPromo.code}
              </span>{" "}
              saat checkout. {featuredPromo.description ?? SITE_DESCRIPTION}
            </>
          ) : (
            SITE_DESCRIPTION
          )}
        </p>

        {/* Dual Call To Actions */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center rounded-xs bg-white px-8 text-xs font-black uppercase tracking-[0.16em] text-black transition-all hover:bg-neutral-200 active:scale-95 shadow-lg cursor-pointer"
          >
            BELANJA SEKARANG
          </Link>
          <Link
            href="/products?sort=newest"
            className="inline-flex h-12 items-center justify-center rounded-xs border-2 border-white bg-transparent px-8 text-xs font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-white hover:text-black active:scale-95 cursor-pointer"
          >
            KOLEKSI TERBARU →
          </Link>
        </div>

        {/* Trust Badges Strip under Hero */}
        <div className="mt-12 grid grid-cols-2 gap-4 border-t border-white/20 pt-6 sm:grid-cols-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <span className="text-rose-500 text-lg">⚡</span>
            <span>Rilis Produk Tiap Pekan</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <span className="text-rose-500 text-lg">🚚</span>
            <span>Gratis Ongkir &gt; 250rb</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <span className="text-rose-500 text-lg">🔄</span>
            <span>Garansi Retur 14 Hari</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <span className="text-rose-500 text-lg">🛡️</span>
            <span>Garansi Pembeli 100%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
