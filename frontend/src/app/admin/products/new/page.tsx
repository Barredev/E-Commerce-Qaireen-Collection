import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Tambah Produk",
};

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Produk"
        description="Lengkapi data produk, minimal satu varian, dan gambar."
      />
      <ProductForm />
    </div>
  );
}
