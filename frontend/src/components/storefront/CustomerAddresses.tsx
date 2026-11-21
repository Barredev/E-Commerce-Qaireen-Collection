"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { ShippingDestinationPicker } from "@/components/storefront/ShippingDestinationPicker";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from "@/lib/api/addresses";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useAuthStore } from "@/lib/stores/authStore";
import type { Address, ShippingDestination } from "@/lib/types/order";

const EMPTY_FORM = {
  label: "Rumah",
  recipient_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  district: "",
  city: "",
  province: "",
  postal_code: "",
  is_default: false,
};

export function CustomerAddresses() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  const addresses = useAsyncData(
    () => (user ? fetchAddresses() : Promise.resolve<Address[]>([])),
    `addresses-${user?.id ?? "guest"}`,
  );

  // Status form modal.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [destination, setDestination] = useState<ShippingDestination | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner /> Memuat…
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="Masuk ke Akun"
        description="Masuk untuk mengelola buku alamat Anda."
        action={
          <Link
            href="/auth/login?redirect=/account/addresses"
            className={buttonClasses("primary", "sm")}
          >
            Masuk
          </Link>
        }
      />
    );
  }

  const list = addresses.data ?? [];

  function handleOpenCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      recipient_name: user?.name ?? "",
      phone: user?.phone ?? "",
      is_default: list.length === 0,
    });
    setDestination(null);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function handleOpenEdit(addr: Address) {
    setEditingId(addr.id);
    setDestination(
      addr.rajaongkir_destination_id
        ? {
            id: addr.rajaongkir_destination_id,
            name: addr.city,
            province: addr.province,
          }
        : null,
    );
    setForm({
      label: addr.label ?? "",
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 ?? "",
      district: addr.district ?? "",
      city: addr.city,
      province: addr.province,
      postal_code: addr.postal_code,
      is_default: addr.is_default,
    });
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) {
      return;
    }

    setActionError(null);

    try {
      await deleteAddress(id);
      addresses.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  async function handleSetDefault(addr: Address) {
    setActionError(null);

    try {
      await updateAddress(addr.id, { is_default: true });
      addresses.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const payload = {
      label: form.label.trim() || null,
      recipient_name: form.recipient_name.trim(),
      phone: form.phone.trim(),
      address_line_1: form.address_line_1.trim(),
      address_line_2: form.address_line_2.trim() || null,
      district: form.district.trim() || null,
      city: form.city.trim(),
      province: form.province.trim(),
      postal_code: form.postal_code.trim(),
      rajaongkir_destination_id: destination?.id ?? null,
      is_default: form.is_default,
    };

    try {
      if (editingId) {
        await updateAddress(editingId, payload);
      } else {
        await createAddress(payload);
      }
      setFormOpen(false);
      addresses.reload();
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-danger">
            DELIVERY ADDRESSES
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            BUKU ALAMAT
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola alamat pengiriman untuk kemudahan checkout instan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-xs font-black uppercase tracking-wider"
          >
            + TAMBAH ALAMAT
          </Button>
          <Link
            href="/account"
            className="text-xs font-black uppercase tracking-wider text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
          >
            ← PROFIL
          </Link>
        </div>
      </div>

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {addresses.error ? <Alert tone="error">{addresses.error}</Alert> : null}

      {addresses.loading ? (
        <div className="flex items-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Spinner /> MEMUAT ALAMAT...
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="BELUM ADA ALAMAT TERSIMPAN"
          description="Tambahkan alamat pengiriman pertama Anda untuk mempercepat proses checkout."
          action={
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="rounded-xs font-black uppercase tracking-wider"
            >
              TAMBAH ALAMAT SEKARANG
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((addr) => (
            <div
              key={addr.id}
              className="flex flex-col justify-between rounded-xs border-2 border-border bg-card p-5 transition-all hover:border-foreground"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-black uppercase text-foreground">
                      {addr.recipient_name}
                    </span>
                    {addr.label ? (
                      <Badge tone="neutral">{addr.label.toUpperCase()}</Badge>
                    ) : null}
                  </div>
                  {addr.is_default ? (
                    <Badge tone="info">ALAMAT UTAMA</Badge>
                  ) : null}
                </div>

                <p className="mt-3 font-mono text-xs font-bold tabular-nums text-muted-foreground">
                  {addr.phone}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground">
                  {addr.address_line_1}
                  {addr.address_line_2 ? `, ${addr.address_line_2}` : ""}
                  {addr.district ? `, Kec. ${addr.district}` : ""}, {addr.city},{" "}
                  {addr.province} {addr.postal_code}
                </p>
                {!addr.rajaongkir_destination_id ? (
                  <p className="mt-3 text-xs font-bold text-danger">
                    ⚠️ Kota tujuan kurir belum diatur — ongkos kirim tidak dapat
                    dihitung otomatis. Klik Ubah untuk memilih kota.
                  </p>
                ) : null}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs font-black uppercase tracking-wider">
                <div>
                  {!addr.is_default ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr)}
                      className="text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
                    >
                      JADIKAN UTAMA
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(addr)}
                    className="text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
                  >
                    UBAH
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="text-muted-foreground transition-colors hover:text-danger"
                  >
                    HAPUS
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Ubah Alamat" : "Tambah Alamat Baru"}
        description="Alamat ini dipakai untuk menghitung ongkos kirim dan pengiriman pesanan."
      >
        {formError ? (
          <div className="mb-4">
            <Alert tone="error">{formError}</Alert>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Label Alamat (mis. Rumah, Kantor)"
            value={form.label}
            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            error={fieldErrors.label}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nama Penerima"
              required
              value={form.recipient_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, recipient_name: e.target.value }))
              }
              error={fieldErrors.recipient_name}
            />
            <Input
              label="Nomor Telepon"
              type="tel"
              required
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
              error={fieldErrors.phone}
            />
          </div>

          <Input
            label="Alamat Lengkap (Jalan, No. Rumah, RT/RW)"
            required
            value={form.address_line_1}
            onChange={(e) =>
              setForm((p) => ({ ...p, address_line_1: e.target.value }))
            }
            error={fieldErrors.address_line_1}
          />

          <Input
            label="Detail Tambahan (Gedung, Patokan, Lantai)"
            value={form.address_line_2}
            onChange={(e) =>
              setForm((p) => ({ ...p, address_line_2: e.target.value }))
            }
            error={fieldErrors.address_line_2}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Kecamatan (Opsional)"
              value={form.district}
              onChange={(e) =>
                setForm((p) => ({ ...p, district: e.target.value }))
              }
              error={fieldErrors.district}
            />
            <Input
              label="Kota / Kab."
              required
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              error={fieldErrors.city}
            />
            <Input
              label="Provinsi"
              required
              value={form.province}
              onChange={(e) =>
                setForm((p) => ({ ...p, province: e.target.value }))
              }
              error={fieldErrors.province}
            />
          </div>

          <div className="sm:w-1/3">
            <Input
              label="Kode Pos"
              required
              value={form.postal_code}
              onChange={(e) =>
                setForm((p) => ({ ...p, postal_code: e.target.value }))
              }
              error={fieldErrors.postal_code}
            />
          </div>

          <ShippingDestinationPicker
            value={destination}
            onChange={setDestination}
            error={fieldErrors.rajaongkir_destination_id}
            hint="Kota tujuan kurir, dipakai untuk menghitung ongkos kirim otomatis saat checkout."
          />

          <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) =>
                setForm((p) => ({ ...p, is_default: e.target.checked }))
              }
              className="rounded-sm border-border accent-primary"
            />
            Jadikan sebagai alamat utama
          </label>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" loading={submitting}>
              Simpan Alamat
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
