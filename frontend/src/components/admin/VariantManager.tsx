"use client";

import { useState, type FormEvent } from "react";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
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
import { Button } from "@/components/ui/Button";
import { FieldHint, Input } from "@/components/ui/Field";
import {
  createVariant,
  deleteVariant,
  updateVariant,
} from "@/lib/api/products";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import type { ProductVariant } from "@/lib/types/product";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export function VariantManager({
  productId,
  variants,
  onChanged,
}: {
  productId: string;
  variants: ProductVariant[];
  onChanged: () => void;
}) {
  const [form, setForm] = useState({
    sku: "",
    size: "",
    color: "",
    colorHex: "",
    price: "",
    weightGrams: "300",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await createVariant(productId, {
        sku: form.sku.trim(),
        size: form.size.trim(),
        color: form.color.trim(),
        color_hex: form.colorHex.trim() || null,
        price: Number(form.price) || 0,
        weight_grams: Number(form.weightGrams) || 0,
        is_active: true,
      });

      setForm({
        sku: "",
        size: "",
        color: "",
        colorHex: "",
        price: "",
        weightGrams: "300",
      });
      onChanged();
    } catch (submitError) {
      setFieldErrors(getApiFieldErrors(submitError));
      setError(getApiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(variant: ProductVariant) {
    setError(null);

    try {
      await updateVariant(productId, variant.id, {
        is_active: !variant.is_active,
      });
      onChanged();
    } catch (toggleError) {
      setError(getApiErrorMessage(toggleError));
    }
  }

  async function handleDelete(variant: ProductVariant) {
    setError(null);

    try {
      await deleteVariant(productId, variant.id);
      onChanged();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  }

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div>
        <h2 className="text-base font-semibold">Varian</h2>
        <FieldHint>
          Varian yang sudah pernah dipesan sebaiknya dinonaktifkan, bukan
          dihapus.
        </FieldHint>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {variants.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>SKU</TH>
              <TH>Ukuran</TH>
              <TH>Warna</TH>
              <TH>Harga</TH>
              <TH>Status</TH>
              <TH className="text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {variants.map((variant) => (
              <TR key={variant.id}>
                <TD className="font-mono text-xs">{variant.sku}</TD>
                <TD>{variant.size}</TD>
                <TD>
                  <span className="inline-flex items-center gap-2">
                    {variant.color_hex ? (
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full border border-border"
                        style={{ backgroundColor: variant.color_hex }}
                      />
                    ) : null}
                    {variant.color}
                  </span>
                </TD>
                <TD>{formatCurrency(variant.price)}</TD>
                <TD>
                  <Badge tone={variant.is_active ? "success" : "neutral"}>
                    {variant.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(variant)}
                    >
                      {variant.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <ConfirmButton
                      message={`Hapus varian ${variant.sku}?`}
                      onConfirm={() => handleDelete(variant)}
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <Alert tone="info">Produk ini belum memiliki varian.</Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-3"
        noValidate
      >
        <p className="text-sm font-medium sm:col-span-3">Tambah Varian</p>

        <Input
          label="SKU"
          name="variant_sku"
          required
          value={form.sku}
          onChange={(event) => update("sku", event.target.value)}
          error={fieldErrors.sku}
        />
        <Input
          label="Ukuran"
          name="variant_size"
          required
          value={form.size}
          onChange={(event) => update("size", event.target.value)}
          error={fieldErrors.size}
        />
        <Input
          label="Warna"
          name="variant_color"
          required
          value={form.color}
          onChange={(event) => update("color", event.target.value)}
          error={fieldErrors.color}
        />
        <Input
          label="Kode Warna (hex)"
          name="variant_color_hex"
          placeholder="#111111"
          value={form.colorHex}
          onChange={(event) => update("colorHex", event.target.value)}
          error={fieldErrors.color_hex}
        />
        <Input
          label="Harga (Rp)"
          name="variant_price"
          type="number"
          min={0}
          required
          value={form.price}
          onChange={(event) => update("price", event.target.value)}
          error={fieldErrors.price}
        />
        <Input
          label="Berat (gram)"
          name="variant_weight"
          type="number"
          min={0}
          value={form.weightGrams}
          onChange={(event) => update("weightGrams", event.target.value)}
          error={fieldErrors.weight_grams}
        />

        <div className="sm:col-span-3">
          <Button type="submit" size="sm" loading={submitting}>
            Tambah Varian
          </Button>
        </div>
      </form>
    </section>
  );
}
