import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin",
  },
};

function AdminShellFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner className="size-6 text-muted-foreground" />
      <span className="sr-only">Memuat portal…</span>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
