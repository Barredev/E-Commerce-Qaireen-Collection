import type { Metadata } from "next";
import { Suspense } from "react";

import { EditPromotionView } from "@/components/admin/promotions/EditPromotionView";

export const metadata: Metadata = {
  title: "Edit Kupon Promosi · Admin",
};

export default function EditPromotionPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted/40" />}>
      <EditPromotionView />
    </Suspense>
  );
}
