import type { Metadata } from "next";

import { BrandsTable } from "@/components/admin/BrandsTable";

export const metadata: Metadata = {
  title: "Identitas Toko",
};

export default function AdminBrandsPage() {
  return <BrandsTable />;
}
