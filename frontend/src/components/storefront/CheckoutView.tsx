"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { ProductThumbnail } from "@/components/storefront/ProductThumbnail";
import { ShippingDestinationPicker } from "@/components/storefront/ShippingDestinationPicker";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClasses, Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { createAddress, fetchAddresses } from "@/lib/api/addresses";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { submitCheckout } from "@/lib/api/checkout";
import { applyCoupon } from "@/lib/api/promotions";
import { fetchShippingRates } from "@/lib/api/shipping";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCartStore } from "@/lib/stores/cartStore";
import type {
  Address,
  ShippingDestination,
  ShippingQuote,
} from "@/lib/types/order";
import type { CouponApplicationResult } from "@/lib/types/promotion";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const PAYMENT_METHODS = [
  {
    id: "bank_transfer",
    name: "Transfer Bank (Virtual Account / Manual)",
    description: "Bayar via ATM, Mobile Banking, atau Internet Banking.",
  },
  {
    id: "cod",
    name: "Bayar di Tempat (COD)",
    description: "Bayar langsung dengan uang tunai saat kurir tiba di alamat Anda.",
  },
  {
    id: "ewallet",
    name: "E-Wallet / QRIS",
    description: "Pembayaran instan melalui GoPay, OVO, Dana, atau QRIS.",
  },
] as const;

function quoteKey(quote: ShippingQuote): string {
  return `${quote.code}:${quote.service}`;
}

export function CheckoutView() {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const cart = useCartStore((state) => state.cart);
  const loadCart = useCartStore((state) => state.loadCart);
  const clearCart = useCartStore((state) => state.clearCart);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");

  // Manual / New Address Form
  const [newAddress, setNewAddress] = useState({
    recipient_name: "",
    phone: "",
    address_line_1: "",
    district: "",
    city: "",
    province: "",
    postal_code: "",
    save_to_book: true,
  });

  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "cod" | "ewallet">("bank_transfer");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponApplicationResult | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Shipping destination and courier quotes. The payload is tagged with the
  // destination it was fetched for, so a slow response can never be rendered
  // against a different city.
  const [destination, setDestination] = useState<ShippingDestination | null>(null);
  const [quoteResult, setQuoteResult] = useState<{
    destinationId: string;
    quotes: ShippingQuote[];
    error: string | null;
  } | null>(null);
  const [selectedQuoteKey, setSelectedQuoteKey] = useState<string | null>(null);

  async function handleApplyCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponCodeInput.trim()) {
      return;
    }
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const result = await applyCoupon(couponCodeInput.trim());
      setAppliedCoupon(result);
    } catch (err) {
      setCouponError(getApiErrorMessage(err));
    } finally {
      setApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponError(null);
  }

  useEffect(() => {
    if (hydrated && user) {
      void loadCart();
      fetchAddresses()
        .then((data) => {
          setAddresses(data);
          const defaultAddr = data.find((a) => a.is_default) ?? data[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            if (defaultAddr.rajaongkir_destination_id) {
              setDestination({
                id: defaultAddr.rajaongkir_destination_id,
                name: defaultAddr.city,
                province: defaultAddr.province,
              });
            }
          } else {
            setSelectedAddressId("new");
            setNewAddress((prev) => ({
              ...prev,
              recipient_name: user.name,
              phone: user.phone ?? "",
            }));
          }
        })
        .catch(() => {
          setSelectedAddressId("new");
        })
        .finally(() => {
          setLoadingAddresses(false);
        });
    }
  }, [hydrated, user, loadCart]);

  useEffect(() => {
    if (!hydrated || !user || !destination) {
      return;
    }

    let cancelled = false;

    fetchShippingRates({ destination_id: destination.id })
      .then((result) => {
        if (!cancelled) {
          setQuoteResult({
            destinationId: destination.id,
            quotes: result.couriers,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuoteResult({
            destinationId: destination.id,
            quotes: [],
            error: getApiErrorMessage(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, user, destination, cart?.items_count]);

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        Menyiapkan checkout…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <EmptyState
          title="Silakan masuk terlebih dahulu"
          description="Untuk melanjutkan ke proses pembayaran, masuk ke akun Anda."
          action={
            <Link
              href="/auth/login?redirect=/checkout"
              className={buttonClasses("primary", "md")}
            >
              Masuk ke Akun
            </Link>
          }
        />
      </div>
    );
  }

  const items = cart?.items ?? [];
  const activeQuoteResult =
    quoteResult && destination && quoteResult.destinationId === destination.id
      ? quoteResult
      : null;
  const quotes = activeQuoteResult?.quotes ?? [];
  const quoteError = activeQuoteResult?.error ?? null;
  const loadingQuotes = destination !== null && activeQuoteResult === null;
  // Fall back to the cheapest service until the customer picks one explicitly.
  const selectedQuote =
    quotes.find((quote) => quoteKey(quote) === selectedQuoteKey) ?? quotes[0] ?? null;
  const shippingCost = appliedCoupon?.is_free_shipping
    ? 0
    : (selectedQuote?.cost ?? 0);

  function handleDestinationChange(next: ShippingDestination | null) {
    setDestination(next);
    setSelectedQuoteKey(null);
  }

  function handleSelectAddress(address: Address) {
    setSelectedAddressId(address.id);
    handleDestinationChange(
      address.rajaongkir_destination_id
        ? {
            id: address.rajaongkir_destination_id,
            name: address.city,
            province: address.province,
          }
        : null,
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <EmptyState
          title="Keranjang belanja kosong"
          description="Anda tidak dapat melakukan checkout tanpa barang di keranjang."
          action={
            <Link href="/products" className={buttonClasses("primary", "md")}>
              Mulai Belanja
            </Link>
          }
        />
      </div>
    );
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      let addressIdToSend: string | undefined = undefined;

      if (selectedAddressId !== "new") {
        addressIdToSend = selectedAddressId;
      } else {
        // If user wants to save to address book, create it first
        if (newAddress.save_to_book) {
          try {
            const created = await createAddress({
              label: "Alamat Pengiriman",
              recipient_name: newAddress.recipient_name.trim(),
              phone: newAddress.phone.trim(),
              address_line_1: newAddress.address_line_1.trim(),
              district: newAddress.district.trim() || null,
              city: newAddress.city.trim(),
              province: newAddress.province.trim(),
              postal_code: newAddress.postal_code.trim(),
              rajaongkir_destination_id: destination?.id ?? null,
              is_default: addresses.length === 0,
            });
            addressIdToSend = created.id;
          } catch {
            // Jika gagal simpan ke buku alamat, tetap lanjutkan via snapshot data langsung
          }
        }
      }

      const payload = {
        ...(addressIdToSend
          ? { address_id: addressIdToSend }
          : {
              shipping_name: newAddress.recipient_name.trim(),
              shipping_phone: newAddress.phone.trim(),
              shipping_address: newAddress.address_line_1.trim(),
              shipping_district: newAddress.district.trim() || null,
              shipping_city: newAddress.city.trim(),
              shipping_province: newAddress.province.trim(),
              shipping_postal_code: newAddress.postal_code.trim(),
            }),
        shipping_destination_id: destination?.id ?? undefined,
        courier_code: selectedQuote?.code ?? undefined,
        courier_service: selectedQuote?.service ?? undefined,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        notes: notes.trim() || null,
      };

      const order = await submitCheckout(payload);
      clearCart();
      router.push(`/account/orders/${order.order_number}`);
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      setErrorMessage(getApiErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b-2 border-foreground pb-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
          SECURE CHECKOUT
        </p>
        <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
          PEMBAYARAN &amp; PENGIRIMAN
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Konfirmasi alamat pengiriman, kurir, dan metode pembayaran Anda.
        </p>
      </div>

      {errorMessage ? (
        <div className="mt-6">
          <Alert tone="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <form onSubmit={handleCheckout} className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-7">
          {/* Alamat Pengiriman */}
          <div className="rounded-xs border-2 border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-xs font-black uppercase tracking-[0.14em] text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                1
              </span>
              ALAMAT PENGIRIMAN
            </h2>

            {loadingAddresses ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> Memuat alamat…
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                          selectedAddressId === addr.id
                            ? "border-foreground bg-muted/40"
                            : "border-border hover:border-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="address_choice"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleSelectAddress(addr)}
                          className="mt-1 text-primary focus:ring-primary"
                        />
                        <div className="flex-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {addr.recipient_name}
                            </span>
                            {addr.label ? (
                              <Badge tone="neutral">{addr.label}</Badge>
                            ) : null}
                            {addr.is_default ? (
                              <Badge tone="info">Utama</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {addr.phone}
                          </p>
                          <p className="mt-1 text-xs text-foreground">
                            {addr.address_line_1}
                            {addr.district ? `, ${addr.district}` : ""}, {addr.city},{" "}
                            {addr.province} {addr.postal_code}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : null}

                <label
                  className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                    selectedAddressId === "new"
                      ? "border-foreground bg-muted/40"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="address_choice"
                    value="new"
                    checked={selectedAddressId === "new"}
                    onChange={() => {
                      setSelectedAddressId("new");
                      handleDestinationChange(null);
                    }}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">
                      {addresses.length > 0 ? "Gunakan Alamat Lain" : "Tulis Alamat Pengiriman"}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Ketik alamat baru untuk pesanan ini.
                    </p>
                  </div>
                </label>

                {selectedAddressId === "new" ? (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Nama Penerima"
                        name="shipping_name"
                        required
                        value={newAddress.recipient_name}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            recipient_name: e.target.value,
                          }))
                        }
                        error={fieldErrors.shipping_name}
                      />
                      <Input
                        label="Nomor Telepon"
                        name="shipping_phone"
                        type="tel"
                        required
                        value={newAddress.phone}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        error={fieldErrors.shipping_phone}
                      />
                    </div>

                    <Input
                      label="Alamat Lengkap (Jalan, No. Rumah, RT/RW)"
                      name="shipping_address"
                      required
                      value={newAddress.address_line_1}
                      onChange={(e) =>
                        setNewAddress((prev) => ({
                          ...prev,
                          address_line_1: e.target.value,
                        }))
                      }
                      error={fieldErrors.shipping_address}
                    />

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Input
                        label="Kecamatan (Opsional)"
                        name="shipping_district"
                        value={newAddress.district}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            district: e.target.value,
                          }))
                        }
                        error={fieldErrors.shipping_district}
                      />
                      <Input
                        label="Kota / Kabupaten"
                        name="shipping_city"
                        required
                        value={newAddress.city}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        error={fieldErrors.shipping_city}
                      />
                      <Input
                        label="Provinsi"
                        name="shipping_province"
                        required
                        value={newAddress.province}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            province: e.target.value,
                          }))
                        }
                        error={fieldErrors.shipping_province}
                      />
                    </div>

                    <div className="sm:w-1/3">
                      <Input
                        label="Kode Pos"
                        name="shipping_postal_code"
                        required
                        value={newAddress.postal_code}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            postal_code: e.target.value,
                          }))
                        }
                        error={fieldErrors.shipping_postal_code}
                      />
                    </div>

                    <ShippingDestinationPicker
                      value={destination}
                      onChange={handleDestinationChange}
                      error={fieldErrors.shipping_destination_id}
                    />

                    <label className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={newAddress.save_to_book}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            save_to_book: e.target.checked,
                          }))
                        }
                        className="rounded-sm border-border accent-primary"
                      />
                      Simpan alamat ini ke buku alamat saya
                    </label>
                  </div>
                ) : null}

                {selectedAddressId !== "new" && !destination ? (
                  <div className="border border-warning/30 bg-warning/5 p-4">
                    <p className="text-xs text-muted-foreground">
                      Alamat ini belum memiliki kota tujuan kurir. Pilih kota
                      tujuan agar ongkos kirim dapat dihitung otomatis.
                    </p>
                    <div className="mt-3">
                      <ShippingDestinationPicker
                        value={destination}
                        onChange={handleDestinationChange}
                        error={fieldErrors.shipping_destination_id}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Metode Pengiriman */}
          <div className="rounded-xs border-2 border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-xs font-black uppercase tracking-[0.14em] text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                2
              </span>
              METODE PENGIRIMAN
            </h2>

            {!destination ? (
              <p className="mt-4 text-xs font-medium text-muted-foreground">
                Pilih kota tujuan pengiriman terlebih dahulu untuk melihat tarif
                kurir.
              </p>
            ) : loadingQuotes ? (
              <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Spinner /> MENGHITUNG ONGKOS KIRIM...
              </div>
            ) : quoteError ? (
              <div className="mt-4">
                <Alert tone="error">{quoteError}</Alert>
              </div>
            ) : quotes.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Tidak ada layanan kurir untuk tujuan ini.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {quotes.map((quote) => {
                  const key = quoteKey(quote);
                  // The cheapest service is preselected until the customer picks one.
                  const isSelected =
                    selectedQuote !== null && quoteKey(selectedQuote) === key;

                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-start gap-3 border-2 p-4 transition-colors rounded-xs ${
                        isSelected
                          ? "border-foreground bg-muted/40"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="courier_choice"
                        value={key}
                        checked={isSelected}
                        onChange={() => setSelectedQuoteKey(key)}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold uppercase text-foreground">
                            {quote.name} · {quote.service}
                          </span>
                          <span className="font-mono font-black text-foreground">
                            {appliedCoupon?.is_free_shipping
                              ? "GRATIS"
                              : formatCurrency(quote.cost)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {quote.description}
                          {quote.etd ? ` · Estimasi ${quote.etd}` : ""}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {fieldErrors.courier_service ? (
              <p className="mt-2 text-xs text-danger">
                {fieldErrors.courier_service}
              </p>
            ) : null}
          </div>

          {/* Metode Pembayaran */}
          <div className="rounded-xs border-2 border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-xs font-black uppercase tracking-[0.14em] text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                3
              </span>
              METODE PEMBAYARAN
            </h2>

            <div className="mt-4 space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                    paymentMethod === method.id
                      ? "border-foreground bg-muted/40"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">
                      {method.name}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {fieldErrors.payment_method ? (
              <p className="mt-2 text-xs text-danger">
                {fieldErrors.payment_method}
              </p>
            ) : null}
          </div>

          {/* Catatan Tambahan */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span className="mr-2 text-foreground">04</span> Catatan Pesanan
            </h2>
            <div className="mt-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="mis. Titipkan pada satpam jika penerima sedang tidak di tempat."
                rows={3}
                aria-label="Catatan pesanan"
                className={fieldClasses}
              />
            </div>
          </div>
        </div>

        {/* Ringkasan Belanja */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <div className="rounded-xs border-2 border-foreground bg-card p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-danger">
              RINGKASAN
            </p>
            <h2 className="mt-1 font-display text-xl font-black uppercase tracking-tight text-foreground">
              RINGKASAN PESANAN
            </h2>

            <ul className="mt-4 max-h-72 divide-y divide-border overflow-y-auto pr-1 text-xs">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  <div className="aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-xs border border-border bg-muted">
                    <ProductThumbnail
                      src={item.product?.thumbnail}
                      alt={item.product?.name ?? "Produk"}
                      className="size-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-bold uppercase text-foreground">
                      {item.product?.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                      <span>UKURAN: {item.variant?.size}</span>
                      <span aria-hidden="true">·</span>
                      <span>WARNA: {item.variant?.color}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-foreground">{item.quantity}x</span>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold tabular-nums text-foreground">
                    {formatCurrency(item.line_total)}
                  </div>
                </li>
              ))}
            </ul>

            {/* Voucher / Kupon Input */}
            <div className="mt-4 border-t-2 border-border pt-4">
              <label
                htmlFor="coupon-code"
                className="text-[11px] font-bold uppercase tracking-wider text-foreground"
              >
                KUPON DISKON / VOUCHER
              </label>

              {appliedCoupon ? (
                <div className="mt-2 flex items-center justify-between border-2 border-success bg-success/10 p-2.5 rounded-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-success">
                        {appliedCoupon.code}
                      </span>
                      <Badge variant="success">
                        -{formatCurrency(appliedCoupon.discount_amount)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{appliedCoupon.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-danger hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      id="coupon-code"
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      placeholder="Masukkan kode promo…"
                      className={cn(fieldClasses, "font-mono uppercase text-xs rounded-xs")}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyCoupon}
                      loading={applyingCoupon}
                      className="rounded-xs shrink-0 font-bold"
                    >
                      TERAPKAN
                    </Button>
                  </div>
                  {couponError ? (
                    <p className="text-xs font-bold text-danger">{couponError}</p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground">
                    Contoh kode promo:{" "}
                    <span className="font-mono font-bold text-foreground">FASHION10</span>{" "}
                    atau{" "}
                    <span className="font-mono font-bold text-foreground">GRATISONGKIR</span>
                  </p>
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-xs">
              <div className="flex justify-between font-medium text-muted-foreground">
                <dt>Subtotal ({cart?.items_count ?? 0} barang)</dt>
                <dd className="font-mono font-bold tabular-nums text-foreground">
                  {formatCurrency(cart?.subtotal ?? 0)}
                </dd>
              </div>

              {appliedCoupon && appliedCoupon.discount_amount > 0 ? (
                <div className="flex justify-between font-bold text-success">
                  <dt>Potongan Kupon ({appliedCoupon.code})</dt>
                  <dd className="font-mono tabular-nums">
                    − {formatCurrency(appliedCoupon.discount_amount)}
                  </dd>
                </div>
              ) : null}

              <div className="flex justify-between font-medium text-muted-foreground">
                <dt>
                  Ongkos Kirim
                  {selectedQuote ? (
                    <span className="ml-1 text-[11px] uppercase">
                      ({selectedQuote.name} {selectedQuote.service})
                    </span>
                  ) : null}
                </dt>
                <dd
                  className={`font-mono font-bold tabular-nums ${
                    shippingCost === 0 ? "text-success" : "text-foreground"
                  }`}
                >
                  {shippingCost === 0 ? "GRATIS" : formatCurrency(shippingCost)}
                </dd>
              </div>

              <div className="border-t-2 border-foreground pt-3">
                <div className="flex items-baseline justify-between text-foreground">
                  <dt className="text-xs font-black uppercase tracking-wider">
                    TOTAL PEMBAYARAN
                  </dt>
                  <dd className="font-display text-2xl font-black tabular-nums text-foreground">
                    {formatCurrency(
                      Math.max(
                        0,
                        (cart?.subtotal ?? 0) -
                          (appliedCoupon?.discount_amount ?? 0) +
                          shippingCost,
                      ),
                    )}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6">
              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={submitting}
                className="h-14 rounded-xs text-xs font-black uppercase tracking-[0.2em]"
              >
                BAYAR SEKARANG (PLACE ORDER)
              </Button>
            </div>

            <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
              Dengan mengklik &quot;Bayar Sekarang&quot;, Anda menyetujui syarat
              &amp; ketentuan pembelian di Qaireen Collection.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
