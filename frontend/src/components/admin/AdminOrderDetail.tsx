"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { PageHeader } from "@/components/admin/PageHeader";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/admin/Table";
import { statusTone } from "@/components/storefront/CustomerOrdersList";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { fieldClasses, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  fetchAdminOrder,
  shipAdminOrder,
  trackAdminShipment,
  updateAdminOrderStatus,
} from "@/lib/api/orders";
import type { Order, OrderStatus } from "@/lib/types/order";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate, formatDateTime } from "@/lib/utils/formatDate";

const COURIER_PRESETS = [
  { code: "jne", name: "JNE", defaultService: "REG" },
  { code: "jnt", name: "J&T Express", defaultService: "EZ" },
  { code: "sicepat", name: "SiCepat", defaultService: "SIUNT" },
  { code: "anteraja", name: "AnterAja", defaultService: "REG" },
  { code: "pos", name: "Pos Indonesia", defaultService: "Kilat Khusus" },
];

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Ship Modal State
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [courierCode, setCourierCode] = useState("jne");
  const [courierName, setCourierName] = useState("JNE");
  const [courierService, setCourierService] = useState("REG");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);

  // Waybill tracking pull state
  const [trackingShipmentId, setTrackingShipmentId] = useState<string | null>(null);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Pemuatan memakai promise + flag `active`, bukan setState sinkron di dalam
  // effect: `loading` sudah bernilai true dari state awal, dan pemuatan ulang
  // sengaja tidak mengosongkan data lama supaya tabel tidak berkedip.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;

    fetchAdminOrder(id).then(
      (data) => {
        if (!active) {
          return;
        }
        setOrder(data);
        setError(null);
        setLoading(false);
      },
      () => {
        if (!active) {
          return;
        }
        setOrder(null);
        setError("Pesanan tidak ditemukan.");
        setLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [id, reloadToken]);

  // Checkout freezes the chosen courier on the order, so prefill the ship modal
  // with it instead of forcing the admin to retype the same service.
  function handleOpenShipModal() {
    if (order?.courier?.code) {
      setCourierCode(order.courier.code);
    }
    if (order?.courier?.name) {
      setCourierName(order.courier.name);
    }
    if (order?.courier?.service) {
      setCourierService(order.courier.service);
    }
    setShipModalOpen(true);
  }

  async function handleTrackShipment(shipmentId: string) {
    setTrackingShipmentId(shipmentId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await trackAdminShipment(shipmentId);
      setReloadToken((token) => token + 1);
      setActionSuccess("Status pelacakan resi berhasil diperbarui dari kurir.");
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setTrackingShipmentId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner /> Memuat data pesanan…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error ?? "Pesanan tidak ditemukan."}</Alert>
        <Link href="/admin/orders" className={buttonClasses("outline", "sm")}>
          ← Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  async function handleTransition(targetStatus: OrderStatus, reason?: string) {
    if (!order) {
      return;
    }
    setTransitioning(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await updateAdminOrderStatus(order.id, targetStatus, reason);
      setOrder(updated);
      setActionSuccess(`Status pesanan berhasil diubah menjadi ${updated.status_label}.`);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setTransitioning(false);
    }
  }

  async function handleShipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) {
      return;
    }
    setShippingLoading(true);
    setActionError(null);
    try {
      const updated = await shipAdminOrder(order.id, {
        courier_code: courierCode.trim(),
        courier_name: courierName.trim(),
        courier_service: courierService.trim(),
        tracking_number: trackingNumber.trim() || null,
        shipping_cost: shippingCost ? Number(shippingCost) : null,
        estimated_delivery: estimatedDelivery || null,
      });
      setOrder(updated);
      setShipModalOpen(false);
      setActionSuccess("Pesanan berhasil dikirim dan nomor resi tersimpan.");
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setShippingLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Pesanan"
          title={order.order_number}
          description={`Dibuat pada ${formatDate(order.created_at)}`}
        />
        <Link href="/admin/orders" className={buttonClasses("outline", "sm")}>
          ← Daftar Pesanan
        </Link>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {actionSuccess ? <Alert tone="success">{actionSuccess}</Alert> : null}

      {/* Status & Transition Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Status
          </span>
          <Badge tone={statusTone(order.status)}>
            {order.status_label}
          </Badge>
        </div>

        {order.allowed_transitions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Ubah ke
            </span>
            {order.allowed_transitions.map((t) => {
              if (t.value === "shipped") {
                return (
                  <Button
                    key={t.value}
                    size="sm"
                    onClick={handleOpenShipModal}
                    disabled={transitioning}
                  >
                    Kirim Pesanan (Input Resi)
                  </Button>
                );
              }

              if (t.value === "cancelled") {
                return (
                  <Button
                    key={t.value}
                    variant="outline"
                    tone="danger"
                    size="sm"
                    onClick={() => setCancelModalOpen(true)}
                    disabled={transitioning}
                  >
                    Batalkan
                  </Button>
                );
              }

              return (
                <Button
                  key={t.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTransition(t.value as OrderStatus)}
                  disabled={transitioning}
                >
                  Tandai {t.label}
                </Button>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            Status pesanan sudah final ({order.status_label}).
          </span>
        )}
      </div>

      {/* Cancellation Banner */}
      {order.status === "cancelled" ? (
        <div className="border border-danger/30 bg-danger/5 p-4 text-xs">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-danger">
            Pesanan Telah Dibatalkan
          </p>
          <p className="mt-1.5 text-foreground">
            Alasan: {order.cancellation_reason ?? "Tidak ada alasan spesifik."}
          </p>
          <p className="mt-1 text-muted-foreground">
            Waktu Pembatalan: {formatDate(order.cancelled_at)}
          </p>
        </div>
      ) : null}

      {/* Order Items Table */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Rincian Barang yang Dipesan
        </h2>
        <div className="mt-4">
          <Table>
            <THead>
              <TR>
                <TH>SKU</TH>
                <TH>Produk</TH>
                <TH>Varian</TH>
                <TH align="right">Harga Satuan</TH>
                <TH align="center">Jumlah</TH>
                <TH align="right">Subtotal</TH>
              </TR>
            </THead>
            <TBody>
              {order.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <span className="font-mono text-xs">{item.variant_sku}</span>
                  </TD>
                  <TD>
                    <span className="font-medium text-foreground">
                      {item.product_name}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-xs">
                      {item.variant_size} / {item.variant_color}
                    </span>
                  </TD>
                  <TD align="right">
                    <span className="text-xs">
                      {formatCurrency(item.unit_price)}
                    </span>
                  </TD>
                  <TD align="center">
                    <span className="font-semibold text-xs">
                      {item.quantity}
                    </span>
                  </TD>
                  <TD align="right">
                    <span className="font-semibold text-foreground text-xs">
                      {formatCurrency(item.line_total)}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </div>

      {/* Customer, Shipping, and Payment Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer & Shipping */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Data Pelanggan &amp; Pengiriman
          </h2>
          <div className="mt-3 space-y-3 text-xs">
            <div>
              <p className="text-muted-foreground">Akun Pelanggan:</p>
              <p className="font-medium text-foreground">
                {order.customer?.name ?? "Guest"}
              </p>
              <p className="text-muted-foreground">
                {order.customer?.email}
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-muted-foreground">Penerima Paket:</p>
              <p className="font-medium text-foreground">
                {order.shipping.name} ({order.shipping.phone})
              </p>
              <p className="mt-1 leading-relaxed text-foreground">
                {order.shipping.address}
                {order.shipping.district
                  ? `, Kec. ${order.shipping.district}`
                  : ""}
                , {order.shipping.city}, {order.shipping.province}{" "}
                {order.shipping.postal_code}
              </p>
            </div>

            {order.notes ? (
              <div className="border-t border-border pt-3">
                <p className="text-muted-foreground">Catatan Pesanan:</p>
                <p className="mt-1 border-l border-border pl-3 text-foreground">
                  {order.notes}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Payments History */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Riwayat Pembayaran
          </h2>
          <div className="mt-3 divide-y divide-border text-xs">
            {order.payments && order.payments.length > 0 ? (
              order.payments.map((p) => (
                <div key={p.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium uppercase">
                      {p.payment_method.replace("_", " ")}
                    </span>
                    <Badge tone={p.status === "paid" ? "success" : "warning"}>
                      {p.status_label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Jumlah:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(p.amount)}
                    </span>
                  </p>
                  {p.payment_gateway ? (
                    <p className="text-muted-foreground">
                      Gateway:{" "}
                      <span className="font-medium text-foreground">
                        {p.payment_gateway}
                      </span>
                    </p>
                  ) : null}
                  {p.gateway_transaction_id ? (
                    <p className="text-muted-foreground">
                      ID Transaksi:{" "}
                      <span className="font-mono text-foreground">
                        {p.gateway_transaction_id}
                      </span>
                    </p>
                  ) : null}
                  {p.paid_at ? (
                    <p className="text-muted-foreground">
                      Dibayar pada: {formatDate(p.paid_at)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="py-3 text-muted-foreground">
                Belum ada transaksi pembayaran.
              </p>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Ringkasan Keuangan
          </h2>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal Produk</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(order.subtotal)}
              </dd>
            </div>
            {order.discount_total > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <dt>Diskon</dt>
                <dd className="font-medium tabular-nums text-success">
                  − {formatCurrency(order.discount_total)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between text-muted-foreground">
              <dt>Ongkos Kirim</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(order.shipping_cost)}
              </dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Pajak</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(order.tax_amount)}
              </dd>
            </div>
            <div className="border-t border-border pt-3 text-sm text-foreground">
              <div className="flex items-baseline justify-between">
                <dt className="text-xs uppercase tracking-[0.12em]">
                  Grand Total
                </dt>
                <dd className="text-base tabular-nums">
                  {formatCurrency(order.grand_total)}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Shipments List */}
      {order.shipments && order.shipments.length > 0 ? (
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Data Pengiriman &amp; Nomor Resi
          </h2>
          <div className="mt-3 divide-y divide-border text-xs">
            {order.shipments.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-foreground">
                    {s.courier_name} — Layanan: {s.courier_service}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    No. Resi:{" "}
                    <span className="font-mono text-foreground">
                      {s.tracking_number ?? "Belum diinput"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge tone={s.status === "delivered" ? "success" : "info"}>
                      {s.status_label}
                    </Badge>
                    {s.shipped_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dikirim: {formatDate(s.shipped_at)}
                      </p>
                    ) : null}
                  </div>
                  {s.tracking_number ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTrackShipment(s.id)}
                      loading={trackingShipmentId === s.id}
                      disabled={trackingShipmentId !== null}
                    >
                      Lacak Resi
                    </Button>
                  ) : null}
                </div>

                {s.tracking_history && s.tracking_history.length > 0 ? (
                  <div className="mt-2 w-full border-t border-border pt-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Riwayat Pelacakan
                      {s.last_tracked_at
                        ? ` · diperbarui ${formatDateTime(s.last_tracked_at)}`
                        : ""}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {[...s.tracking_history].reverse().map((entry, index) => (
                        <li key={`${s.id}-${index}`} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {entry.description}
                          </span>
                          {entry.occurred_at
                            ? ` · ${formatDateTime(entry.occurred_at)}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Ship Modal */}
      <Modal
        open={shipModalOpen}
        onClose={() => setShipModalOpen(false)}
        title="Kirim Pesanan"
        description="Masukkan data kurir dan nomor resi pengiriman untuk pelanggan."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShipModalOpen(false)}
              disabled={shippingLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="ship-order-form"
              size="sm"
              loading={shippingLoading}
            >
              Kirim Pesanan
            </Button>
          </>
        }
      >
        <form
          id="ship-order-form"
          onSubmit={handleShipSubmit}
          className="space-y-4"
        >
              <div>
                <label className="text-xs font-medium text-foreground">
                  Pilih Kurir
                </label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {COURIER_PRESETS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCourierCode(c.code);
                        setCourierName(c.name);
                        setCourierService(c.defaultService);
                      }}
                      className={`border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors ${
                        courierCode === c.code
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground hover:border-foreground"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Nama Kurir"
                  required
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                />
                <Input
                  label="Layanan Kurir"
                  required
                  value={courierService}
                  onChange={(e) => setCourierService(e.target.value)}
                />
              </div>

              <Input
                label="Nomor Resi / AWB (Tracking Number)"
                required
                placeholder="mis. JNE123456789"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Biaya Kirim Nyata (Opsional)"
                  type="number"
                  placeholder="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                />
                <Input
                  label="Perkiraan Tiba (Opsional)"
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                />
              </div>

        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Batalkan Pesanan"
        description="Membatalkan pesanan akan melepaskan atau mengembalikan stok persediaan barang ke gudang."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={transitioning}
            >
              Batal
            </Button>
            <Button
              tone="danger"
              size="sm"
              loading={transitioning}
              onClick={async () => {
                setCancelModalOpen(false);
                await handleTransition(
                  "cancelled",
                  cancelReason.trim() || undefined,
                );
              }}
            >
              Konfirmasi Pembatalan
            </Button>
          </>
        }
      >
        <label
          htmlFor="admin-cancel-reason"
          className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
        >
          Alasan Pembatalan
        </label>
        <textarea
          id="admin-cancel-reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          placeholder="mis. Permintaan pelanggan / Stok rusak / Alamat tidak valid"
          className={fieldClasses}
        />
      </Modal>
    </div>
  );
}
