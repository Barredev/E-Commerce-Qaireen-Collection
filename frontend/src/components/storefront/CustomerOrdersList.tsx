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
import { fetchMyOrders } from "@/lib/api/orders";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useAuthStore } from "@/lib/stores/authStore";
import type { PaginatedResponse } from "@/lib/types/api";
import type { Order, OrderStatus } from "@/lib/types/order";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

export function statusTone(
  status: OrderStatus,
): "neutral" | "info" | "success" | "warning" | "error" {
  switch (status) {
    case "pending_payment":
      return "warning";
    case "paid":
    case "processing":
    case "shipped":
      return "info";
    case "delivered":
    case "completed":
      return "success";
    case "cancelled":
    case "refunded":
      return "neutral";
    default:
      return "neutral";
  }
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  const orders = useAsyncData(
    () =>
      user
        ? fetchMyOrders(page)
        : Promise.resolve<PaginatedResponse<Order> | null>(null),
    `orders-${user?.id ?? "guest"}-${page}`,
  );

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 py-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner /> MEMUAT...
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="MASUK UNTUK MELIHAT PESANAN"
        description="Riwayat pesanan tersimpan di akun Anda."
        action={
          <Link
            href="/auth/login?redirect=/account/orders"
            className={buttonClasses("primary", "sm")}
          >
            MASUK KE AKUN
          </Link>
        }
      />
    );
  }

  if (orders.loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner /> MEMUAT RIWAYAT PESANAN ANDA...
      </div>
    );
  }

  if (orders.error) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{orders.error}</Alert>
        <Button size="sm" variant="outline" onClick={orders.reload}>
          COBA LAGI
        </Button>
      </div>
    );
  }

  const rows = orders.data?.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        title="BELUM ADA PESANAN"
        description="Anda belum memiliki transaksi pesanan di platform kami."
        action={
          <Link href="/products" className={buttonClasses("primary", "sm")}>
            MULAI BELANJA
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {rows.length} DARI {orders.data?.meta.total ?? 0} PESANAN DITEMUKAN
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((order) => {
          const firstItem = order.items[0];
          const restCount = order.items.length - 1;

          return (
            <div
              key={order.id}
              className="rounded-xs border-2 border-border bg-card p-5 transition-all hover:border-foreground"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="font-mono text-foreground">
                    #{order.order_number}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                <Badge tone={statusTone(order.status)}>
                  {order.status_label.toUpperCase()}
                </Badge>
              </div>

              <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="space-y-1">
                  {firstItem ? (
                    <p className="text-xs font-bold uppercase text-foreground">
                      {firstItem.product_name}
                      <span className="font-medium text-muted-foreground">
                        {" "}
                        ({firstItem.variant_size} / {firstItem.variant_color}) ×{" "}
                        {firstItem.quantity}
                      </span>
                    </p>
                  ) : null}

                  {restCount > 0 ? (
                    <p className="text-[11px] font-bold uppercase text-danger">
                      + {restCount} PRODUK LAINNYA
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-6 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      TOTAL PEMBAYARAN
                    </p>
                    <p className="font-mono text-base font-black tabular-nums text-foreground">
                      {formatCurrency(order.grand_total)}
                    </p>
                  </div>

                  <Link
                    href={`/account/orders/${order.order_number}`}
                    className={buttonClasses("outline", "sm")}
                  >
                    DETAIL PESANAN →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Pagination
        page={page}
        lastPage={orders.data?.meta.last_page ?? 1}
        onChange={(nextPage) =>
          router.push(`/account/orders?page=${nextPage}`)
        }
        className="pt-4"
      />
    </div>
  );
}

export function CustomerOrdersList() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Spinner /> MEMUAT PESANAN...
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
