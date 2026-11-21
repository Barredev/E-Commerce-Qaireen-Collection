import type { Metadata } from "next";

import { CartView } from "@/components/storefront/CartView";

export const metadata: Metadata = {
  title: "Keranjang Belanja",
  description: "Daftar produk dalam keranjang belanja Anda.",
};

export default function CartPage() {
  return (
    <div className="py-8">
      <CartView />
    </div>
  );
}
