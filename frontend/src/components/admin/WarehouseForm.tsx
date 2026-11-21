"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { createWarehouse, updateWarehouse } from "@/lib/api/inventory";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import type { Warehouse, WarehousePayload } from "@/lib/types/inventory";

interface WarehouseFormState {
  name: string;
  code: string;
  city: string;
  address: string;
  isActive: boolean;
  isDefault: boolean;
}

function initialState(warehouse?: Warehouse): WarehouseFormState {
  return {
    name: warehouse?.name ?? "",
    code: warehouse?.code ?? "",
    city: warehouse?.city ?? "",
    address: warehouse?.address ?? "",
    isActive: warehouse?.is_active ?? true,
    isDefault: warehouse?.is_default ?? false,
  };
}

export function WarehouseForm({ warehouse }: { warehouse?: Warehouse }) {
  const router = useRouter();
  const [form, setForm] = useState<WarehouseFormState>(() =>
    initialState(warehouse),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof WarehouseFormState>(
    field: K,
    value: WarehouseFormState[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    const payload: WarehousePayload = {
      name: form.name.trim(),
      code: form.code.trim(),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      is_active: form.isActive,
      is_default: form.isDefault,
    };

    try {
      if (warehouse) {
        await updateWarehouse(warehouse.id, payload);
      } else {
        await createWarehouse(payload);
      }

      router.push("/admin/warehouses");
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

      <Input
        label="Nama Gudang"
        name="name"
        required
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
        error={fieldErrors.name}
      />

      <Input
        label="Kode Gudang"
        name="code"
        required
        hint="Kode unik singkat, mis. WH-UTAMA."
        value={form.code}
        onChange={(event) => update("code", event.target.value)}
        error={fieldErrors.code}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Kota"
          name="city"
          value={form.city}
          onChange={(event) => update("city", event.target.value)}
          error={fieldErrors.city}
        />
        <Input
          label="Alamat"
          name="address"
          value={form.address}
          onChange={(event) => update("address", event.target.value)}
          error={fieldErrors.address}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => update("isActive", event.target.checked)}
            className="size-4 rounded border-border"
          />
          Gudang aktif
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(event) => update("isDefault", event.target.checked)}
            className="size-4 rounded border-border"
          />
          Jadikan gudang default
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {warehouse ? "Simpan Perubahan" : "Simpan Gudang"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/warehouses")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
