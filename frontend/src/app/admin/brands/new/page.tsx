import type { Metadata } from "next";

import { BrandForm } from "@/components/admin/BrandForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = {
  title: "Tambah Identitas Toko",
};

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Identitas Toko"
        description="Identitas toko langsung dipakai katalog jika ditandai aktif."
      />
      <BrandForm />
    </div>
  );
}
