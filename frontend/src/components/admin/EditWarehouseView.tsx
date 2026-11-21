"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/admin/PageHeader";
import { WarehouseForm } from "@/components/admin/WarehouseForm";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { fetchWarehouse } from "@/lib/api/inventory";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function EditWarehouseView() {
  const { id } = useParams<{ id: string }>();
  const warehouse = useAsyncData(
    () => fetchWarehouse(id),
    `admin-warehouse-${id}`,
  );

  if (!warehouse.data) {
    if (warehouse.loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat gudang…
        </div>
      );
    }

    return (
      <Alert tone="error">{warehouse.error ?? "Gudang tidak ditemukan."}</Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ubah Gudang: ${warehouse.data.name}`}
        description="Perubahan berlaku untuk penerimaan stok berikutnya."
      />
      <WarehouseForm warehouse={warehouse.data} />
    </div>
  );
}
