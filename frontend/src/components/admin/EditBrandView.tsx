"use client";

import { useParams } from "next/navigation";

import { BrandForm } from "@/components/admin/BrandForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { fetchAdminBrand } from "@/lib/api/brands";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function EditBrandView() {
  const { id } = useParams<{ id: string }>();
  const brand = useAsyncData(() => fetchAdminBrand(id), `admin-brand-${id}`);

  // Selama pemuatan ulang (mis. setelah menyimpan) data lama dipertahankan
  // supaya form tidak di-unmount dan isian yang belum disimpan tidak hilang.
  if (!brand.data) {
    if (brand.loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat identitas toko…
        </div>
      );
    }

    return (
      <Alert tone="error">
        {brand.error ?? "Identitas toko tidak ditemukan."}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ubah Identitas Toko: ${brand.data.name}`}
        description="Perubahan akan langsung terlihat di storefront."
      />
      <BrandForm brand={brand.data} />
    </div>
  );
}
