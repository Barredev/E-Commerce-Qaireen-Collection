import type { Metadata } from "next";

import { OrdersTable } from "@/components/admin/OrdersTable";

export const metadata: Metadata = {
  title: "Kelola Pesanan",
  description: "Manajemen status pesanan, pembayaran, dan pengiriman.",
};

export default function AdminOrdersPage() {
  return <OrdersTable />;
}
