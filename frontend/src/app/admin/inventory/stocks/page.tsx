import type { Metadata } from "next";

import { StocksTable } from "@/components/admin/StocksTable";

export const metadata: Metadata = {
  title: "Stok",
};

export default function AdminStocksPage() {
  return <StocksTable />;
}
