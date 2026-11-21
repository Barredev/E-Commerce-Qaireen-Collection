"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { AdminNav, AdminNavSkeleton } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { logout } from "@/lib/api/auth";
import { SITE_NAME } from "@/lib/constants";
import { useAuthStore } from "@/lib/stores/authStore";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [menuOpen, setMenuOpen] = useState(false);

  const isStaff = user?.role === "admin" || user?.role === "warehouse";
  const isWarehouseAllowed =
    user?.role !== "warehouse" || pathname.startsWith("/admin/inventory");
  const authorized = hydrated && isStaff && isWarehouseAllowed;

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname || "/admin")}`);
      return;
    }

    if (user.role !== "admin" && user.role !== "warehouse") {
      router.replace("/");
      return;
    }

    if (user.role === "warehouse" && !pathname.startsWith("/admin/inventory")) {
      router.replace("/admin/inventory/stocks");
    }
  }, [hydrated, user, pathname, router]);

  async function handleLogout() {
    clearAuth();

    try {
      await logout();
    } catch {
      // Sesi lokal sudah dibersihkan; abaikan kegagalan revoke token.
    }

    router.replace("/");
  }

  if (!authorized) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="size-6 text-muted-foreground" />
        <span className="sr-only">Memeriksa akses…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Buka menu admin"
            className="rounded-md border border-border p-2 text-foreground md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>

          <Link
            href={user.role === "warehouse" ? "/admin/inventory/stocks" : "/admin"}
            className="font-display text-base uppercase tracking-[0.12em] text-foreground"
          >
            {SITE_NAME}
            <span className="ml-2 font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {user.role === "warehouse" ? "Gudang" : "Admin"}
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/"
              className="hidden text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Lihat toko
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <Suspense fallback={<AdminNavSkeleton />}>
              <AdminNav onNavigate={() => setMenuOpen(false)} />
            </Suspense>
          </div>
        ) : null}
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border p-5 md:block">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Menu
          </p>
          <Suspense fallback={<AdminNavSkeleton />}>
            <AdminNav />
          </Suspense>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
