import type { Metadata } from "next";
import { Suspense } from "react";

import { EditProductView } from "@/components/admin/EditProductView";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Ubah Produk",
};

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat produk…
        </div>
      }
    >
      <EditProductView />
    </Suspense>
  );
}
