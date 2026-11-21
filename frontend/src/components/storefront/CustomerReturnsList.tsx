"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Pagination } from "@/components/shared/Pagination";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { fetchMyReturns } from "@/lib/api/returns";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useAuthStore } from "@/lib/stores/authStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { returnStatusTone } from "@/lib/utils/returnStatus";

function ReturnsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;

  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  const returns = useAsyncData(
    async () => {
      if (!user) {
        return null;
      }

      return fetchMyReturns(page);
    },
    `${user?.id ?? "guest"}:${page}`,
  );

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner /> MEMUAT...
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="MASUK UNTUK MELIHAT RETUR"
        description="Riwayat pengajuan retur tersimpan di akun Anda."
        action={
          <Link
            href="/auth/login?redirect=/account/returns"
            className={buttonClasses("primary", "sm")}
          >
            MASUK KE AKUN
          </Link>
        }
      />
    );
  }

  const data = returns.data?.data ?? [];
  const meta = returns.data?.meta;

  if (returns.loading && returns.data === null) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner /> MEMUAT RIWAYAT RETUR...
      </div>
    );
  }

  if (returns.error && returns.data === null) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{returns.error}</Alert>
        <Button size="sm" variant="outline" onClick={returns.reload}>
          COBA LAGI
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="BELUM ADA PENGAJUAN RETUR"
        description="Buka detail pesanan yang sudah diterima, lalu pilih Ajukan Retur bila ada barang yang perlu dikembalikan."
        action={
          <Link href="/account/orders" className={buttonClasses("primary", "sm")}>
            LIHAT PESANAN SAYA
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {data.map((ret) => (
          <div
            key={ret.id}
            className="rounded-xs border-2 border-border bg-card p-5 transition-all hover:border-foreground"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-foreground">
                  #{ret.return_number}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatDate(ret.requested_at ?? ret.created_at)}</span>
              </div>
              <Badge tone={returnStatusTone(ret.status)}>
                {ret.status_label.toUpperCase()}
              </Badge>
            </div>

            <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <p className="font-display text-sm font-black uppercase tracking-tight text-foreground">
                  {ret.reason_category_label}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {ret.reason}
                </p>
                {ret.items && ret.items.length > 0 ? (
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {ret.items.length} PRODUK ·{" "}
                    {ret.items.reduce((total, line) => total + line.quantity, 0)}{" "}
                    UNIT
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-6 sm:justify-end">
                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    NOMINAL REFUND
                  </p>
                  <p className="mt-1 font-mono text-base font-black tabular-nums text-foreground">
                    {formatCurrency(ret.refund_amount)}
                  </p>
                </div>

                {ret.order_number ? (
                  <Link
                    href={`/account/orders/${ret.order_number}`}
                    className={buttonClasses("outline", "sm")}
                  >
                    DETAIL PESANAN →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {meta && meta.last_page > 1 ? (
        <Pagination
          page={meta.current_page}
          lastPage={meta.last_page}
          onChange={(nextPage) =>
            router.push(`/account/returns?page=${nextPage}`)
          }
        />
      ) : null}
    </div>
  );
}

export function CustomerReturnsList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Memuat retur…
        </div>
      }
    >
      <ReturnsContent />
    </Suspense>
  );
}
