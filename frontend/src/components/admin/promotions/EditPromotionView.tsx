"use client";

import { useParams } from "next/navigation";

import { PromotionForm } from "@/components/admin/promotions/PromotionForm";
import { Alert } from "@/components/ui/Alert";
import { fetchAdminPromotionDetail } from "@/lib/api/promotions";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function EditPromotionView() {
  const params = useParams<{ id: string }>();
  const promo = useAsyncData(
    () => fetchAdminPromotionDetail(params.id),
    `admin-promo-${params.id}`,
  );

  if (promo.loading) {
    return <div className="h-64 animate-pulse rounded-md bg-muted/40" />;
  }

  if (promo.error || !promo.data) {
    return <Alert variant="error">{promo.error ?? "Kupon tidak ditemukan."}</Alert>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Edit Kupon Promosi: {promo.data.code}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Perbarui aturan diskon, masa berlaku, atau batasan pemakaian.
        </p>
      </div>
      <PromotionForm initial={promo.data} />
    </div>
  );
}
