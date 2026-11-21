import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Detail Pesanan",
  description: "Kelola status dan pengiriman pesanan.",
};

export default function AdminOrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Memuat data pesanan…
        </div>
      }
    >
      <AdminOrderDetail />
    </Suspense>
  );
}
