import type { Metadata } from "next";

import { MovementsTable } from "@/components/admin/MovementsTable";

export const metadata: Metadata = {
  title: "Pergerakan Stok",
};

export default function AdminMovementsPage() {
  return <MovementsTable />;
}
