"use client";

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
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchInventoryStocks,
  fetchInventoryWarehouses,
} from "@/lib/api/inventory";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function StocksTable() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const stocks = useAsyncData(
    () =>
      fetchInventoryStocks({
        q: q || undefined,
        warehouse_id: warehouseId || undefined,
        low_stock: lowStockOnly || undefined,
        page,
        per_page: 50,
      }),
    `${q}-${warehouseId}-${lowStockOnly}-${page}`,
  );

  const warehouses = useAsyncData(
    () => fetchInventoryWarehouses({ per_page: 100 }),
    "stocks-warehouses",
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  function resetFilters() {
    setQInput("");
    setQ("");
    setWarehouseId("");
    setLowStockOnly(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok"
        description="Posisi stok per varian dan gudang."
      />

      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-end gap-3 border border-border bg-card p-4"
      >
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">Cari</span>
          <input
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            placeholder="Nama produk atau SKU…"
            className="border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
          />
        </label>

        <label className="flex min-w-40 flex-col gap-1.5 text-sm">
          <span className="font-medium">Gudang</span>
          <select
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setPage(1);
            }}
            className="border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
          >
            <option value="">Semua gudang</option>
            {(warehouses.data?.data ?? []).map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(event) => {
              setLowStockOnly(event.target.checked);
              setPage(1);
            }}
            className="size-4 rounded border-border"
          />
          Stok menipis
        </label>

        <Button type="submit" variant="outline">
          Terapkan
        </Button>
        <Button type="button" variant="ghost" onClick={resetFilters}>
          Reset
        </Button>
      </form>

      {stocks.error ? (
        <Alert tone="error">{stocks.error}</Alert>
      ) : stocks.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : stocks.data && stocks.data.data.length > 0 ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Produk / Varian</TH>
                <TH>Gudang</TH>
                <TH className="text-right">Tersedia</TH>
                <TH className="text-right">Tercatat</TH>
                <TH className="text-right">Direservasi</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {stocks.data.data.map((stock) => (
                <TR key={stock.id}>
                  <TD>
                    <p className="font-medium">
                      {stock.variant?.product?.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stock.variant?.label} · {stock.variant?.sku}
                    </p>
                  </TD>
                  <TD className="text-muted-foreground">
                    {stock.warehouse?.name ?? "—"}
                  </TD>
                  <TD className="text-right font-semibold">
                    {stock.quantity_available}
                  </TD>
                  <TD className="text-right">{stock.quantity_on_hand}</TD>
                  <TD className="text-right">{stock.quantity_reserved}</TD>
                  <TD>
                    {stock.is_low_stock ? (
                      <Badge tone="danger">Menipis</Badge>
                    ) : (
                      <Badge tone="success">Aman</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={stocks.data.meta.current_page}
            lastPage={stocks.data.meta.last_page}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada data stok"
          description="Stok akan muncul setelah penerimaan stok dikonfirmasi."
        />
      )}
    </div>
  );
}
