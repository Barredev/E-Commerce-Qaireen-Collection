import type { Metadata } from "next";

import { ProductsTable } from "@/components/admin/ProductsTable";

export const metadata: Metadata = {
  title: "Produk",
};

export default function AdminProductsPage() {
  return <ProductsTable />;
}
