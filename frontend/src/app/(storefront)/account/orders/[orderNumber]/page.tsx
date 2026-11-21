import type { Metadata } from "next";

import { CustomerOrderDetail } from "@/components/storefront/CustomerOrderDetail";

export const metadata: Metadata = {
  title: "Rincian Pesanan",
  description: "Rincian lengkap status dan transaksi pesanan Anda.",
};

export default function OrderDetailPage() {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <CustomerOrderDetail />
    </div>
  );
}
