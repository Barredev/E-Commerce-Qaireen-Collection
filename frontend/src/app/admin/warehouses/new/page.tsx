import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/PageHeader";
import { WarehouseForm } from "@/components/admin/WarehouseForm";

export const metadata: Metadata = {
  title: "Tambah Gudang",
};

export default function NewWarehousePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Gudang"
        description="Gudang pertama otomatis menjadi gudang default."
      />
      <WarehouseForm />
    </div>
  );
}
