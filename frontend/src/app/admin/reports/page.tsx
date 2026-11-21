import type { Metadata } from "next";
import { Suspense } from "react";

import { ReportsView } from "@/components/admin/reports/ReportsView";

export const metadata: Metadata = {
  title: "Laporan & Analitik Bisnis · Admin",
};

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted/40" />}>
      <ReportsView />
    </Suspense>
  );
}
