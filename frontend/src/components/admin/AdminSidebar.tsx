"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/lib/stores/authStore";
import type { UserRole } from "@/lib/types/user";
import { cn } from "@/lib/utils/cn";

interface AdminNavItem {
  href: string;
  label: string;
  exact?: boolean;
  roles?: UserRole[];
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Ringkasan", exact: true, roles: ["admin"] },
  { href: "/admin/reports", label: "Laporan & Analitik", roles: ["admin"] },
  { href: "/admin/orders", label: "Pesanan", roles: ["admin"] },
  { href: "/admin/returns", label: "Retur", roles: ["admin"] },
  { href: "/admin/reviews", label: "Ulasan Produk", roles: ["admin"] },
  { href: "/admin/promotions", label: "Promosi & Kupon", roles: ["admin"] },
  { href: "/admin/products", label: "Produk", roles: ["admin"] },
  { href: "/admin/brands", label: "Identitas Toko", roles: ["admin"] },
  { href: "/admin/categories", label: "Kategori", roles: ["admin"] },
  { href: "/admin/warehouses", label: "Gudang", roles: ["admin"] },
  {
    href: "/admin/inventory/stocks",
    label: "Stok",
    roles: ["admin", "warehouse"],
  },
  {
    href: "/admin/inventory/receipts",
    label: "Penerimaan Stok",
    roles: ["admin", "warehouse"],
  },
  {
    href: "/admin/inventory/adjustments",
    label: "Penyesuaian",
    roles: ["admin", "warehouse"],
  },
  {
    href: "/admin/inventory/movements",
    label: "Pergerakan Stok",
    roles: ["admin", "warehouse"],
  },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role);

  const visibleItems = ADMIN_NAV.filter(
    (item) => !item.roles || (role ? item.roles.includes(role) : false),
  );

  return (
    <nav className="flex flex-col">
      {visibleItems.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              // Item aktif ditandai garis kiri 2px + teks tegas, bukan blok
              // hitam penuh — supaya sidebar tetap terasa seperti indeks.
              "-ml-px border-l-2 py-2 pl-3 text-[13px] transition-colors",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNavSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {ADMIN_NAV.map((item) => (
        <div key={item.href} className="h-4 w-4/5 animate-pulse bg-muted" />
      ))}
    </div>
  );
}
