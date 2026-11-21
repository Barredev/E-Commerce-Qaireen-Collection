import type { Metadata } from "next";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = {
  title: "Tambah Kategori",
};

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Kategori"
        description="Kategori induk tampil sebagai kelompok; sub-kategori tampil sebagai pilihan."
      />
      <CategoryForm />
    </div>
  );
}
