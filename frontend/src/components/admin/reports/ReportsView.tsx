"use client";

import { useState } from "react";

import { PageHeader } from "@/components/admin/PageHeader";
import { SalesTrendChart } from "@/components/admin/reports/SalesTrendChart";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/admin/Table";
import { Alert } from "@/components/ui/Alert";
import {
  fetchReportInventory,
  fetchReportOverview,
  fetchReportSales,
} from "@/lib/api/reports";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { formatCurrency } from "@/lib/utils/formatCurrency";

type Tab = "overview" | "sales" | "inventory";

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const overview = useAsyncData(() => fetchReportOverview(), "report-overview");
  const sales = useAsyncData(() => fetchReportSales(), "report-sales");
  const inventory = useAsyncData(() => fetchReportInventory(), "report-inventory");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Laporan"
        title="Laporan & Analitik Bisnis"
        description="Pusat pemantauan kinerja penjualan dan valuasi persediaan Qaireen Collection."
      />

      {/* Top Level KPI Cards */}
      {overview.loading ? (
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : overview.error ? (
        <Alert variant="error">{overview.error}</Alert>
      ) : overview.data ? (
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Total Omset Penjualan (Gross)
            </div>
            <div className="mt-3 text-2xl tabular-nums text-foreground">
              {formatCurrency(overview.data.total_revenue)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Nilai omset dari transaksi selesai
            </div>
          </div>

          <div className="bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Total Pesanan
            </div>
            <div className="mt-3 text-2xl tabular-nums text-foreground">
              {overview.data.total_orders} transaksi
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Pesanan berstatus selesai
            </div>
          </div>

          <div className="bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Total Diskon &amp; Kupon Diberikan
            </div>
            <div className="mt-3 text-2xl tabular-nums text-warning">
              {formatCurrency(overview.data.total_discounts)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Voucher &amp; potongan promosi belanja
            </div>
          </div>

          <div className="bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Total Fisik Stok di Gudang
            </div>
            <div className="mt-3 text-2xl tabular-nums text-foreground">
              {overview.data.total_physical_units} unit
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {overview.data.low_stock_count > 0 ? (
                <span className="text-danger font-medium">
                  {overview.data.low_stock_count} SKU menipis
                </span>
              ) : (
                "Stok dalam batas aman"
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab Navigation */}
      <div className="overflow-x-auto border-b border-border">
        <nav className="flex min-w-max gap-6">
          {(
            [
              ["overview", "Ringkasan Eksekutif"],
              ["sales", "Tren Penjualan"],
              ["inventory", "Inventori & Gudang"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              aria-current={activeTab === key ? "true" : undefined}
              className={`-mb-px cursor-pointer border-b-2 pb-3 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                activeTab === key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && overview.data ? (
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-soft md:grid-cols-2">
          <div className="space-y-4 bg-card p-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Pergerakan Stok
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Stok Dipesan
                </div>
                <div className="mt-1.5 text-lg tabular-nums text-warning">
                  {overview.data.total_reserved_units}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Stok Fisik
                </div>
                <div className="mt-1.5 text-lg tabular-nums text-foreground">
                  {overview.data.total_physical_units}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Stok dipesan (reserved) merupakan unit yang terkunci saat proses
              checkout konsumen dan akan dilepas kembali jika transaksi
              kedaluwarsa atau dibatalkan.
            </p>
          </div>

          <div className="space-y-4 bg-card p-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Kesehatan Katalog
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  SKU Menipis
                </div>
                <div className="mt-1.5 text-lg tabular-nums text-foreground">
                  {overview.data.low_stock_count}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Pesanan Selesai
                </div>
                <div className="mt-1.5 text-lg tabular-nums text-foreground">
                  {overview.data.total_orders}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              SKU menipis dihitung dari stok siap jual yang berada di bawah batas
              minimum tiap varian di gudang.
            </p>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Sales Trend */}
      {activeTab === "sales" ? (
        sales.loading ? (
          <div className="h-64 animate-pulse bg-muted/40" />
        ) : sales.error ? (
          <Alert variant="error">{sales.error}</Alert>
        ) : sales.data ? (
          <div className="space-y-8">
            <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-soft sm:grid-cols-3">
              <div className="bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Total Pendapatan (30 Hari)
                </div>
                <div className="mt-3 text-xl tabular-nums text-foreground">
                  {formatCurrency(sales.data.total_revenue)}
                </div>
              </div>
              <div className="bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Rata-rata Nilai Pesanan (AOV)
                </div>
                <div className="mt-3 text-xl tabular-nums text-foreground">
                  {formatCurrency(sales.data.average_order_value)}
                </div>
              </div>
              <div className="bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Jumlah Pesanan Berhasil
                </div>
                <div className="mt-3 text-xl tabular-nums text-foreground">
                  {sales.data.orders_count} pesanan
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Tren Penjualan Harian
              </h3>
              <div className="mt-6">
                <SalesTrendChart rows={sales.data.daily_trend} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Arahkan kursor ke batang untuk melihat nilai harian. Tabel di
                bawah memuat angka yang sama untuk pembaca layar dan ekspor.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Rincian Angka
              </h3>
              <Table>
                <THead>
                  <TR>
                    <TH>Tanggal</TH>
                    <TH className="text-right">Jumlah Pesanan</TH>
                    <TH className="text-right">Total Diskon</TH>
                    <TH className="text-right">Total Omset Bersih</TH>
                  </TR>
                </THead>
                <TBody>
                  {sales.data.daily_trend.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="text-center py-6 text-muted-foreground">
                        Belum ada data penjualan pada rentang waktu ini.
                      </TD>
                    </TR>
                  ) : (
                    sales.data.daily_trend.map((d) => (
                      <TR key={d.date}>
                        <TD className="font-mono text-xs">{d.date}</TD>
                        <TD className="text-right font-medium">{d.orders_count}</TD>
                        <TD className="text-right text-muted-foreground">
                          {d.discounts > 0 ? formatCurrency(d.discounts) : "-"}
                        </TD>
                        <TD className="text-right font-bold text-foreground">
                          {formatCurrency(d.revenue)}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </div>
        ) : null
      ) : null}

      {/* Tab 3: Inventory */}
      {activeTab === "inventory" ? (
        inventory.loading ? (
          <div className="h-64 animate-pulse bg-muted/40" />
        ) : inventory.error ? (
          <Alert variant="error">{inventory.error}</Alert>
        ) : inventory.data ? (
          <div className="space-y-8">
            <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-soft sm:grid-cols-3">
              <div className="bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Total Stok Fisik di Rak
                </div>
                <div className="mt-3 text-xl tabular-nums text-foreground">
                  {inventory.data.total_units_on_hand} unit
                </div>
              </div>
              <div className="bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Stok Siap Jual (Available)
                </div>
                <div className="mt-3 text-xl tabular-nums text-success">
                  {inventory.data.total_units_available} unit
                </div>
              </div>
              <div className="bg-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Stok Terkunci Checkout (Reserved)
                </div>
                <div className="mt-3 text-xl tabular-nums text-warning">
                  {inventory.data.total_units_reserved} unit
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Distribusi Stok per Gudang
              </h3>
              <Table>
                <THead>
                  <TR>
                    <TH>Nama Gudang</TH>
                    <TH>Kode</TH>
                    <TH className="text-right">Jumlah Varian</TH>
                    <TH className="text-right">Stok Fisik</TH>
                    <TH className="text-right">Terkunci</TH>
                    <TH className="text-right">Siap Jual</TH>
                  </TR>
                </THead>
                <TBody>
                  {inventory.data.by_warehouse.map((w) => (
                    <TR key={w.warehouse_id}>
                      <TD className="font-semibold text-foreground">{w.warehouse_name}</TD>
                      <TD className="font-mono text-xs">{w.warehouse_code}</TD>
                      <TD className="text-right">{w.variants_count}</TD>
                      <TD className="text-right font-medium">{w.total_on_hand}</TD>
                      <TD className="text-right text-muted-foreground">{w.total_reserved}</TD>
                      <TD className="text-right font-medium text-success">
                        {w.total_available}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            {inventory.data.low_stock_items.length > 0 ? (
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-danger">
                  Peringatan: Stok Menipis ({inventory.data.low_stock_items.length} SKU)
                </h3>
                <Table>
                  <THead>
                    <TR>
                      <TH>Produk</TH>
                      <TH>SKU & Varian</TH>
                      <TH>Gudang</TH>
                      <TH className="text-right">Sisa Siap Jual</TH>
                      <TH className="text-right">Batas Minimum</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {inventory.data.low_stock_items.map((item) => (
                      <TR key={item.id}>
                        <TD className="font-semibold">{item.product_name}</TD>
                        <TD className="text-xs font-mono">
                          {item.sku} ({item.size} / {item.color})
                        </TD>
                        <TD className="text-xs">{item.warehouse_name}</TD>
                        <TD className="text-right font-medium text-danger">
                          {item.quantity_available}
                        </TD>
                        <TD className="text-right text-muted-foreground">
                          {item.threshold}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : null}
          </div>
        ) : null
      ) : null}
    </div>
  );
}
