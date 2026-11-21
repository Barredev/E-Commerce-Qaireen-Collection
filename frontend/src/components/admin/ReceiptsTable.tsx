"use client";

import Link from "next/link";
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
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  cancelStockReceipt,
  confirmStockReceipt,
  fetchStockReceipts,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ReceiptStatus, ReceiptSourceType } from "@/lib/types/inventory";
import { formatDate } from "@/lib/utils/formatDate";

const statusTone: Record<ReceiptStatus, "neutral" | "success" | "danger"> = {
  draft: "neutral",
  confirmed: "success",
  cancelled: "danger",
};

export function ReceiptsTable() {
  const [status, setStatus] = useState<"" | ReceiptStatus>("");
  const [sourceType, setSourceType] = useState<"" | ReceiptSourceType>("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const receipts = useAsyncData(
    () =>
      fetchStockReceipts({
        status: status || undefined,
        source_type: sourceType || undefined,
        page,
        per_page: 20,
      }),
    `${status}-${sourceType}-${page}`,
  );

  async function handleConfirm(id: string) {
    setActionError(null);

    try {
      await confirmStockReceipt(id);
      receipts.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  async function handleCancel(id: string) {
    setActionError(null);

    try {
      await cancelStockReceipt(id);
      receipts.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penerimaan Stok"
        description="Catat barang masuk dari produksi, pembelian, atau retur."
        action={
          <Link
            href="/admin/inventory/receipts/new"
            className={buttonClasses("primary", "md")}
          >
            Buat Penerimaan
          </Link>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-36 flex-col gap-1.5 text-sm">
          <span className="font-medium">Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "" | ReceiptStatus);
              setPage(1);
            }}
            className="border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
          >
            <option value="">Semua</option>
            <option value="draft">Draf</option>
            <option value="confirmed">Terkonfirmasi</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </label>

        <label className="flex min-w-48 flex-col gap-1.5 text-sm">
          <span className="font-medium">Sumber</span>
          <select
            value={sourceType}
            onChange={(event) => {
              setSourceType(event.target.value as "" | ReceiptSourceType);
              setPage(1);
            }}
            className="border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
          >
            <option value="">Semua</option>
            <option value="production">Hasil Produksi</option>
            <option value="purchase">Pembelian</option>
            <option value="return">Retur</option>
            <option value="transfer_in">Transfer Masuk</option>
          </select>
        </label>
      </div>

      {receipts.error ? (
        <Alert tone="error">{receipts.error}</Alert>
      ) : receipts.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : receipts.data && receipts.data.data.length > 0 ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Nomor</TH>
                <TH>Gudang</TH>
                <TH>Sumber</TH>
                <TH className="text-right">Item</TH>
                <TH>Status</TH>
                <TH>Tanggal</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {receipts.data.data.map((receipt) => (
                <TR key={receipt.id}>
                  <TD>
                    <Link
                      href={`/admin/inventory/receipts/${receipt.id}`}
                      className="font-medium hover:underline"
                    >
                      {receipt.receipt_number}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">
                    {receipt.warehouse?.name ?? "—"}
                  </TD>
                  <TD>{receipt.source_type_label ?? "—"}</TD>
                  <TD className="text-right">{receipt.items_count ?? 0}</TD>
                  <TD>
                    <Badge
                      tone={
                        receipt.status ? statusTone[receipt.status] : "neutral"
                      }
                    >
                      {receipt.status_label ?? "—"}
                    </Badge>
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(receipt.created_at)}
                  </TD>
                  <TD className="text-right">
                    {receipt.status === "draft" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConfirm(receipt.id)}
                        >
                          Konfirmasi
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(receipt.id)}
                        >
                          Batalkan
                        </Button>
                      </div>
                    ) : (
                      <Link
                        href={`/admin/inventory/receipts/${receipt.id}`}
                        className={buttonClasses("ghost", "sm")}
                      >
                        Lihat
                      </Link>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={receipts.data.meta.current_page}
            lastPage={receipts.data.meta.last_page}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada penerimaan stok"
          description="Buat penerimaan pertama untuk menambah stok ke gudang."
          action={
            <Link
              href="/admin/inventory/receipts/new"
              className={buttonClasses("primary", "sm")}
            >
              Buat Penerimaan
            </Link>
          }
        />
      )}
    </div>
  );
}
