"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import {
  createAdminPromotion,
  updateAdminPromotion,
} from "@/lib/api/promotions";
import type {
  DiscountBearer,
  Promotion,
  PromotionAppliesTo,
  PromotionPayload,
  PromotionType,
} from "@/lib/types/promotion";

export function PromotionForm({ initial }: { initial?: Promotion }) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [type, setType] = useState<PromotionType>(initial?.type ?? "percentage");
  const [value, setValue] = useState(initial?.value !== undefined ? String(initial.value) : "10");
  const [minPurchase, setMinPurchase] = useState(
    initial?.min_purchase !== null && initial?.min_purchase !== undefined
      ? String(initial.min_purchase)
      : "",
  );
  const [maxDiscount, setMaxDiscount] = useState(
    initial?.max_discount !== null && initial?.max_discount !== undefined
      ? String(initial.max_discount)
      : "",
  );
  const [appliesTo, setAppliesTo] = useState<PromotionAppliesTo>(
    initial?.applies_to ?? "all",
  );
  const [discountBearer, setDiscountBearer] = useState<DiscountBearer>(
    initial?.discount_bearer ?? "platform",
  );
  const [usageLimit, setUsageLimit] = useState(
    initial?.usage_limit !== null && initial?.usage_limit !== undefined
      ? String(initial.usage_limit)
      : "",
  );
  const [perUserLimit, setPerUserLimit] = useState(
    initial?.per_user_limit !== undefined ? String(initial.per_user_limit) : "1",
  );
  const [startsAt, setStartsAt] = useState(
    initial?.starts_at ? initial.starts_at.slice(0, 10) : "",
  );
  const [endsAt, setEndsAt] = useState(
    initial?.ends_at ? initial.ends_at.slice(0, 10) : "",
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [description, setDescription] = useState(initial?.description ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: PromotionPayload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      min_purchase: minPurchase ? Number(minPurchase) : null,
      max_discount: maxDiscount ? Number(maxDiscount) : null,
      applies_to: appliesTo,
      discount_bearer: discountBearer,
      usage_limit: usageLimit ? Number(usageLimit) : null,
      per_user_limit: perUserLimit ? Number(perUserLimit) : 1,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      is_active: isActive,
      description: description.trim() || null,
    };

    try {
      if (initial) {
        await updateAdminPromotion(initial.id, payload);
      } else {
        await createAdminPromotion(payload);
      }
      router.push("/admin/promotions");
      router.refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Gagal menyimpan kupon promosi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-foreground">
            Nama Promosi <span className="text-danger">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Diskon Gajian 15%"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Kode Kupon <span className="text-danger">*</span>
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Contoh: PAYDAY15"
            className="font-mono uppercase font-bold"
            required
          />
          <p className="text-xs text-muted-foreground">
            Hanya huruf, angka, dan strip (-). Otomatis huruf kapital.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Tipe Diskon <span className="text-danger">*</span>
          </label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as PromotionType)}
          >
            <option value="percentage">Persentase (%)</option>
            <option value="fixed_amount">Potongan Tetap (Rp)</option>
            <option value="free_shipping">Gratis Ongkir</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Nilai Diskon <span className="text-danger">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "percentage" ? "15" : "50000"}
            required
          />
          <p className="text-xs text-muted-foreground">
            {type === "percentage"
              ? "Persen potongan (misal: 15 untuk 15%)"
              : type === "fixed_amount"
                ? "Nominal rupiah potongan langsung"
                : "Isi 0 untuk gratis ongkos kirim"}
          </p>
        </div>

        {type === "percentage" ? (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Maksimal Potongan Diskon (Rp)
            </label>
            <Input
              type="number"
              min="0"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              placeholder="Contoh: 50000 (Kosongkan jika tanpa batas)"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Minimal Belanja (Rp)
          </label>
          <Input
            type="number"
            min="0"
            value={minPurchase}
            onChange={(e) => setMinPurchase(e.target.value)}
            placeholder="Contoh: 100000 (Kosongkan jika tanpa syarat)"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Pihak Penanggung Biaya Diskon <span className="text-danger">*</span>
          </label>
          <Select
            value={discountBearer}
            onChange={(e) => setDiscountBearer(e.target.value as DiscountBearer)}
          >
            <option value="platform">Ditanggung Toko (100%)</option>
            <option value="shared">Bagi Dua (50% Toko : 50% Lainnya)</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Cakupan Produk
          </label>
          <Select
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value as PromotionAppliesTo)}
          >
            <option value="all">Semua Produk</option>
            <option value="category">Kategori Tertentu</option>
            <option value="product">Produk Tertentu</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Batas Maksimal Kuota Pemakaian
          </label>
          <Input
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Contoh: 500 (Kosongkan jika tak terbatas)"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Batas Pemakaian per Pengguna
          </label>
          <Input
            type="number"
            min="1"
            value={perUserLimit}
            onChange={(e) => setPerUserLimit(e.target.value)}
            placeholder="1"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Tanggal Mulai
          </label>
          <Input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Tanggal Berakhir
          </label>
          <Input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Keterangan & Catatan Promo
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="Syarat dan ketentuan promo…"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        <label htmlFor="isActive" className="text-xs font-medium text-foreground">
          Aktifkan kupon promosi ini sekarang
        </label>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" loading={submitting}>
          {initial ? "Simpan Perubahan" : "Buat Kupon Promosi"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
