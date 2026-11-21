"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { logout, updateProfile } from "@/lib/api/auth";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import type { User } from "@/lib/types/user";
import { formatDate } from "@/lib/utils/formatDate";

function AccountProfile({ user }: { user: User }) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [form, setForm] = useState(() => ({
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    current_password: "",
    password: "",
    password_confirmation: "",
  }));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        ...(form.password
          ? {
              current_password: form.current_password,
              password: form.password,
              password_confirmation: form.password_confirmation,
            }
          : {}),
      });

      setUser(updated);
      setForm((previous) => ({
        ...previous,
        current_password: "",
        password: "",
        password_confirmation: "",
      }));
      setSuccessMessage("Profil berhasil diperbarui.");
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    clearAuth();

    try {
      await logout();
    } catch {
      // Sesi lokal sudah dibersihkan.
    }

    router.replace("/");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
            MEMBER PROFILE
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            PROFIL &amp; PENGATURAN AKUN
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola data diri, nomor kontak, dan keamanan kata sandi Anda.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          KELUAR DARI AKUN
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xs border-2 border-border bg-card p-4 text-xs font-bold uppercase tracking-wider">
        <Badge tone="neutral">{user.role_label ?? user.role}</Badge>
        <span className="text-muted-foreground">
          MEMBER SEJAK: {formatDate(user.created_at)}
        </span>
        {user.role === "admin" ? (
          <Link
            href="/admin"
            className="ml-auto rounded-xs border border-foreground bg-foreground px-3 py-1.5 text-xs font-black uppercase tracking-wider text-background transition-colors hover:bg-foreground/80"
          >
            DASHBOARD ADMIN →
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-5 rounded-xs border-2 border-border bg-card p-6" noValidate>
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-foreground">
              DATA PRIBADI
            </h2>

            {formError ? <Alert tone="error">{formError}</Alert> : null}
            {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}

            <Input
              label="Nama Lengkap"
              name="name"
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              error={fieldErrors.name}
            />

            <Input
              label="Alamat Email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              error={fieldErrors.email}
            />

            <Input
              label="Nomor Telepon / WhatsApp"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              error={fieldErrors.phone}
            />

            <div className="border-t-2 border-border pt-5">
              <h3 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
                GANTI KATA SANDI
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Kosongkan bila Anda tidak ingin mengganti kata sandi.
              </p>

              <div className="mt-4 space-y-4">
                <Input
                  label="Kata Sandi Saat Ini"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={form.current_password}
                  onChange={(event) =>
                    update("current_password", event.target.value)
                  }
                  error={fieldErrors.current_password}
                />
                <Input
                  label="Kata Sandi Baru"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  error={fieldErrors.password}
                />
                <Input
                  label="Konfirmasi Kata Sandi Baru"
                  name="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={form.password_confirmation}
                  onChange={(event) =>
                    update("password_confirmation", event.target.value)
                  }
                  error={fieldErrors.password_confirmation}
                />
              </div>
            </div>

            <Button type="submit" loading={submitting} className="rounded-xs">
              SIMPAN PERUBAHAN
            </Button>
          </form>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            MENU AKUN
          </p>

          <Link
            href="/account/orders"
            className="flex flex-col justify-between rounded-xs border-2 border-border bg-card p-5 transition-all hover:border-foreground"
          >
            <div>
              <p className="font-display text-base font-black uppercase tracking-tight text-foreground">
                PESANAN SAYA
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pantau status kurir, lacak nomor resi, dan ulas pesanan Anda.
              </p>
            </div>
            <span className="mt-4 text-xs font-black uppercase tracking-wider text-foreground underline">
              BUKA PESANAN →
            </span>
          </Link>

          <Link
            href="/account/addresses"
            className="flex flex-col justify-between rounded-xs border-2 border-border bg-card p-5 transition-all hover:border-foreground"
          >
            <div>
              <p className="font-display text-base font-black uppercase tracking-tight text-foreground">
                BUKU ALAMAT
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kelola alamat pengiriman favorit untuk kemudahan checkout instan.
              </p>
            </div>
            <span className="mt-4 text-xs font-black uppercase tracking-wider text-foreground underline">
              KELOLA ALAMAT →
            </span>
          </Link>

          <Link
            href="/account/returns"
            className="flex flex-col justify-between rounded-xs border-2 border-border bg-card p-5 transition-all hover:border-foreground"
          >
            <div>
              <p className="font-display text-base font-black uppercase tracking-tight text-foreground">
                RETUR &amp; TUKAR UKURAN
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cek riwayat pengajuan retur barang atau pertukaran ukuran pakaian.
              </p>
            </div>
            <span className="mt-4 text-xs font-black uppercase tracking-wider text-foreground underline">
              STATUS RETUR →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AccountView() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Spinner /> MEMUAT AKUN...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <EmptyState
          title="ANDA BELUM MASUK"
          description="Silakan masuk ke akun Anda terlebih dahulu untuk mengelola profil dan pesanan."
          action={
            <Link
              href="/auth/login?redirect=/account"
              className={buttonClasses("primary", "md")}
            >
              MASUK KE AKUN
            </Link>
          }
        />
      </div>
    );
  }

  return <AccountProfile user={user} />;
}
