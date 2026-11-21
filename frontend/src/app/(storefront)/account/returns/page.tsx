import type { Metadata } from "next";
import Link from "next/link";

import { CustomerReturnsList } from "@/components/storefront/CustomerReturnsList";

export const metadata: Metadata = {
  title: "Retur Saya",
  description: "Riwayat pengajuan retur dan status pengembalian dana Anda.",
};

export default function AccountReturnsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
            RETURNS &amp; EXCHANGES
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            RETUR SAYA
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Pantau pengajuan retur barang dan status pengembalian dana Anda.
          </p>
        </div>
        <Link
          href="/account"
          className="text-xs font-black uppercase tracking-wider text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
        >
          ← PROFIL AKUN
        </Link>
      </div>

      <CustomerReturnsList />
    </div>
  );
}
