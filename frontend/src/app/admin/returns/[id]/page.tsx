import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminReturnDetail } from "@/components/admin/AdminReturnDetail";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Detail Retur",
  description: "Verifikasi barang retur dan catat pengembalian dana.",
};

export default function AdminReturnDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Memuat detail retur…
        </div>
      }
    >
      <AdminReturnDetail />
    </Suspense>
  );
}
