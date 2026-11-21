import type { Metadata } from "next";

import { AdjustmentForm } from "@/components/admin/AdjustmentForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = {
  title: "Penyesuaian Stok",
};

export default function AdminAdjustmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Penyesuaian Stok"
        description="Koreksi jumlah stok hasil hitung ulang. Setiap penyesuaian tercatat di riwayat pergerakan."
      />
      <AdjustmentForm />
    </div>
  );
}
