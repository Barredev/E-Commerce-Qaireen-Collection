"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ImageManager } from "@/components/admin/ImageManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantManager } from "@/components/admin/VariantManager";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { fetchAdminProduct } from "@/lib/api/products";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function EditProductView() {
  const { id } = useParams<{ id: string }>();
  const product = useAsyncData(
    () => fetchAdminProduct(id),
    `admin-product-${id}`,
  );

  // Setelah menambah varian/gambar, `reload()` berjalan; data lama tetap
  // dirender agar form produk tidak kehilangan perubahan yang belum disimpan.
  if (!product.data) {
    if (product.loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat produk…
        </div>
      );
    }

    return (
      <Alert tone="error">{product.error ?? "Produk tidak ditemukan."}</Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ubah Produk: ${product.data.name}`}
        description="Perubahan data produk langsung terlihat di katalog toko."
        action={
          <Link
            href={`/products/${product.data.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Lihat di toko ↗
          </Link>
        }
      />

      <ProductForm product={product.data} />

      <VariantManager
        productId={product.data.id}
        variants={product.data.variants ?? []}
        onChanged={product.reload}
      />

      <ImageManager
        productId={product.data.id}
        images={product.data.images ?? []}
        onChanged={product.reload}
      />
    </div>
  );
}
