"use client";

import { fetchInventoryVariants } from "@/lib/api/inventory";
import { useAsyncData } from "./useAsyncData";

export interface VariantOption {
  variantId: string;
  label: string;
}

/**
 * Daftar varian untuk pemilih stok, diambil dari endpoint lookup inventori
 * agar dapat diakses oleh admin maupun staf gudang.
 */
export function useVariantOptions(search: string) {
  const variants = useAsyncData(
    () =>
      fetchInventoryVariants({
        q: search.trim() || undefined,
        per_page: 50,
      }),
    `variant-options-${search.trim()}`,
  );

  const options: VariantOption[] = (variants.data ?? []).map((variant) => ({
    variantId: variant.id,
    label: `${variant.product?.name ?? "Produk"} — ${variant.label} (${variant.sku})`,
  }));

  return {
    options,
    loading: variants.loading,
    error: variants.error,
  };
}
