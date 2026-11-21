"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import {
  createCategory,
  updateCategory,
  type CategoryPayload,
} from "@/lib/api/categories";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { fetchAdminCategoryTree } from "@/lib/api/categories";
import type { Category } from "@/lib/types/category";

interface CategoryFormState {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
}

function initialState(category?: Category): CategoryFormState {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    parentId: category?.parent_id ?? "",
    description: category?.description ?? "",
    imageUrl: category?.image_url ?? "",
    sortOrder: category ? String(category.sort_order) : "0",
    isActive: category?.is_active ?? true,
  };
}

export function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const [form, setForm] = useState<CategoryFormState>(() =>
    initialState(category),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tree = useAsyncData(
    () => fetchAdminCategoryTree(),
    "category-form-parents",
  );

  // Hanya kategori induk (tanpa parent) yang boleh dipilih sebagai induk,
  // dan kategori yang sedang diubah tidak boleh menjadi induk dirinya sendiri.
  const parentOptions = (tree.data ?? []).filter(
    (parent) => parent.id !== category?.id,
  );

  function update<K extends keyof CategoryFormState>(
    field: K,
    value: CategoryFormState[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    const payload: CategoryPayload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      parent_id: form.parentId || null,
      description: form.description.trim() || null,
      image_url: form.imageUrl.trim() || null,
      sort_order: Number(form.sortOrder) || 0,
      is_active: form.isActive,
    };

    try {
      if (category) {
        await updateCategory(category.id, payload);
      } else {
        await createCategory(payload);
      }

      router.push("/admin/categories");
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
        label="Nama Kategori"
        name="name"
        required
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
        error={fieldErrors.name}
      />

      <Input
        label="Slug"
        name="slug"
        hint="Kosongkan untuk dibuat otomatis dari nama kategori."
        value={form.slug}
        onChange={(event) => update("slug", event.target.value)}
        error={fieldErrors.slug}
      />

      <Select
        label="Kategori Induk"
        name="parent_id"
        hint="Biarkan kosong untuk menjadikan kategori ini kategori induk."
        value={form.parentId}
        onChange={(event) => update("parentId", event.target.value)}
        error={fieldErrors.parent_id}
        disabled={tree.loading}
      >
        <option value="">— Tanpa induk —</option>
        {parentOptions.map((parent) => (
          <option key={parent.id} value={parent.id}>
            {parent.name}
          </option>
        ))}
      </Select>

      <Textarea
        label="Deskripsi"
        name="description"
        value={form.description}
        onChange={(event) => update("description", event.target.value)}
        error={fieldErrors.description}
      />

      <Input
        label="URL Gambar"
        name="image_url"
        value={form.imageUrl}
        onChange={(event) => update("imageUrl", event.target.value)}
        error={fieldErrors.image_url}
      />

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
          Kategori aktif
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {category ? "Simpan Perubahan" : "Simpan Kategori"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/categories")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
