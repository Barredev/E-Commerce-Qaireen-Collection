import type { Metadata } from "next";

import { PromotionsTable } from "@/components/admin/promotions/PromotionsTable";

export const metadata: Metadata = {
  title: "Promosi & Kupon · Admin",
};

export default function AdminPromotionsPage() {
  return <PromotionsTable />;
}
