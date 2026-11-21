"use client";

import { useParams } from "next/navigation";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { fetchAdminCategory } from "@/lib/api/categories";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function EditCategoryView() {
  const { id } = useParams<{ id: string }>();
  const category = useAsyncData(
    () => fetchAdminCategory(id),
    `admin-category-${id}`,
  );

  // Selama pemuatan ulang data lama dipertahankan agar form tidak ter-unmount.
  if (!category.data) {
    if (category.loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat kategori…
        </div>
      );
    }

    return (
      <Alert tone="error">{category.error ?? "Kategori tidak ditemukan."}</Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ubah Kategori: ${category.data.name}`}
        description="Perubahan akan langsung terlihat di katalog toko."
      />
      <CategoryForm category={category.data} />
    </div>
  );
}
