"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  approveAdminReturn,
  fetchAdminReturn,
  receiveAdminReturn,
  refundAdminReturn,
  rejectAdminReturn,
} from "@/lib/api/returns";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { RefundMethod, StockCondition } from "@/lib/types/order";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDateTime } from "@/lib/utils/formatDate";
import {
  REFUND_METHOD_OPTIONS,
  returnStatusTone,
} from "@/lib/utils/returnStatus";

interface ReceiveDraft {
  quantity: number;
  condition: StockCondition;
  notes: string;
}

export function AdminReturnDetail() {
  const { id } = useParams<{ id: string }>();

  const ret = useAsyncData(() => fetchAdminReturn(id), `admin-return-${id}`);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Approve / reject modal state
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Warehouse verification state
  const [drafts, setDrafts] = useState<Record<string, ReceiveDraft>>({});

  // Refund modal state
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("bank_transfer");
  const [refundReference, setRefundReference] = useState("");

  function updateDraft(lineId: string, patch: Partial<ReceiveDraft>) {
    setDrafts((current) => {
      const existing: ReceiveDraft = current[lineId] ?? {
        quantity: 1,
        condition: "good",
        notes: "",
      };

      return { ...current, [lineId]: { ...existing, ...patch } };
    });
  }

  function draftFor(lineId: string, quantity: number): ReceiveDraft {
    return drafts[lineId] ?? { quantity, condition: "good", notes: "" };
  }

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setActionError(null);
    setActionSuccess(null);
    setSubmitting(true);

    try {
      await action();
      setActionSuccess(successMessage);
      ret.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    await run(
      () => approveAdminReturn(id, resolution.trim() || undefined),
      "Retur berhasil disetujui. Barang dapat dikirim ke gudang.",
    );
    setApproveOpen(false);
    setResolution("");
  }

  async function handleReject() {
    if (!resolution.trim()) {
      setActionError("Alasan penolakan wajib diisi.");
      return;
    }

    await run(
      () => rejectAdminReturn(id, resolution.trim()),
      "Retur telah ditolak dan pelanggan akan menerima keputusan ini.",
    );
    setRejectOpen(false);
    setResolution("");
  }

  async function handleReceive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ret.data?.items) {
      return;
    }

    const items = ret.data.items.map((line) => {
      const draft = draftFor(line.id, line.quantity);

      return {
        id: line.id,
        quantity: draft.quantity,
        condition: draft.condition,
        notes: draft.notes.trim() || null,
      };
    });

    await run(
      () => receiveAdminReturn(id, items),
      "Barang retur berhasil diverifikasi dan stok layak jual telah dikembalikan.",
    );
  }

  async function handleRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await run(
      () =>
        refundAdminReturn(id, {
          refund_method: refundMethod,
          refund_reference: refundReference.trim() || null,
        }),
      "Pengembalian dana berhasil dicatat.",
    );
    setRefundOpen(false);
    setRefundReference("");
  }

  if (!ret.data) {
    if (ret.loading) {
      return (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Memuat detail retur…
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Alert tone="error">{ret.error ?? "Retur tidak ditemukan."}</Alert>
        <Link
          href="/admin/returns"
          className="text-xs font-medium uppercase tracking-[0.12em] text-foreground underline-offset-4 hover:underline"
        >
          ← Kembali ke daftar retur
        </Link>
      </div>
    );
  }

  const data = ret.data;

  const timeline = [
    { label: "Diajukan", at: data.requested_at },
    { label: "Disetujui", at: data.approved_at },
    { label: "Diterima Gudang", at: data.received_at },
    { label: "Dana Dikembalikan", at: data.refunded_at },
  ].filter((entry) => entry.at !== null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Retur"
          title={data.return_number}
          description={`Pesanan ${data.order_number ?? "-"} · diajukan ${formatDateTime(
            data.requested_at,
          )}`}
        />
        <Link href="/admin/returns" className={buttonClasses("outline", "sm")}>
          ← Daftar Retur
        </Link>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {actionSuccess ? <Alert tone="success">{actionSuccess}</Alert> : null}

      {/* Status bar & actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Status Retur
          </span>
          <Badge tone={returnStatusTone(data.status)}>{data.status_label}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.status === "requested" ? (
            <>
              <Button size="sm" onClick={() => setApproveOpen(true)}>
                Setujui Retur
              </Button>
              <Button
                size="sm"
                variant="outline"
                tone="danger"
                onClick={() => setRejectOpen(true)}
              >
                Tolak Retur
              </Button>
            </>
          ) : null}

          {data.status === "received" ? (
            <Button size="sm" onClick={() => setRefundOpen(true)}>
              Kembalikan Dana
            </Button>
          ) : null}

          {data.status === "refunded" ? (
            <Badge tone="success">Selesai — dana sudah dikembalikan</Badge>
          ) : null}

          {data.status === "rejected" || data.status === "cancelled" ? (
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Retur ini sudah ditutup.
            </span>
          ) : null}
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Nominal Refund
          </div>
          <div className="mt-3 text-2xl tabular-nums text-foreground">
            {formatCurrency(data.refund_amount)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.refund_method_label ?? "Metode belum dipilih"}
          </div>
        </div>

        <div className="bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Kategori Alasan
          </div>
          <div className="mt-3 text-base text-foreground">
            {data.reason_category_label}
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {data.reason}
          </div>
        </div>

        <div className="bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Pelanggan
          </div>
          <div className="mt-3 text-base text-foreground">
            {data.customer?.name ?? "-"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.customer?.email ?? ""}
          </div>
        </div>

        <div className="bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Verifikator Gudang
          </div>
          <div className="mt-3 text-base text-foreground">
            {data.verified_by?.name ?? "Belum diverifikasi"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.approved_by?.name
              ? `Disetujui oleh ${data.approved_by.name}`
              : ""}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 ? (
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Riwayat Proses Retur
          </h2>
          <ol className="mt-4 space-y-3 border-l border-border pl-4 text-xs">
            {timeline.map((entry) => (
              <li key={entry.label} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <p className="font-medium text-foreground">{entry.label}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {formatDateTime(entry.at)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* Resolution / notes */}
      {data.resolution || data.notes ? (
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft text-xs">
          {data.resolution ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Keputusan Admin
              </p>
              <p className="mt-1 text-muted-foreground">{data.resolution}</p>
            </div>
          ) : null}
          {data.notes ? (
            <div className={data.resolution ? "mt-3 border-t border-border pt-3" : ""}>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Catatan Pelanggan
              </p>
              <p className="mt-1 text-muted-foreground">{data.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Verification form */}
      {data.status === "approved" ? (
        <form onSubmit={handleReceive} className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Verifikasi Barang di Gudang
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Periksa setiap baris retur sekaligus. Barang berkondisi baik akan
            otomatis dikembalikan ke stok gudang.
          </p>

          <div className="mt-4">
            <Table>
              <THead>
                <TR>
                  <TH>Produk</TH>
                  <TH align="right">Diajukan</TH>
                  <TH align="center">Jumlah Diterima</TH>
                  <TH>Kondisi</TH>
                  <TH>Catatan Pemeriksaan</TH>
                </TR>
              </THead>
              <TBody>
                {(data.items ?? []).map((line) => {
                  const draft = draftFor(line.id, line.quantity);

                  return (
                    <TR key={line.id}>
                      <TD>
                        <div className="font-medium text-foreground">
                          {line.product_name ?? "-"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {line.variant_sku ?? "-"}
                        </div>
                      </TD>
                      <TD align="right">{line.quantity}</TD>
                      <TD align="center">
                        <input
                          type="number"
                          min={1}
                          max={line.quantity}
                          value={draft.quantity}
                          onChange={(e) =>
                            updateDraft(line.id, {
                              quantity: Number(e.target.value),
                            })
                          }
                          className="h-8 w-20 border border-border bg-background px-2 text-center text-xs tabular-nums text-foreground focus:border-foreground focus:outline-none"
                        />
                      </TD>
                      <TD>
                        <select
                          value={draft.condition}
                          onChange={(e) =>
                            updateDraft(line.id, {
                              condition: e.target.value as StockCondition,
                            })
                          }
                          className="h-8 border border-border bg-background px-2 text-xs text-foreground focus:border-foreground focus:outline-none"
                        >
                          <option value="good">Baik</option>
                          <option value="damaged">Rusak</option>
                        </select>
                      </TD>
                      <TD>
                        <input
                          type="text"
                          value={draft.notes}
                          onChange={(e) =>
                            updateDraft(line.id, { notes: e.target.value })
                          }
                          placeholder="mis. label kemasan sobek"
                          className="h-8 w-full min-w-40 border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                        />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" loading={submitting}>
              Simpan Verifikasi
            </Button>
          </div>
        </form>
      ) : null}

      {/* Return lines */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Barang yang Diretur
        </h2>
        <div className="mt-4">
          <Table>
            <THead>
              <TR>
                <TH>Produk</TH>
                <TH align="right">Jumlah</TH>
                <TH>Kondisi</TH>
                <TH>Restock</TH>
                <TH align="right">Nilai Refund</TH>
                <TH>Alasan Barang</TH>
              </TR>
            </THead>
            <TBody>
              {(data.items ?? []).map((line) => (
                <TR key={line.id}>
                  <TD>
                    <div className="font-medium text-foreground">
                      {line.product_name ?? "-"}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {line.variant_sku ?? "-"}
                    </div>
                  </TD>
                  <TD align="right">{line.quantity}</TD>
                  <TD>
                    {line.condition_label ? (
                      <Badge
                        tone={line.condition === "good" ? "success" : "warning"}
                      >
                        {line.condition_label}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Belum diverifikasi
                      </span>
                    )}
                  </TD>
                  <TD>
                    <span className="text-xs">
                      {line.is_restocked ? "Kembali ke stok" : "Tidak"}
                    </span>
                  </TD>
                  <TD align="right" className="font-semibold">
                    {formatCurrency(line.refund_amount)}
                  </TD>
                  <TD>
                    <span className="text-xs text-muted-foreground">
                      {line.reason ?? "—"}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </div>

      {/* Approve modal */}
      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Setujui Retur"
        description="Pelanggan akan diminta mengirim barang kembali ke gudang sebelum dana dikembalikan."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button size="sm" loading={submitting} onClick={handleApprove}>
              Setujui Retur
            </Button>
          </>
        }
      >
        <Textarea
          label="Keputusan / Instruksi (Opsional)"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={3}
          placeholder="mis. Silakan kirim barang ke gudang pusat, ongkir ditanggung toko."
        />
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Tolak Retur"
        description="Alasan penolakan wajib diisi dan akan terlihat oleh pelanggan."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              tone="danger"
              size="sm"
              loading={submitting}
              onClick={handleReject}
            >
              Tolak Retur
            </Button>
          </>
        }
      >
        <Textarea
          label="Alasan Penolakan"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={3}
          required
          placeholder="mis. Barang sudah melewati batas waktu retur 14 hari."
        />
      </Modal>

      {/* Refund modal */}
      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Kembalikan Dana"
        description={`Catat metode dan referensi pengembalian dana untuk pelanggan ${
          data.customer?.name ?? "-"
        } sebesar ${formatCurrency(data.refund_amount)}.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefundOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="refund-form"
              size="sm"
              loading={submitting}
            >
              Konfirmasi Refund
            </Button>
          </>
        }
      >
        <form id="refund-form" onSubmit={handleRefund} className="space-y-4">
          <Select
            label="Metode Pengembalian"
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
            required
          >
            {REFUND_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input
            label="Nomor Referensi"
            value={refundReference}
            onChange={(e) => setRefundReference(e.target.value)}
            placeholder="mis. TRF-BCA-20261101-00012"
            hint="Opsional, membantu rekonsiliasi keuangan."
          />
        </form>
      </Modal>
    </div>
  );
}
