import type { Metadata } from "next";

import { AdminOverview } from "@/components/admin/AdminOverview";

export const metadata: Metadata = {
  title: "Ringkasan",
};

export default function AdminDashboardPage() {
  return <AdminOverview />;
}
