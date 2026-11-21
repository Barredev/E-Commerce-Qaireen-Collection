import type { Metadata } from "next";

import { ReceiptsTable } from "@/components/admin/ReceiptsTable";

export const metadata: Metadata = {
  title: "Penerimaan Stok",
};

export default function AdminReceiptsPage() {
  return <ReceiptsTable />;
}
