import type { Metadata } from "next";
import { Suspense } from "react";

import { EditWarehouseView } from "@/components/admin/EditWarehouseView";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Ubah Gudang",
};

export default function EditWarehousePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat gudang…
        </div>
      }
    >
      <EditWarehouseView />
    </Suspense>
  );
}
