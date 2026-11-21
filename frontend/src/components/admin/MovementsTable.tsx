"use client";

import { useState } from "react";

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
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchInventoryWarehouses,
  fetchStockMovements,
} from "@/lib/api/inventory";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { MovementType } from "@/lib/types/inventory";
import { formatDate } from "@/lib/utils/formatDate";

const movementOptions: { value: MovementType; label: string }[] = [
  { value: "receipt", label: "Penerimaan" },
  { value: "sale", label: "Penjualan" },
  { value: "return_in", label: "Retur Masuk" },
  { value: "adjustment", label: "Penyesuaian" },
  { value: "transfer_out", label: "Transfer Keluar" },
  { value: "transfer_in", label: "Transfer Masuk" },
];

export function MovementsTable() {
  const [warehouseId, setWarehouseId] = useState("");
  const [movementType, setMovementType] = useState<"" | MovementType>("");
  const [page, setPage] = useState(1);

  const movements = useAsyncData(
    () =>
      fetchStockMovements({
        warehouse_id: warehouseId || undefined,
        movement_type: movementType || undefined,
        page,
        per_page: 50,
      }),
    `${warehouseId}-${movementType}-${page}`,
  );

  const warehouses = useAsyncData(
    () => fetchInventoryWarehouses({ per_page: 100 }),
    "movements-warehouses",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pergerakan Stok"
        description="Jejak audit setiap perubahan stok: penerimaan, penjualan, retur, dan penyesuaian."
      />

      <div className="flex flex-wrap items-end gap-3">
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

        <label className="flex min-w-40 flex-col gap-1.5 text-sm">
          <span className="font-medium">Jenis</span>
          <select
            value={movementType}
            onChange={(event) => {
              setMovementType(event.target.value as "" | MovementType);
              setPage(1);
            }}
            className="border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
          >
            <option value="">Semua</option>
            {movementOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {movements.error ? (
        <Alert tone="error">{movements.error}</Alert>
      ) : movements.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : movements.data && movements.data.data.length > 0 ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Waktu</TH>
                <TH>Produk / Varian</TH>
                <TH>Gudang</TH>
                <TH>Jenis</TH>
                <TH className="text-right">Perubahan</TH>
                <TH className="text-right">Saldo</TH>
                <TH>Oleh</TH>
              </TR>
            </THead>
            <TBody>
              {movements.data.data.map((movement) => (
                <TR key={movement.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {formatDate(movement.created_at)}
                  </TD>
                  <TD>
                    <p className="font-medium">
                      {movement.variant?.product_name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {movement.variant?.label} · {movement.variant?.sku}
                    </p>
                  </TD>
                  <TD className="text-muted-foreground">
                    {movement.warehouse?.name ?? "—"}
                  </TD>
                  <TD>
                    <Badge tone="neutral">
                      {movement.movement_type_label ?? "—"}
                    </Badge>
                  </TD>
                  <TD
                    className={
                      movement.quantity >= 0
                        ? "text-right font-semibold text-success"
                        : "text-right font-semibold text-danger"
                    }
                  >
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </TD>
                  <TD className="text-right">{movement.balance_after}</TD>
                  <TD className="text-muted-foreground">
                    {movement.author?.name ?? "Sistem"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={movements.data.meta.current_page}
            lastPage={movements.data.meta.last_page}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada pergerakan stok"
          description="Riwayat akan muncul setelah penerimaan dikonfirmasi atau stok disesuaikan."
        />
      )}
    </div>
  );
}
