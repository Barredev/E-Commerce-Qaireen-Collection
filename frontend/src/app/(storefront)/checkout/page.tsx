import type { Metadata } from "next";

import { CheckoutView } from "@/components/storefront/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Selesaikan pembelian produk Anda secara aman.",
};

export default function CheckoutPage() {
  return (
    <div className="py-8">
      <CheckoutView />
    </div>
  );
}
