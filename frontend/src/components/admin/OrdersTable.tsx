"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { PageHeader } from "@/components/admin/PageHeader";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/admin/Table";
import { Pagination } from "@/components/shared/Pagination";
import { statusTone } from "@/components/storefront/CustomerOrdersList";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAdminOrders } from "@/lib/api/orders";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "pending_payment", label: "Menunggu Pembayaran" },
  { value: "paid", label: "Sudah Dibayar" },
  { value: "processing", label: "Diproses" },
  { value: "shipped", label: "Dikirim" },
  { value: "delivered", label: "Tiba di Tujuan" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Dikembalikan" },
];

export function OrdersTable() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const orders = useAsyncData(
    () =>
      fetchAdminOrders({
        q: q || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        per_page: 20,
      }),
    `orders-${q}-${status}-${from}-${to}-${page}`,
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  function resetFilters() {
    setQInput("");
    setQ("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const data = orders.data?.data ?? [];
  const meta = orders.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Pesanan"
        description="Kelola transaksi pelanggan, status verifikasi pembayaran, dan pengiriman barang."
      />

      {orders.error ? <Alert tone="error">{orders.error}</Alert> : null}

      {/* Filter Toolbar */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
        <form
          onSubmit={handleSearch}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="text-xs font-medium text-foreground">
              Cari Pesanan
            </label>
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="No. pesanan, nama, email…"
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Status Pesanan
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm">
              Terapkan Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
        </form>
      </div>

      {orders.loading ? (
        <p className="text-sm text-muted-foreground">Memuat data pesanan…</p>
      ) : data.length === 0 ? (
        <EmptyState
          title="Tidak ada pesanan yang sesuai"
          description="Ubah filter pencarian Anda atau tunggu pesanan baru dari pelanggan."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>No. Pesanan</TH>
                <TH>Pelanggan</TH>
                <TH>Tanggal</TH>
                <TH>Status</TH>
                <TH>Barang</TH>
                <TH>Total Belanja</TH>
                <TH align="right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((order) => (
                <TR key={order.id}>
                  <TD>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium tabular-nums text-foreground underline-offset-4 hover:underline"
                    >
                      {order.order_number}
                    </Link>
                  </TD>
                  <TD>
                    <p className="font-medium text-foreground">
                      {order.customer?.name ?? order.shipping.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer?.email ?? order.shipping.phone}
                    </p>
                  </TD>
                  <TD>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={statusTone(order.status)}>
                      {order.status_label}
                    </Badge>
                  </TD>
                  <TD>
                    <span className="text-xs">
                      {order.items?.length ?? 0} jenis barang
                    </span>
                  </TD>
                  <TD>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(order.grand_total)}
                    </span>
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex h-8 items-center justify-center rounded border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Kelola
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {meta && meta.last_page > 1 ? (
            <div className="pt-2">
              <Pagination
                page={meta.current_page}
                lastPage={meta.last_page}
                onChange={(p) => setPage(p)}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
