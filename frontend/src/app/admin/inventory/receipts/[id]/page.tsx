import type { Metadata } from "next";
import { Suspense } from "react";

import { ReceiptDetail } from "@/components/admin/ReceiptDetail";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Detail Penerimaan Stok",
};

export default function ReceiptDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat penerimaan…
        </div>
      }
    >
      <ReceiptDetail />
    </Suspense>
  );
}
