"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { fetchActivePromotions } from "@/lib/api/promotions";
import type { Promotion } from "@/lib/types/promotion";
import { formatCurrency } from "@/lib/utils/formatCurrency";

function promoHeadline(promotion: Promotion): string {
  switch (promotion.type) {
    case "percentage":
      return `DISKON ${promotion.value}%`;
    case "fixed_amount":
      return `POTONGAN ${formatCurrency(promotion.value)}`;
    case "free_shipping":
      return "GRATIS ONGKIR";
    default:
      return promotion.name.toUpperCase();
  }
}

export function PromotionCards() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const promotions = useAsyncData(
    () => fetchActivePromotions(3),
    "home-promotions",
  );

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      // Fallback diam
    }
  }

  if (promotions.loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xs bg-muted" />
        ))}
      </div>
    );
  }

  if (promotions.error) {
    return <Alert tone="error">{promotions.error}</Alert>;
  }

  if (!promotions.data || promotions.data.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {promotions.data.map((promotion) => (
        <div
          key={promotion.id}
          className="relative flex flex-col justify-between overflow-hidden rounded-xs border-2 border-foreground bg-card p-5 shadow-xs transition-transform hover:-translate-y-0.5"
        >
          {/* Top urgency tag */}
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-xs bg-danger px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              VOUCHER SPESIAL
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {promotion.applies_to_label}
            </span>
          </div>

          <div className="mt-3">
            <p className="font-display text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
              {promoHeadline(promotion)}
            </p>
            {promotion.description ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {promotion.description}
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                KODE KUPON:
              </span>
              <p className="font-mono text-sm font-black tracking-wider text-foreground">
                {promotion.code}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(promotion.code)}
              className="rounded-xs bg-foreground px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-background transition-colors hover:bg-foreground/80 cursor-pointer"
            >
              {copiedCode === promotion.code ? "TERSALIN! ✓" : "SALIN KODE"}
            </button>
          </div>

          {promotion.min_purchase ? (
            <p className="mt-2 text-[10px] font-medium text-muted-foreground">
              *Syarat min. belanja {formatCurrency(promotion.min_purchase)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
