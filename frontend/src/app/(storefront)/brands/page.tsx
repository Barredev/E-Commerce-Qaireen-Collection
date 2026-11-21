import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Produk",
};

/**
 * Halaman brand publik sudah tidak dipakai. URL lama dan bookmark diarahkan
 * ke katalog supaya tidak berakhir di halaman 404.
 */
export default function BrandsPage() {
  redirect("/products");
}
