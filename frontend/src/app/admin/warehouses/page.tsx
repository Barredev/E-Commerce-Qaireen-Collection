import type { Metadata } from "next";

import { WarehousesManager } from "@/components/admin/WarehousesManager";

export const metadata: Metadata = {
  title: "Gudang",
};

export default function AdminWarehousesPage() {
  return <WarehousesManager />;
}
