"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import {
  createBrand,
  updateBrand,
  type BrandPayload,
} from "@/lib/api/brands";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import type { Brand } from "@/lib/types/brand";

interface BrandFormState {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  sortOrder: string;
  isActive: boolean;
}

function initialState(brand?: Brand): BrandFormState {
  return {
    name: brand?.name ?? "",
    slug: brand?.slug ?? "",
    description: brand?.description ?? "",
    logoUrl: brand?.logo_url ?? "",
    bannerUrl: brand?.banner_url ?? "",
    sortOrder: brand ? String(brand.sort_order) : "0",
    isActive: brand?.is_active ?? true,
  };
}

export function BrandForm({ brand }: { brand?: Brand }) {
  const router = useRouter();
  const [form, setForm] = useState<BrandFormState>(() => initialState(brand));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof BrandFormState>(
    field: K,
    value: BrandFormState[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    const payload: BrandPayload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      logo_url: form.logoUrl.trim() || null,
      banner_url: form.bannerUrl.trim() || null,
      sort_order: Number(form.sortOrder) || 0,
      is_active: form.isActive,
    };

    try {
      if (brand) {
        await updateBrand(brand.id, payload);
      } else {
        await createBrand(payload);
      }

      router.push("/admin/brands");
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
        label="Nama Toko"
        name="name"
        required
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
        error={fieldErrors.name}
      />

      <Input
        label="Slug"
        name="slug"
        hint="Kosongkan untuk dibuat otomatis dari nama toko."
        value={form.slug}
        onChange={(event) => update("slug", event.target.value)}
        error={fieldErrors.slug}
      />

      <Textarea
        label="Deskripsi"
        name="description"
        value={form.description}
        onChange={(event) => update("description", event.target.value)}
        error={fieldErrors.description}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="URL Logo"
          name="logo_url"
          value={form.logoUrl}
          onChange={(event) => update("logoUrl", event.target.value)}
          error={fieldErrors.logo_url}
        />
        <Input
          label="URL Banner"
          name="banner_url"
          value={form.bannerUrl}
          onChange={(event) => update("bannerUrl", event.target.value)}
          error={fieldErrors.banner_url}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Urutan Tampil"
          name="sort_order"
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={(event) => update("sortOrder", event.target.value)}
          error={fieldErrors.sort_order}
        />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => update("isActive", event.target.checked)}
            className="size-4 rounded border-border"
          />
          Identitas toko aktif
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {brand ? "Simpan Perubahan" : "Simpan Identitas"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/brands")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
