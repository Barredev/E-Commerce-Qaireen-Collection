import type { Metadata } from "next";
import { Suspense } from "react";

import { EditCategoryView } from "@/components/admin/EditCategoryView";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Ubah Kategori",
};

export default function EditCategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat kategori…
        </div>
      }
    >
      <EditCategoryView />
    </Suspense>
  );
}
