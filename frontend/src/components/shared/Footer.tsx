"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { getApiErrorMessage } from "@/lib/api/client";
import { subscribeNewsletter } from "@/lib/api/promotions";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";

const linkClassName =
  "text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4";

const footerColumnHeading =
  "text-xs font-bold uppercase tracking-[0.16em] text-foreground";

const noopSubscribe = () => () => {};

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const year = useSyncExternalStore(
    noopSubscribe,
    () => new Date().getFullYear(),
    () => 2026,
  );
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setFeedback({ tone: "error", text: "Masukkan alamat email terlebih dahulu." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await subscribeNewsletter(trimmed);
      setFeedback({ tone: "success", text: response.message });
      setEmail("");
    } catch (error) {
      setFeedback({ tone: "error", text: getApiErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="mt-24 border-t-2 border-foreground bg-background">
      {/* VIP Newsletter signup bar */}
      <div className="border-b border-border bg-muted/40 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-danger">
                VIP MEMBERS CLUB
              </p>
              <h3 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                INFO PROMO EKSKLUSIF &amp; RILIS TERBARU
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Daftar newsletter untuk pemberitahuan voucher promo, koleksi terbaru, dan penawaran terbatas.
              </p>
            </div>

            <div className="w-full max-w-md">
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2" noValidate>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Masukkan alamat email Anda..."
                  disabled={submitting}
                  className="w-full rounded-xs border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none disabled:opacity-60"
                  aria-label="Alamat email newsletter"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="shrink-0 rounded-xs bg-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-background transition-colors hover:bg-foreground/80 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "MENGIRIM..." : "GABUNG"}
                </button>
              </form>
              {feedback ? (
                <p
                  role="status"
                  className={
                    feedback.tone === "success"
                      ? "mt-2 text-xs font-medium text-success"
                      : "mt-2 text-xs font-medium text-danger"
                  }
                >
                  {feedback.text}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="sm:col-span-2">
          <Link
            href="/"
            className="font-display text-2xl font-black uppercase tracking-[0.2em] text-foreground"
          >
            {SITE_NAME}
          </Link>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {SITE_DESCRIPTION}
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="border border-border px-2 py-1">🚚 PENGIRIMAN CEPAT</span>
            <span className="border border-border px-2 py-1">🛡️ 100% ORIGINAL</span>
            <span className="border border-border px-2 py-1">🔄 RETUR MUDAH</span>
          </div>
        </div>

        <div>
          <p className={footerColumnHeading}>KATALOG BELANJA</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/products" className={linkClassName}>
                Semua Produk
              </Link>
            </li>
            <li>
              <Link href="/products?sort=newest" className={linkClassName}>
                Koleksi Terbaru (New In)
              </Link>
            </li>
            <li>
              <Link href="/categories" className={linkClassName}>
                Semua Kategori
              </Link>
            </li>
            <li>
              <Link href="/products?sort=price_asc" className="text-xs font-bold text-danger hover:underline">
                Sale &amp; Promo Spesial
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className={footerColumnHeading}>LAYANAN PELANGGAN</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/bantuan" className={linkClassName}>
                Pusat Bantuan
              </Link>
            </li>
            <li>
              <Link href="/bantuan#cara-pesan" className={linkClassName}>
                Cara Berbelanja
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className={linkClassName}>
                Lacak Status Pesanan
              </Link>
            </li>
            <li>
              <Link href="/bantuan#retur" className={linkClassName}>
                Kebijakan Retur &amp; Tukar Ukuran
              </Link>
            </li>
            <li>
              <Link href="/bantuan#kontak" className={linkClassName}>
                Hubungi Kami
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className={footerColumnHeading}>KEBIJAKAN &amp; HUKUM</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/bantuan#pengiriman" className={linkClassName}>
                Tarif &amp; Estimasi Ongkir
              </Link>
            </li>
            <li>
              <Link href="/bantuan#privasi" className={linkClassName}>
                Kebijakan Privasi
              </Link>
            </li>
            <li>
              <Link href="/bantuan#syarat" className={linkClassName}>
                Syarat &amp; Ketentuan
              </Link>
            </li>
            <li>
              <Link href="/admin" className={linkClassName}>
                Portal Staf Admin
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border bg-muted/20 py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p className="font-medium">
            © {year} {SITE_NAME}. All rights reserved. Fast-fashion curated in Indonesia.
          </p>

          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-foreground">
            <span>BCA</span>
            <span>•</span>
            <span>MANDIRI</span>
            <span>•</span>
            <span>BNI</span>
            <span>•</span>
            <span>QRIS</span>
            <span>•</span>
            <span>COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
