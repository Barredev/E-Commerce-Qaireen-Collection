"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { logout } from "@/lib/api/auth";
import { fetchActivePromotions } from "@/lib/api/promotions";
import { SITE_NAME } from "@/lib/constants";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useAuthStore } from "@/lib/stores/authStore";
import { useCartStore } from "@/lib/stores/cartStore";
import type { Promotion } from "@/lib/types/promotion";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const BASE_ANNOUNCEMENTS = [
  "🚚 GRATIS ONGKIR UNTUK PEMBELIAN DI ATAS RP 250.000",
  "⚡ PENGIRIMAN CEPAT: PESAN SEBELUM JAM 15:00 DIKIRIM HARI INI",
  "⭐ GARANSI 100% PRODUK ORIGINAL & RETUR HINGGA 14 HARI",
];

function formatPromoAnnouncement(promotion: Promotion): string {
  switch (promotion.type) {
    case "percentage":
      return `🔥 ${promotion.name.toUpperCase()}: DISKON ${promotion.value}% | KODE: ${promotion.code}`;
    case "fixed_amount":
      return `🔥 ${promotion.name.toUpperCase()}: POTONGAN ${formatCurrency(promotion.value)} | KODE: ${promotion.code}`;
    case "free_shipping":
      return `🔥 ${promotion.name.toUpperCase()}: GRATIS ONGKIR | KODE: ${promotion.code}`;
    default:
      return `🔥 ${promotion.name.toUpperCase()} | KODE: ${promotion.code}`;
  }
}

function secondsUntilTarget(targetIso: string | null | undefined): number {
  const now = Date.now();
  if (targetIso) {
    const parsed = Date.parse(targetIso);
    if (!Number.isNaN(parsed) && parsed > now) {
      const diff = Math.floor((parsed - now) / 1000);
      if (diff <= 7 * 86400) {
        return diff;
      }
    }
  }

  // Hitung mundur ke akhir hari (23:59:59 waktu lokal) agar konsisten saat reload.
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return Math.max(1, Math.floor((endOfDay.getTime() - now) / 1000));
}

const NAV_LINKS = [
  { href: "/products", label: "SEMUA PRODUK" },
  { href: "/products?sort=newest", label: "TERBARU" },
  { href: "/categories", label: "KATEGORI" },
  { href: "/products?sort=price_asc", label: "DISKON SPESIAL", highlight: true },
  { href: "/bantuan", label: "BANTUAN" },
];

function TopUrgencyBanner() {
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const promotions = useAsyncData(
    () => fetchActivePromotions(3),
    "navbar-promotions",
  );

  const activePromos = promotions.data ?? [];
  const announcements = [
    ...activePromos.map(formatPromoAnnouncement),
    ...BASE_ANNOUNCEMENTS,
  ];
  const primaryEndDate = activePromos.find((item) => item.ends_at)?.ends_at;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => {
    const syncCountdown = () => {
      setSecondsLeft(secondsUntilTarget(primaryEndDate));
    };

    syncCountdown();
    const countdown = setInterval(syncCountdown, 1000);
    return () => clearInterval(countdown);
  }, [primaryEndDate]);

  const remaining = secondsLeft ?? 0;
  const hours = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <aside
      aria-label="Pengumuman promosi"
      className="bg-black text-white border-b border-neutral-800 text-[11px] font-semibold tracking-wider uppercase"
    >
      <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="hidden items-center gap-1.5 md:flex text-rose-400">
          <span className="inline-block size-2 animate-ping rounded-full bg-rose-500" />
          <span className="font-bold">
            {primaryEndDate ? "PROMO BERAKHIR:" : "PENAWARAN HARI INI:"}
          </span>
          <span className="font-mono tabular-nums text-white bg-neutral-900 px-1.5 py-0.5 rounded-xs border border-neutral-700">
            {secondsLeft === null ? "--:--:--" : `${hours}:${minutes}:${seconds}`}
          </span>
        </div>

        <div className="flex-1 text-center truncate px-2 font-medium">
          <span>{announcements[index % announcements.length]}</span>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-neutral-400 text-[10px]">
          <Link href="/bantuan#retur" className="hover:text-white transition-colors">
            RETUR 14 HARI
          </Link>
          <span>|</span>
          <Link href="/bantuan" className="hover:text-white transition-colors">
            PUSAT BANTUAN
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {NAV_LINKS.map((link) => {
        const active =
          pathname === link.href ||
          (link.href.includes("?") && pathname === link.href.split("?")[0]);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-all",
              link.highlight
                ? "text-danger hover:text-danger/80"
                : active
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

function NavLinksFallback() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <div className="h-3 w-16 animate-pulse bg-muted" />
      <div className="h-3 w-14 animate-pulse bg-muted" />
      <div className="h-3 w-20 animate-pulse bg-muted" />
    </div>
  );
}

function SearchForm({
  term,
  onTermChange,
  onSubmit,
}: {
  term: string;
  onTermChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full">
      <input
        type="search"
        value={term}
        onChange={(event) => onTermChange(event.target.value)}
        placeholder="Cari gaun, atasan, hijab, atau ukuran..."
        aria-label="Cari produk"
        className="w-full rounded-xs border border-border bg-muted/50 py-2 pl-3 pr-9 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-background focus:outline-none transition-colors"
      />
      <button
        type="submit"
        aria-label="Kirim pencarian"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    </form>
  );
}

export function Navbar() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const cart = useCartStore((state) => state.cart);
  const loadCart = useCartStore((state) => state.loadCart);
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    if (hydrated && user) {
      void loadCart();
    }
  }, [hydrated, user, loadCart]);

  const itemsCount = cart?.items_count ?? 0;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    setMenuOpen(false);

    router.push(
      trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products",
    );
  }

  async function handleLogout() {
    setMenuOpen(false);
    clearAuth();
    clearCart();

    try {
      await logout();
    } catch {
      // Token mungkin sudah kedaluwarsa; sesi lokal tetap dibersihkan.
    }

    router.push("/");
  }

  const accountHref =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "warehouse"
        ? "/admin/inventory/stocks"
        : "/account";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <TopUrgencyBanner />

      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Buka menu navigasi"
          className="flex size-9 items-center justify-center rounded-xs border border-border text-foreground hover:bg-muted md:hidden cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        {/* Brand wordmark - Fashion Nova style bold sans billboard */}
        <Link
          href="/"
          className="shrink-0 font-display text-xl font-black uppercase tracking-[0.22em] text-foreground sm:text-2xl"
        >
          {SITE_NAME}
        </Link>

        {/* Desktop search bar */}
        <div className="hidden max-w-md flex-1 md:block">
          <SearchForm
            term={term}
            onTermChange={setTerm}
            onSubmit={handleSearch}
          />
        </div>

        {/* Right utility cluster */}
        <div className="flex items-center gap-3">
          {!hydrated ? (
            <div className="h-8 w-20 animate-pulse bg-muted" aria-hidden="true" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href={accountHref}
                className="hidden text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:underline sm:inline-block"
                title={user.email}
              >
                AKUN SAYA ({user.name.split(" ")[0]})
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                KELUAR
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className={buttonClasses("ghost", "sm")}
              >
                MASUK
              </Link>
              <Link
                href="/auth/register"
                className={buttonClasses("primary", "sm")}
              >
                DAFTAR
              </Link>
            </div>
          )}

          {/* Cart Icon with high-contrast red counter badge */}
          <Link
            href="/cart"
            className="relative flex size-10 items-center justify-center rounded-xs border border-border bg-background text-foreground transition-colors hover:bg-muted"
            aria-label={`Keranjang belanja${itemsCount > 0 ? ` (${itemsCount} barang)` : ""}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {itemsCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-danger text-[10px] font-black tabular-nums text-white shadow-xs">
                {itemsCount > 99 ? "99+" : itemsCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* Desktop secondary category navigation bar */}
      <nav
        aria-label="Kategori utama"
        className="hidden border-t border-border bg-background md:block"
      >
        <div className="mx-auto flex h-11 w-full max-w-7xl items-center justify-center gap-4 px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </div>
      </nav>

      {/* Mobile Drawer / Dropdown */}
      {menuOpen ? (
        <div className="border-t border-border bg-background px-4 pb-6 pt-4 md:hidden">
          <SearchForm
            term={term}
            onTermChange={setTerm}
            onSubmit={handleSearch}
          />
          <div className="mt-4 flex flex-col divide-y divide-border">
            <Suspense fallback={<NavLinksFallback />}>
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </Suspense>
            {user?.role === "customer" ? (
              <div className="pt-3 flex flex-col gap-2">
                <Link
                  href="/account/orders"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Pesanan Saya
                </Link>
                <Link
                  href="/account/addresses"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Buku Alamat
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
