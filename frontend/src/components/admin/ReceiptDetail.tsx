"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/admin/Table";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  cancelStockReceipt,
  confirmStockReceipt,
  fetchStockReceipt,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ReceiptStatus } from "@/lib/types/inventory";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

const statusTone: Record<ReceiptStatus, "neutral" | "success" | "danger"> = {
  draft: "neutral",
  confirmed: "success",
  cancelled: "danger",
};

export function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const receipt = useAsyncData(
    () => fetchStockReceipt(id),
    `admin-receipt-${id}`,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setWorking(true);
    setActionError(null);

    try {
      await action();
      receipt.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setWorking(false);
    }
  }

  if (!receipt.data) {
    if (receipt.loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Memuat penerimaan…
        </div>
      );
    }

    return (
      <Alert tone="error">
        {receipt.error ?? "Penerimaan stok tidak ditemukan."}
      </Alert>
    );
  }

  const detail = receipt.data;
  const isDraft = detail.status === "draft";

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.receipt_number}
        description={`${detail.source_type_label ?? "Penerimaan"} · ${
          detail.warehouse?.name ?? "—"
        }`}
        action={
          <Link
            href="/admin/inventory/receipts"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Kembali ke daftar
          </Link>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3 border border-border bg-card p-4 text-sm">
        <Badge
          tone={detail.status ? statusTone[detail.status] : "neutral"}
        >
          {detail.status_label ?? "—"}
        </Badge>
        <span className="text-muted-foreground">
          Dibuat {formatDate(detail.created_at)}
        </span>
        {detail.receiver ? (
          <span className="text-muted-foreground">
            Diterima oleh {detail.receiver.name}
          </span>
        ) : null}

        {isDraft ? (
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              loading={working}
              onClick={() => run(() => confirmStockReceipt(detail.id))}
            >
              Konfirmasi Penerimaan
            </Button>
            <ConfirmButton
              label="Batalkan"
              message="Batalkan penerimaan stok ini?"
              onConfirm={async () => {
                try {
                  await cancelStockReceipt(detail.id);
                  receipt.reload();
                } catch (error) {
                  setActionError(getApiErrorMessage(error));
                }
              }}
            />
          </div>
        ) : null}
      </div>

      {detail.notes ? (
        <div className="border border-border bg-card p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Catatan
          </p>
          <p className="mt-1 whitespace-pre-line">{detail.notes}</p>
        </div>
      ) : null}

      {detail.items && detail.items.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Produk / Varian</TH>
              <TH>SKU</TH>
              <TH className="text-right">Jumlah</TH>
              <TH className="text-right">Harga Pokok</TH>
              <TH>Kondisi</TH>
              <TH>Catatan</TH>
            </TR>
          </THead>
          <TBody>
            {detail.items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <p className="font-medium">{item.product_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant_label}
                  </p>
                </TD>
                <TD className="font-mono text-xs">{item.sku}</TD>
                <TD className="text-right">{item.quantity}</TD>
                <TD className="text-right">
                  {item.unit_cost !== null
                    ? formatCurrency(item.unit_cost)
                    : "—"}
                </TD>
                <TD>
                  <Badge
                    tone={item.condition === "damaged" ? "danger" : "success"}
                  >
                    {item.condition_label ?? "—"}
                  </Badge>
                </TD>
                <TD className="text-muted-foreground">{item.notes ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <Alert tone="info">Penerimaan ini belum memiliki item.</Alert>
      )}

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/inventory/receipts")}
        >
          Selesai
        </Button>
      </div>
    </div>
  );
}
