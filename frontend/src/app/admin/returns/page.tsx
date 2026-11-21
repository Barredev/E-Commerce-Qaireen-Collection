import type { Metadata } from "next";

import { ReturnsTable } from "@/components/admin/ReturnsTable";

export const metadata: Metadata = {
  title: "Kelola Retur",
  description: "Verifikasi barang retur dan proses pengembalian dana pelanggan.",
};

export default function AdminReturnsPage() {
  return <ReturnsTable />;
}
