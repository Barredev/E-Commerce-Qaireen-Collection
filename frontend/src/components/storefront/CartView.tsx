"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductThumbnail } from "@/components/storefront/ProductThumbnail";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCartStore } from "@/lib/stores/cartStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const FREE_SHIPPING_THRESHOLD = 250000;

export function CartView() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const cart = useCartStore((state) => state.cart);
  const loading = useCartStore((state) => state.loading);
  const loadCart = useCartStore((state) => state.loadCart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);

  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && user) {
      void loadCart();
    }
  }, [hydrated, user, loadCart]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner />
        MEMUAT KERANJANG...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <EmptyState
          title="ANDA BELUM MASUK"
          description="Silakan masuk ke akun Anda terlebih dahulu untuk melihat dan mengelola tas belanja."
          action={
            <Link
              href="/auth/login?redirect=/cart"
              className={buttonClasses("primary", "md")}
            >
              MASUK KE AKUN
            </Link>
          }
        />
      </div>
    );
  }

  if (loading && !cart) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner />
        MEMUAT TAS BELANJA ANDA...
      </div>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <EmptyState
          title="TAS BELANJA KOSONG"
          description="Anda belum menambahkan produk apa pun ke dalam tas belanja."
          action={
            <Link href="/products" className={buttonClasses("primary", "md")}>
              JELAJAHI PRODUK SEKARANG
            </Link>
          }
        />
      </div>
    );
  }

  const subtotal = cart?.subtotal ?? 0;
  const freeShippingDiff = FREE_SHIPPING_THRESHOLD - subtotal;
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  async function handleQuantityChange(itemId: string, newQty: number) {
    if (newQty < 1) {
      return;
    }
    setBusyItemId(itemId);
    setErrorMessage(null);
    try {
      await updateItem(itemId, newQty);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setBusyItemId(itemId);
    setErrorMessage(null);
    try {
      await removeItem(itemId);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
            SHOPPING BAG
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            TAS BELANJA SAYA ({cart?.items_count ?? 0})
          </h1>
        </div>
        <Link
          href="/products"
          className="text-xs font-black uppercase tracking-[0.14em] text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
        >
          ← LANJUT BELANJA
        </Link>
      </div>

      {/* Free Shipping Progress Bar (Fashion Nova Signature) */}
      <div className="mt-6 rounded-xs border-2 border-foreground bg-muted/40 p-4">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-foreground">
          <span>
            {freeShippingDiff <= 0 ? (
              <span className="text-green-600 dark:text-green-400">
                🎉 SELAMAT! ANDA MENDAPATKAN GRATIS ONGKIR
              </span>
            ) : (
              <span>
                BELANJA <span className="text-danger">{formatCurrency(freeShippingDiff)}</span> LAGI UNTUK GRATIS ONGKIR!
              </span>
            )}
          </span>
          <span className="font-mono">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-xs bg-border">
          <div
            className="h-full bg-foreground transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4">
          <Alert tone="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8">
          <ul className="divide-y divide-border border-b border-t border-border">
            {items.map((item) => {
              const isBusy = busyItemId === item.id;
              const product = item.product;
              const variant = item.variant;

              return (
                <li key={item.id} className="flex gap-4 py-6 sm:gap-6">
                  {/* Portrait 2:3 thumbnail */}
                  <div className="aspect-[2/3] w-20 sm:w-28 shrink-0 overflow-hidden rounded-xs border border-border bg-muted">
                    <ProductThumbnail
                      src={product?.thumbnail}
                      alt={product?.name ?? "Produk"}
                      className="size-full"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm font-bold uppercase tracking-tight text-foreground">
                          {product?.slug ? (
                            <Link
                              href={`/products/${product.slug}`}
                              className="hover:text-danger"
                            >
                              {product.name}
                            </Link>
                          ) : (
                            product?.name
                          )}
                        </h2>

                        <p className="shrink-0 font-mono text-sm font-black tabular-nums text-foreground sm:text-base">
                          {formatCurrency(item.line_total)}
                        </p>
                      </div>

                      {variant ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-xs border border-border bg-card px-2 py-0.5 font-bold uppercase">
                            UKURAN: {variant.size}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-xs border border-border bg-card px-2 py-0.5 font-bold uppercase">
                            {variant.color_hex ? (
                              <span
                                className="size-2.5 rounded-full border border-black/20"
                                style={{ backgroundColor: variant.color_hex }}
                              />
                            ) : null}
                            WARNA: {variant.color}
                          </span>
                          <span className="font-mono text-xs">
                            @ {formatCurrency(item.unit_price)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-xs border-2 border-border bg-card">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity - 1)
                          }
                          disabled={isBusy || item.quantity <= 1}
                          className="flex size-8 items-center justify-center font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-30 cursor-pointer"
                          aria-label="Kurangi jumlah"
                        >
                          −
                        </button>
                        <span className="w-9 text-center font-mono text-xs font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                          disabled={isBusy}
                          className="flex size-8 items-center justify-center font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-30 cursor-pointer"
                          aria-label="Tambah jumlah"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        disabled={isBusy}
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-danger disabled:opacity-40 cursor-pointer"
                      >
                        {isBusy ? "MENGHAPUS..." : "HAPUS"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: Sticky Order Summary Box */}
        <div className="lg:col-span-4 lg:sticky lg:top-28">
          <div className="rounded-xs border-2 border-foreground bg-card p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-danger">
              RINGKASAN
            </p>
            <h2 className="mt-1 font-display text-xl font-black uppercase tracking-tight text-foreground">
              DETAIL PESANAN
            </h2>

            <dl className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between font-medium text-muted-foreground">
                <dt>Subtotal ({cart?.items_count ?? 0} barang)</dt>
                <dd className="font-mono font-bold tabular-nums text-foreground">
                  {formatCurrency(subtotal)}
                </dd>
              </div>

              <div className="flex justify-between font-medium text-muted-foreground">
                <dt>Biaya Pengiriman</dt>
                <dd className="font-bold text-foreground">
                  {freeShippingDiff <= 0 ? (
                    <span className="text-green-600 dark:text-green-400 uppercase">
                      GRATIS
                    </span>
                  ) : (
                    "Dihitung di checkout"
                  )}
                </dd>
              </div>

              <div className="border-t-2 border-foreground pt-4">
                <div className="flex items-baseline justify-between text-foreground">
                  <dt className="text-xs font-black uppercase tracking-wider">
                    TOTAL ESTIMASI
                  </dt>
                  <dd className="font-display text-2xl font-black tabular-nums text-foreground">
                    {formatCurrency(subtotal)}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6">
              <Link
                href="/checkout"
                className={buttonClasses("primary", "lg", true)}
              >
                PROSES CHECKOUT SEKARANG →
              </Link>
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-1.5 font-bold text-foreground">
                <span>🛡️</span>
                <span>GARANSI 100% PRODUK ORIGINAL</span>
              </p>
              <p className="flex items-center gap-1.5 font-bold text-foreground">
                <span>🔒</span>
                <span>PEMBAYARAN TERENKRIPSI &amp; AMAN</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
