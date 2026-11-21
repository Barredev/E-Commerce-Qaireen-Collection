import type { Metadata } from "next";
import Link from "next/link";

import { CustomerOrdersList } from "@/components/storefront/CustomerOrdersList";

export const metadata: Metadata = {
  title: "Pesanan Saya & Lacak Pengiriman",
  description: "Riwayat dan status pesanan belanja Anda di Qaireen Collection.",
};

export default function AccountOrdersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
            ORDER HISTORY
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            PESANAN SAYA
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Lacak status pengiriman, nomor resi, dan riwayat pesanan Anda.
          </p>
        </div>
        <Link
          href="/account"
          className="text-xs font-black uppercase tracking-wider text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
        >
          ← KEMBALI KE AKUN
        </Link>
      </div>

      <CustomerOrdersList />
    </div>
  );
}
