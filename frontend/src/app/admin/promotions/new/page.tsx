import type { Metadata } from "next";

import { PromotionForm } from "@/components/admin/promotions/PromotionForm";

export const metadata: Metadata = {
  title: "Buat Kupon Promosi Baru · Admin",
};

export default function NewPromotionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Buat Kupon Promosi Baru</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Atur kode voucher diskon, tipe potongan, batas belanja, dan aturan penanggung beban diskon.
        </p>
      </div>
      <PromotionForm />
    </div>
  );
}
