import type { Metadata } from "next";
import { Suspense } from "react";

import { EditBrandView } from "@/components/admin/EditBrandView";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Ubah Identitas Toko",
};

export default function EditBrandPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat identitas toko…
        </div>
      }
    >
      <EditBrandView />
    </Suspense>
  );
}
