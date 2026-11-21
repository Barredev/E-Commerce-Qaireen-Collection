"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { VariantPicker } from "@/components/admin/VariantPicker";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input, Select, Textarea } from "@/components/ui/Field";
import {
  createStockReceipt,
  fetchInventoryWarehouses,
} from "@/lib/api/inventory";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type {
  ReceiptSourceType,
  StockCondition,
  StockReceiptItemPayload,
} from "@/lib/types/inventory";

interface ItemRow {
  key: string;
  variantId: string;
  quantity: string;
  unitCost: string;
  condition: StockCondition;
  notes: string;
}

let rowCounter = 0;

function nextKey(): string {
  rowCounter += 1;

  return `item-${rowCounter}`;
}

function emptyItem(): ItemRow {
  return {
    key: nextKey(),
    variantId: "",
    quantity: "1",
    unitCost: "",
    condition: "good",
    notes: "",
  };
}

export function ReceiptForm() {
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [sourceType, setSourceType] = useState<ReceiptSourceType>("production");
  const [receivedAt, setReceivedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>(() => [emptyItem()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const warehouses = useAsyncData(
    () => fetchInventoryWarehouses({ is_active: true, per_page: 100 }),
    "receipt-form-warehouses",
  );

  function updateItem(key: string, updates: Partial<ItemRow>) {
    setItems((previous) =>
      previous.map((row) => (row.key === key ? { ...row, ...updates } : row)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    const payloadItems: StockReceiptItemPayload[] = items
      .filter((row) => row.variantId)
      .map((row) => ({
        variant_id: row.variantId,
        quantity: Number(row.quantity) || 0,
        unit_cost: row.unitCost.trim() ? Number(row.unitCost) : null,
        condition: row.condition,
        notes: row.notes.trim() || null,
      }));

    try {
      const receipt = await createStockReceipt({
        warehouse_id: warehouseId,
        source_type: sourceType,
        received_at: receivedAt ? new Date(receivedAt).toISOString() : null,
        notes: notes.trim() || null,
        items: payloadItems,
      });

      router.push(`/admin/inventory/receipts/${receipt.id}`);
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6" noValidate>
      {formError ? <Alert tone="error">{formError}</Alert> : null}

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

        <Select
          label="Sumber Barang"
          name="source_type"
          required
          value={sourceType}
          onChange={(event) =>
            setSourceType(event.target.value as ReceiptSourceType)
          }
          error={fieldErrors.source_type}
        >
          <option value="production">Hasil Produksi</option>
          <option value="purchase">Pembelian</option>
          <option value="return">Retur</option>
          <option value="transfer_in">Transfer Masuk</option>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Waktu Terima"
          name="received_at"
          type="datetime-local"
          value={receivedAt}
          onChange={(event) => setReceivedAt(event.target.value)}
          error={fieldErrors.received_at}
          hint="Kosongkan untuk memakai waktu konfirmasi."
        />
        <Textarea
          label="Catatan"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          error={fieldErrors.notes}
        />
      </div>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Item</h2>
            <FieldHint>
              Minimal satu item. Varian yang sama tidak boleh dicantumkan dua
              kali dalam satu penerimaan.
            </FieldHint>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((previous) => [...previous, emptyItem()])}
          >
            Tambah Item
          </Button>
        </div>

        {items.map((row, index) => (
          <div
            key={row.key}
            className="space-y-3 border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Item {index + 1}</p>
              {items.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setItems((previous) =>
                      previous.filter((item) => item.key !== row.key),
                    )
                  }
                >
                  Hapus
                </Button>
              ) : null}
            </div>

            <VariantPicker
              id={`variant-${row.key}`}
              value={row.variantId}
              onChange={(variantId) =>
                updateItem(row.key, { variantId })
              }
              error={fieldErrors[`items.${index}.variant_id`]}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Jumlah"
                name={`quantity-${row.key}`}
                type="number"
                min={1}
                required
                value={row.quantity}
                onChange={(event) =>
                  updateItem(row.key, { quantity: event.target.value })
                }
                error={fieldErrors[`items.${index}.quantity`]}
              />
              <Input
                label="Harga Pokok (Rp)"
                name={`unit-cost-${row.key}`}
                type="number"
                min={0}
                value={row.unitCost}
                onChange={(event) =>
                  updateItem(row.key, { unitCost: event.target.value })
                }
                error={fieldErrors[`items.${index}.unit_cost`]}
              />
              <Select
                label="Kondisi"
                name={`condition-${row.key}`}
                value={row.condition}
                onChange={(event) =>
                  updateItem(row.key, {
                    condition: event.target.value as StockCondition,
                  })
                }
                error={fieldErrors[`items.${index}.condition`]}
              >
                <option value="good">Baik</option>
                <option value="damaged">Rusak</option>
              </Select>
            </div>

            <Input
              label="Catatan Item"
              name={`notes-${row.key}`}
              value={row.notes}
              onChange={(event) =>
                updateItem(row.key, { notes: event.target.value })
              }
              error={fieldErrors[`items.${index}.notes`]}
            />
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          Simpan sebagai Draf
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/inventory/receipts")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
