"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { VariantPicker } from "@/components/admin/VariantPicker";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import {
  createStockAdjustment,
  fetchInventoryWarehouses,
} from "@/lib/api/inventory";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function AdjustmentForm() {
  const router = useRouter();

  const [variantId, setVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const warehouses = useAsyncData(
    () => fetchInventoryWarehouses({ is_active: true, per_page: 100 }),
    "adjustment-warehouses",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      await createStockAdjustment({
        variant_id: variantId,
        warehouse_id: warehouseId,
        new_quantity: Number(newQuantity),
        low_stock_threshold: threshold.trim() ? Number(threshold) : null,
        notes: notes.trim(),
      });

      router.push("/admin/inventory/stocks");
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5" noValidate>
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <VariantPicker
        value={variantId}
        onChange={setVariantId}
        error={fieldErrors.variant_id}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Gudang"
          name="warehouse_id"
          required
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          error={fieldErrors.warehouse_id}
          disabled={warehouses.loading}
        >
          <option value="">Pilih gudang…</option>
          {(warehouses.data?.data ?? []).map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name} ({warehouse.code})
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Jumlah Stok Baru"
          name="new_quantity"
          type="number"
          min={0}
          required
          value={newQuantity}
          onChange={(event) => setNewQuantity(event.target.value)}
          error={fieldErrors.new_quantity}
          hint="Jumlah absolut hasil hitung ulang, bukan selisih."
        />
        <Input
          label="Ambang Stok Menipis"
          name="low_stock_threshold"
          type="number"
          min={0}
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          error={fieldErrors.low_stock_threshold}
          hint="Kosongkan untuk mempertahankan nilai saat ini."
        />
      </div>

      <Textarea
        label="Alasan Penyesuaian"
        name="notes"
        required
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        error={fieldErrors.notes}
        hint="Contoh: stock opname, barang rusak, selisih hitung."
      />

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          Simpan Penyesuaian
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/inventory/stocks")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
