"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { statusTone } from "@/components/storefront/CustomerOrdersList";
import { ReviewFormModal } from "@/components/storefront/ReviewFormModal";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClasses, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api/client";
import { fetchOrderFeedbackStatus } from "@/lib/api/feedback";
import {
  cancelMyOrder,
  createPaymentToken,
  fetchMyOrder,
  simulateOrderPayment,
  type PaymentTokenResponse,
} from "@/lib/api/orders";
import { cancelMyReturn, createReturn } from "@/lib/api/returns";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useAuthStore } from "@/lib/stores/authStore";
import type { OrderFeedbackStatus } from "@/lib/types/feedback";
import type { Order, OrderItem, ReturnReason } from "@/lib/types/order";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate, formatDateTime } from "@/lib/utils/formatDate";
import {
  RETURN_REASON_OPTIONS,
  returnStatusTone,
} from "@/lib/utils/returnStatus";

function OrderDetailContent() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  const detail = useAsyncData<Order | null>(
    async () => {
      if (!user || !orderNumber) {
        return null;
      }

      return fetchMyOrder(orderNumber);
    },
    `${user?.id ?? "guest"}:${orderNumber ?? ""}`,
  );

  // Kelayakan ulasan hanya perlu ditanyakan untuk pesanan yang sudah diterima;
  // status pesanan ikut masuk key supaya data disegarkan saat status berubah.
  const feedbackStatus = useAsyncData<OrderFeedbackStatus | null>(
    async () => {
      if (!user || !orderNumber) {
        return null;
      }

      const current = detail.data;

      if (
        !current ||
        (current.status !== "delivered" && current.status !== "completed")
      ) {
        return null;
      }

      return fetchOrderFeedbackStatus(orderNumber);
    },
    `feedback:${user?.id ?? "guest"}:${orderNumber ?? ""}:${detail.data?.status ?? ""}`,
  );

  const order = detail.data;
  const loading = detail.loading && order === null;
  const error = detail.error !== null && order === null ? detail.error : null;

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Payment Gateway State
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<PaymentTokenResponse | null>(null);

  // Return Request State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReasonCategory, setReturnReasonCategory] =
    useState<ReturnReason>("damaged");
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<
    Record<string, number>
  >({});
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);
  const [cancellingReturnNumber, setCancellingReturnNumber] = useState<
    string | null
  >(null);

  // `detail.reload()` dipakai setelah aksi apa pun yang mengubah pesanan;
  // data lama tetap tampil selama penyegaran sehingga halaman tidak berkedip.
  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner /> MEMUAT DETAIL PESANAN...
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="MASUK UNTUK MELIHAT PESANAN"
        description="Masuk ke akun Anda untuk melihat detail transaksi dan melacak pesanan."
        action={
          <Link
            href={`/auth/login?redirect=/account/orders/${orderNumber}`}
            className={buttonClasses("primary", "sm")}
          >
            MASUK KE AKUN
          </Link>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner /> MEMUAT RINCIAN PESANAN...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4 py-8">
        <Alert tone="error">{error ?? "Pesanan tidak ditemukan."}</Alert>
        <Link
          href="/account/orders"
          className="inline-block text-xs font-black uppercase tracking-wider text-foreground underline underline-offset-4 hover:text-danger"
        >
          ← KEMBALI KE DAFTAR PESANAN
        </Link>
      </div>
    );
  }

  const isPending = order.status === "pending_payment";
  const primaryPayment = order.payments?.[0];

  const existingReturns = order.returns ?? [];
  const blockingReturns = existingReturns.filter(
    (ret) =>
      ret.status === "requested" ||
      ret.status === "approved" ||
      ret.status === "received",
  );
  // Retur yang sudah ditolak/dibatalkan tidak memakai kuota, status lain tetap
  // dihitung sehingga pelanggan tidak dapat mengajukan unit yang sama dua kali.
  const returnedQuantities = new Map<string, number>();

  for (const ret of existingReturns) {
    if (ret.status === "cancelled" || ret.status === "rejected") {
      continue;
    }

    for (const line of ret.items ?? []) {
      returnedQuantities.set(
        line.order_item_id,
        (returnedQuantities.get(line.order_item_id) ?? 0) + line.quantity,
      );
    }
  }

  function remainingQuantity(item: OrderItem): number {
    return Math.max(0, item.quantity - (returnedQuantities.get(item.id) ?? 0));
  }

  const isReviewableOrder =
    order.status === "delivered" || order.status === "completed";

  const feedback = feedbackStatus.data;
  const canReview = isReviewableOrder && feedback?.can_review === true;
  const hasReviewedEverything =
    isReviewableOrder && feedback !== null && !feedback.can_review;

  const canRequestReturn =
    isReviewableOrder &&
    blockingReturns.length === 0 &&
    order.items.some((item) => remainingQuantity(item) > 0);

  async function handleConfirmCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelMyOrder(orderNumber, cancelReason.trim() || undefined);
      setShowCancelModal(false);
      detail.reload();
    } catch (err) {
      setCancelError(getApiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handlePayNow() {
    if (!orderNumber) return;
    setPaying(true);
    setPayError(null);
    setPaySuccess(null);
    try {
      const data = await createPaymentToken(orderNumber);
      setTokenData(data);
      if (data.redirect_url && !data.is_simulated) {
        window.open(data.redirect_url, "_blank");
      }
    } catch (err) {
      setPayError(getApiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  async function handleSimulatePayment() {
    if (!orderNumber) return;
    setPaying(true);
    setPayError(null);
    setPaySuccess(null);
    try {
      const res = await simulateOrderPayment(orderNumber);
      setPaySuccess(res.message ?? "Pembayaran berhasil diverifikasi secara realtime!");
      detail.reload();
    } catch (err) {
      setPayError(getApiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  function openReturnModal() {
    setShowReturnModal(true);
    setReturnError(null);
    setReturnSuccess(null);
    setReturnReason("");
    setReturnNotes("");
    setReturnQuantities({});
  }

  function setReturnQuantity(orderItemId: string, raw: string, max: number) {
    const parsed = Number.parseInt(raw, 10);
    const quantity = Number.isNaN(parsed)
      ? 0
      : Math.min(Math.max(parsed, 0), max);

    setReturnQuantities((prev) => ({ ...prev, [orderItemId]: quantity }));
  }

  async function handleSubmitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!orderNumber || !order) {
      return;
    }

    const items = order.items
      .map((item) => ({
        order_item_id: item.id,
        quantity: returnQuantities[item.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setReturnError("Pilih minimal satu produk beserta jumlah yang ingin diretur.");
      return;
    }

    if (!returnReason.trim()) {
      setReturnError("Alasan retur wajib diisi.");
      return;
    }

    setSubmittingReturn(true);
    setReturnError(null);
    try {
      const created = await createReturn(orderNumber, {
        reason_category: returnReasonCategory,
        reason: returnReason.trim(),
        notes: returnNotes.trim() ? returnNotes.trim() : null,
        items,
      });
      setReturnSuccess(
        `Pengajuan retur ${created.return_number} berhasil dikirim dan menunggu verifikasi.`,
      );
      setShowReturnModal(false);
      detail.reload();
    } catch (err) {
      setReturnError(getApiErrorMessage(err));
    } finally {
      setSubmittingReturn(false);
    }
  }

  async function handleCancelReturn(returnNumber: string) {
    setCancellingReturnNumber(returnNumber);
    setReturnError(null);
    setReturnSuccess(null);
    try {
      await cancelMyReturn(returnNumber);
      setReturnSuccess(`Pengajuan retur ${returnNumber} berhasil dibatalkan.`);
      detail.reload();
    } catch (err) {
      setReturnError(getApiErrorMessage(err));
    } finally {
      setCancellingReturnNumber(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
            ORDER DETAILS
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-black uppercase tracking-tight tabular-nums text-foreground sm:text-4xl">
              #{order.order_number}
            </h1>
            <Badge tone={statusTone(order.status)}>{order.status_label.toUpperCase()}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Dibuat pada {formatDate(order.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canReview ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowReviewModal(true)}
              className="rounded-xs font-black uppercase tracking-wider"
            >
              ★ BERI ULASAN
            </Button>
          ) : hasReviewedEverything ? (
            <Badge tone="success">ULASAN DIBERIKAN</Badge>
          ) : null}

          {canRequestReturn ? (
            <Button
              variant={canReview ? "outline" : "primary"}
              size="sm"
              onClick={openReturnModal}
              className="rounded-xs font-black uppercase tracking-wider"
            >
              AJUKAN RETUR
            </Button>
          ) : null}

          {isPending ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="rounded-xs font-black uppercase tracking-wider"
            >
              BATALKAN PESANAN
            </Button>
          ) : null}

          <Link
            href="/account/orders"
            className="rounded-xs border border-foreground bg-foreground px-4 py-2 text-xs font-black uppercase tracking-wider text-background transition-colors hover:bg-foreground/80"
          >
            SEMUA PESANAN
          </Link>
        </div>
      </div>

      {returnSuccess ? <Alert tone="success">{returnSuccess}</Alert> : null}
      {returnError && !showReturnModal ? (
        <Alert tone="error">{returnError}</Alert>
      ) : null}

      {/* Pending payment notice */}
      {isPending ? (
        <div className="rounded-xs border-2 border-danger bg-danger/5 p-6 text-sm text-foreground">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
                ⚡ MENUNGGU PEMBAYARAN
              </p>
              <p className="text-xs text-muted-foreground">
                Selesaikan pembayaran sebesar{" "}
                <span className="font-mono font-black text-foreground">
                  {formatCurrency(order.grand_total)}
                </span>{" "}
                untuk mengamankan stok produk Anda.
              </p>
              {primaryPayment ? (
                <div className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">METODE PEMBAYARAN: </span>
                  <span className="font-black uppercase tracking-wider text-foreground">
                    {primaryPayment.payment_method.replace("_", " ")}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handlePayNow}
                disabled={paying}
                className="rounded-xs font-black uppercase tracking-wider"
              >
                {paying ? "MEMPROSES..." : "BAYAR SEKARANG (MIDTRANS)"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleSimulatePayment}
                disabled={paying}
                title="Simulasi callback instan untuk testing sandbox"
                className="rounded-xs font-black uppercase tracking-wider"
              >
                ⚡ SIMULASI BAYAR LUNAS
              </Button>
            </div>
          </div>

          {paySuccess ? (
            <div className="mt-4">
              <Alert tone="success">{paySuccess}</Alert>
            </div>
          ) : null}

          {payError ? (
            <div className="mt-4">
              <Alert tone="error">{payError}</Alert>
            </div>
          ) : null}

          {tokenData?.is_simulated ? (
            <div className="mt-4 border-t border-border pt-4">
              <Alert tone="info">
                Gateway pembayaran belum dikonfigurasi (mode simulasi). Gunakan tombol{" "}
                <strong className="font-bold">SIMULASI BAYAR LUNAS</strong> untuk menguji
                alur pembayaran.
              </Alert>
            </div>
          ) : tokenData ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-foreground">
                  TOKEN TRANSAKSI GATEWAY
                </span>
                <span className="bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                  {tokenData.token}
                </span>
              </div>
              <p className="text-muted-foreground">
                GATEWAY: <strong className="text-foreground">{tokenData.payment_gateway}</strong>{" "}
                {tokenData.is_production ? "(PRODUKSI)" : "(SANDBOX)"}
              </p>
              {tokenData.redirect_url ? (
                <div className="pt-1">
                  <a
                    href={tokenData.redirect_url}
                    target="_blank"
                    rel="noreferrer"
                    className="border-b-2 border-foreground pb-0.5 font-black uppercase tracking-wider text-foreground transition-colors hover:text-danger"
                  >
                    BUKA HALAMAN PEMBAYARAN MIDTRANS ↗
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Paid payment confirmation */}
      {order.status === "paid" ? (
        <div className="rounded-xs border-2 border-border bg-card p-4 text-xs text-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-foreground" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                PEMBAYARAN LUNAS &amp; TERVERIFIKASI
              </span>
            </div>
            {primaryPayment?.paid_at ? (
              <span className="text-xs font-medium text-muted-foreground">
                DIVERIFIKASI PADA {formatDate(primaryPayment.paid_at)}
              </span>
            ) : null}
          </div>
          {primaryPayment?.gateway_transaction_id ? (
            <div className="mt-2 text-xs text-muted-foreground">
              ID TRANSAKSI:{" "}
              <span className="font-mono font-bold text-foreground">
                {primaryPayment.gateway_transaction_id}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Cancelled reason */}
      {order.status === "cancelled" ? (
        <div className="rounded-xs border-2 border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            PESANAN DIBATALKAN
          </span>
          {order.cancellation_reason ? (
            <p className="mt-1 font-medium">ALASAN: {order.cancellation_reason}</p>
          ) : null}
        </div>
      ) : null}

      {/* Shipments info if any */}
      {order.shipments && order.shipments.length > 0 ? (
        <div className="rounded-xs border-2 border-border bg-card p-5">
          <h2 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
            INFORMASI PENGIRIMAN
          </h2>
          <div className="mt-3 divide-y divide-border text-xs">
            {order.shipments.map((s) => (
              <div key={s.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold uppercase text-foreground">
                    {s.courier_name} ({s.courier_service})
                  </span>
                  <Badge tone={s.status === "delivered" ? "success" : "info"}>
                    {s.status_label.toUpperCase()}
                  </Badge>
                </div>
                {s.tracking_number ? (
                  <p className="mt-1 text-muted-foreground">
                    NOMOR RESI:{" "}
                    <span className="font-mono font-black text-foreground">
                      {s.tracking_number}
                    </span>
                  </p>
                ) : null}
                {s.shipped_at ? (
                  <p className="mt-0.5 text-muted-foreground">
                    DIKIRIM PADA: {formatDate(s.shipped_at)}
                  </p>
                ) : null}

                {/* Manifest timeline pushed by the courier webhook */}
                {s.tracking_history && s.tracking_history.length > 0 ? (
                  <ol className="mt-4 space-y-3 border-l-2 border-foreground pl-4">
                    {[...s.tracking_history].reverse().map((entry, index) => (
                      <li key={`${s.id}-${index}`} className="relative">
                        <span
                          className={`absolute -left-[21px] top-1.5 size-2.5 rounded-full ${
                            index === 0 ? "bg-foreground ring-2 ring-background" : "bg-border"
                          }`}
                        />
                        <p className="font-bold text-foreground">{entry.description}</p>
                        {entry.occurred_at ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatDateTime(entry.occurred_at)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Snapshot items */}
      <div className="rounded-xs border-2 border-border bg-card p-5">
        <h2 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
          RINCIAN PRODUK DIPESAN
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <span className="font-display text-sm font-black uppercase tracking-tight text-foreground">
                  {item.product_name}
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="font-mono tabular-nums text-foreground">SKU {item.variant_sku}</span>
                  <span aria-hidden="true">·</span>
                  <span>UKURAN: {item.variant_size}</span>
                  <span aria-hidden="true">·</span>
                  <span>WARNA: {item.variant_color}</span>
                </div>
              </div>

              <div className="text-right text-sm">
                <p className="text-xs font-bold tabular-nums text-muted-foreground">
                  {item.quantity} × {formatCurrency(item.unit_price)}
                </p>
                <p className="font-mono text-base font-black tabular-nums text-foreground">
                  {formatCurrency(item.line_total)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Return history */}
      {existingReturns.length > 0 ? (
        <div className="rounded-xs border-2 border-border bg-card p-5">
          <h2 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
            RIWAYAT RETUR &amp; TUKAR
          </h2>
          <div className="mt-3 divide-y divide-border">
            {existingReturns.map((ret) => (
              <div key={ret.id} className="space-y-2 py-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">
                      #{ret.return_number}
                    </span>
                    <Badge tone={returnStatusTone(ret.status)}>
                      {ret.status_label.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {formatCurrency(ret.refund_amount)}
                  </span>
                </div>

                <p className="text-muted-foreground">
                  <span className="font-bold uppercase text-foreground">
                    {ret.reason_category_label}
                  </span>
                  {" — "}
                  {ret.reason}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                  {ret.requested_at ? (
                    <span>DIAJUKAN: {formatDateTime(ret.requested_at)}</span>
                  ) : null}
                  {ret.received_at ? (
                    <span>DITERIMA GUDANG: {formatDateTime(ret.received_at)}</span>
                  ) : null}
                  {ret.refunded_at ? (
                    <span>DANA DIKEMBALIKAN: {formatDateTime(ret.refunded_at)}</span>
                  ) : null}
                </div>

                {ret.items && ret.items.length > 0 ? (
                  <ul className="space-y-1 border-t border-border pt-2">
                    {ret.items.map((line) => (
                      <li
                        key={line.id}
                        className="flex items-center justify-between gap-3 font-medium"
                      >
                        <span className="text-foreground">
                          {line.product_name ?? "Produk"} × {line.quantity}
                          {line.condition_label ? (
                            <span className="ml-1 text-muted-foreground">
                              ({line.condition_label})
                            </span>
                          ) : null}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(line.refund_amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {ret.resolution ? (
                  <p className="border-l-2 border-foreground pl-3 text-muted-foreground">
                    <span className="font-bold uppercase text-foreground">
                      TANGGAPAN ADMIN:{" "}
                    </span>
                    {ret.resolution}
                  </p>
                ) : null}

                {ret.refund_method_label ? (
                  <p className="text-muted-foreground">
                    METODE REFUND:{" "}
                    <span className="font-bold text-foreground">
                      {ret.refund_method_label}
                    </span>
                    {ret.refund_reference ? (
                      <span className="ml-1 font-mono">
                        ({ret.refund_reference})
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {ret.status === "requested" ? (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      loading={cancellingReturnNumber === ret.return_number}
                      onClick={() => void handleCancelReturn(ret.return_number)}
                      className="rounded-xs font-bold uppercase tracking-wider"
                    >
                      BATALKAN PENGAJUAN
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Address & Payment Summary Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Shipping details snapshot */}
        <div className="rounded-xs border-2 border-border bg-card p-5">
          <h2 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
            ALAMAT PENERIMA
          </h2>
          <div className="mt-3 text-xs text-foreground">
            <p className="font-display text-sm font-black uppercase text-foreground">{order.shipping.name}</p>
            <p className="mt-1 font-mono tabular-nums text-muted-foreground">
              {order.shipping.phone}
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {order.shipping.address}
              {order.shipping.district ? `, Kec. ${order.shipping.district}` : ""},{" "}
              {order.shipping.city}, {order.shipping.province}{" "}
              {order.shipping.postal_code}
            </p>
            {order.notes ? (
              <p className="mt-3 border-l-2 border-foreground pl-3 text-muted-foreground">
                <span className="font-bold uppercase text-foreground">CATATAN: </span>
                {order.notes}
              </p>
            ) : null}
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="rounded-xs border-2 border-border bg-card p-5">
          <h2 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
            RINGKASAN PEMBAYARAN
          </h2>
          <dl className="mt-3 space-y-2.5 text-xs">
            <div className="flex justify-between font-bold uppercase text-muted-foreground">
              <dt>SUBTOTAL PRODUK</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {formatCurrency(order.subtotal)}
              </dd>
            </div>
            {order.discount_total > 0 ? (
              <div className="flex justify-between font-bold uppercase text-muted-foreground">
                <dt>DISKON VOUCHER</dt>
                <dd className="font-mono tabular-nums text-danger">
                  − {formatCurrency(order.discount_total)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between font-bold uppercase text-muted-foreground">
              <dt>BIAYA PENGIRIMAN</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {order.shipping_cost > 0
                  ? formatCurrency(order.shipping_cost)
                  : "GRATIS"}
              </dd>
            </div>
            <div className="border-t-2 border-foreground pt-3 text-sm text-foreground">
              <div className="flex items-baseline justify-between">
                <dt className="font-display text-xs font-black uppercase tracking-wider">
                  TOTAL PEMBAYARAN
                </dt>
                <dd className="font-mono text-xl font-black tabular-nums text-foreground">
                  {formatCurrency(order.grand_total)}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewFormModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        orderNumber={orderNumber}
        status={feedback}
        onSubmitted={() => {
          feedbackStatus.reload();
          detail.reload();
        }}
      />

      {/* Return Request Modal */}
      <Modal
        open={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Ajukan Retur"
        description="Pilih produk dan jumlah yang ingin dikembalikan. Tim gudang akan memverifikasi barang sebelum dana dikembalikan."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReturnModal(false)}
              disabled={submittingReturn}
            >
              Kembali
            </Button>
            <Button
              type="submit"
              form="return-request-form"
              variant="primary"
              size="sm"
              loading={submittingReturn}
            >
              Kirim Pengajuan
            </Button>
          </>
        }
      >
        <form
          id="return-request-form"
          onSubmit={handleSubmitReturn}
          className="space-y-4"
        >
          {returnError ? <Alert tone="error">{returnError}</Alert> : null}

          <Select
            label="Kategori Alasan"
            name="return_reason_category"
            required
            value={returnReasonCategory}
            onChange={(e) =>
              setReturnReasonCategory(e.target.value as ReturnReason)
            }
          >
            {RETURN_REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Textarea
            label="Alasan Retur"
            name="return_reason"
            required
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Jelaskan kondisi barang atau alasan pengembalian…"
          />

          <Textarea
            label="Catatan Tambahan (Opsional)"
            name="return_notes"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="mis. nomor rekening atau informasi pendukung lainnya"
          />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Produk yang Diretur
            </p>
            <div className="divide-y divide-border border-y border-border">
              {order.items.map((item) => {
                const remaining = remainingQuantity(item);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {item.product_name}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {item.variant_sku} · Dibeli {item.quantity} pcs · sisa{" "}
                        {remaining} pcs · {formatCurrency(item.unit_price)}/pcs
                      </p>
                    </div>

                    <div className="w-full sm:w-32">
                      <Input
                        type="number"
                        name={`return_quantity_${item.id}`}
                        min={0}
                        max={remaining}
                        value={returnQuantities[item.id] ?? 0}
                        disabled={remaining === 0}
                        onChange={(e) =>
                          setReturnQuantity(item.id, e.target.value, remaining)
                        }
                        aria-label={`Jumlah retur ${item.product_name}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Batalkan Pesanan"
        description="Stok produk yang telah dicadangkan untuk Anda akan segera dikembalikan ke katalog toko."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelling}
            >
              Kembali
            </Button>
            <Button
              tone="danger"
              size="sm"
              loading={cancelling}
              onClick={handleConfirmCancel}
            >
              Ya, Batalkan
            </Button>
          </>
        }
      >
        {cancelError ? (
          <div className="mb-4">
            <Alert tone="error">{cancelError}</Alert>
          </div>
        ) : null}

        <label
          htmlFor="cancel-reason"
          className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
        >
          Alasan Pembatalan (Opsional)
        </label>
        <textarea
          id="cancel-reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          placeholder="mis. Ingin mengubah alamat atau metode pembayaran"
          className={fieldClasses}
        />
      </Modal>
    </div>
  );
}

export function CustomerOrderDetail() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner /> Memuat pesanan…
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
