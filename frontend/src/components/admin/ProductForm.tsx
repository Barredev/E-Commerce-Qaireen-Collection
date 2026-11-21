"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input, Select, Textarea } from "@/components/ui/Field";
import { fetchAdminCategories } from "@/lib/api/categories";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import {
  createProduct,
  createProductImage,
  updateProduct,
} from "@/lib/api/products";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ProductDetail, ProductPayload } from "@/lib/types/product";

interface VariantRow {
  key: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  price: string;
  weightGrams: string;
  isActive: boolean;
}

interface ImageRow {
  key: string;
  file: File | null;
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
}

interface ProductFormState {
  categoryId: string;
  name: string;
  slug: string;
  basePrice: string;
  description: string;
  material: string;
  careInstructions: string;
  isActive: boolean;
  isFeatured: boolean;
}

let rowCounter = 0;

function nextKey(prefix: string): string {
  rowCounter += 1;

  return `${prefix}-${rowCounter}`;
}

function emptyVariant(price = ""): VariantRow {
  return {
    key: nextKey("variant"),
    sku: "",
    size: "",
    color: "",
    colorHex: "",
    price,
    weightGrams: "300",
    isActive: true,
  };
}

function emptyImage(): ImageRow {
  return {
    key: nextKey("image"),
    file: null,
    imageUrl: "",
    altText: "",
    isPrimary: false,
  };
}

function initialState(product?: ProductDetail): ProductFormState {
  return {
    categoryId: product?.category?.id ?? "",
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    basePrice: product ? String(product.base_price) : "",
    description: product?.description ?? "",
    material: product?.material ?? "",
    careInstructions: product?.care_instructions ?? "",
    isActive: product?.is_active ?? true,
    isFeatured: product?.is_featured ?? false,
  };
}

export function ProductForm({ product }: { product?: ProductDetail }) {
  const router = useRouter();
  const isCreate = !product;

  const [form, setForm] = useState<ProductFormState>(() => initialState(product));
  const [variants, setVariants] = useState<VariantRow[]>(() => [
    emptyVariant(product ? String(product.base_price) : ""),
  ]);
  const [images, setImages] = useState<ImageRow[]>(() => [emptyImage()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Produk yang sudah tercipta tetapi gambarnya gagal diunggah. Disimpan agar
  // pengguna diarahkan ke halaman ubah produk, bukan membuat produk duplikat.
  const [createdId, setCreatedId] = useState<string | null>(null);

  const categories = useAsyncData(
    () => fetchAdminCategories({ per_page: 100 }),
    "product-form-categories",
  );

  function update<K extends keyof ProductFormState>(
    field: K,
    value: ProductFormState[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function updateVariant(key: string, updates: Partial<VariantRow>) {
    setVariants((previous) =>
      previous.map((row) => (row.key === key ? { ...row, ...updates } : row)),
    );
  }

  function updateImage(key: string, updates: Partial<ImageRow>) {
    setImages((previous) =>
      previous.map((row) => (row.key === key ? { ...row, ...updates } : row)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (createdId) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    const payload: ProductPayload = {
      category_id: form.categoryId || null,
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      material: form.material.trim() || null,
      care_instructions: form.careInstructions.trim() || null,
      base_price: Number(form.basePrice) || 0,
      is_active: form.isActive,
      is_featured: form.isFeatured,
    };

    if (isCreate) {
      payload.variants = variants
        .filter((row) => row.sku.trim() && row.size.trim() && row.color.trim())
        .map((row) => ({
          sku: row.sku.trim(),
          size: row.size.trim(),
          color: row.color.trim(),
          color_hex: row.colorHex.trim() || null,
          price: Number(row.price) || 0,
          weight_grams: Number(row.weightGrams) || 0,
          is_active: row.isActive,
        }));

      // Berkas gambar belum bisa ikut dalam payload JSON, jadi hanya baris
      // berupa URL yang dikirim saat pembuatan. Berkas diunggah menyusul
      // lewat endpoint gambar setelah produk memiliki id.
      payload.images = images
        .filter((row) => !row.file && row.imageUrl.trim())
        .map((row) => ({
          image_url: row.imageUrl.trim(),
          alt_text: row.altText.trim() || null,
          is_primary: row.isPrimary,
        }));
    }

    try {
      if (product) {
        await updateProduct(product.id, payload);
        router.push("/admin/products");
        return;
      }

      const created = await createProduct(payload);
      setCreatedId(created.id);

      for (const row of images.filter((item) => item.file)) {
        const data = new FormData();
        data.append("file", row.file as File);

        if (row.altText.trim()) {
          data.append("alt_text", row.altText.trim());
        }

        if (row.isPrimary) {
          data.append("is_primary", "1");
        }

        await createProductImage(created.id, data);
      }

      router.push(`/admin/products/${created.id}/edit`);
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

      {createdId ? (
        <Alert tone="info">
          Produk sudah dibuat. Beberapa gambar gagal diunggah —{" "}
          <Link
            href={`/admin/products/${createdId}/edit`}
            className="font-medium underline underline-offset-4"
          >
            buka halaman ubah produk
          </Link>{" "}
          untuk menambahkannya.
        </Alert>
      ) : null}

      <Select
        label="Kategori"
        name="category_id"
        value={form.categoryId}
        onChange={(event) => update("categoryId", event.target.value)}
        error={fieldErrors.category_id}
        disabled={categories.loading}
      >
        <option value="">— Tanpa kategori —</option>
        {(categories.data?.data ?? []).map((category) => (
          <option key={category.id} value={category.id}>
            {category.parent_id ? "↳ " : ""}
            {category.name}
          </option>
        ))}
      </Select>

      <Input
        label="Nama Produk"
        name="name"
        required
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
        error={fieldErrors.name}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Slug"
          name="slug"
          hint="Kosongkan untuk dibuat otomatis."
          value={form.slug}
          onChange={(event) => update("slug", event.target.value)}
          error={fieldErrors.slug}
        />
        <Input
          label="Harga Dasar (Rp)"
          name="base_price"
          type="number"
          min={0}
          step="0.01"
          required
          value={form.basePrice}
          onChange={(event) => update("basePrice", event.target.value)}
          error={fieldErrors.base_price}
        />
      </div>

      <Textarea
        label="Deskripsi"
        name="description"
        value={form.description}
        onChange={(event) => update("description", event.target.value)}
        error={fieldErrors.description}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Bahan"
          name="material"
          value={form.material}
          onChange={(event) => update("material", event.target.value)}
          error={fieldErrors.material}
        />
        <Input
          label="Instruksi Perawatan"
          name="care_instructions"
          value={form.careInstructions}
          onChange={(event) => update("careInstructions", event.target.value)}
          error={fieldErrors.care_instructions}
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
          Produk aktif
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(event) => update("isFeatured", event.target.checked)}
            className="size-4 rounded border-border"
          />
          Tampilkan sebagai unggulan
        </label>
      </div>

      {isCreate ? (
        <>
          <section className="space-y-4 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Varian</h2>
                <FieldHint>
                  Minimal satu varian. SKU harus unik untuk setiap varian.
                </FieldHint>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setVariants((previous) => [
                    ...previous,
                    emptyVariant(form.basePrice),
                  ])
                }
              >
                Tambah Varian
              </Button>
            </div>

            <div className="space-y-3">
              {variants.map((row, index) => (
                <div
                  key={row.key}
                  className="border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Varian {index + 1}</p>
                    {variants.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setVariants((previous) =>
                            previous.filter((item) => item.key !== row.key),
                          )
                        }
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      label="SKU"
                      name={`sku-${row.key}`}
                      value={row.sku}
                      onChange={(event) =>
                        updateVariant(row.key, { sku: event.target.value })
                      }
                      error={fieldErrors[`variants.${index}.sku`]}
                    />
                    <Input
                      label="Harga (Rp)"
                      name={`price-${row.key}`}
                      type="number"
                      min={0}
                      value={row.price}
                      onChange={(event) =>
                        updateVariant(row.key, { price: event.target.value })
                      }
                      error={fieldErrors[`variants.${index}.price`]}
                    />
                    <Input
                      label="Ukuran"
                      name={`size-${row.key}`}
                      placeholder="S, M, L, 39…"
                      value={row.size}
                      onChange={(event) =>
                        updateVariant(row.key, { size: event.target.value })
                      }
                      error={fieldErrors[`variants.${index}.size`]}
                    />
                    <Input
                      label="Warna"
                      name={`color-${row.key}`}
                      placeholder="Hitam"
                      value={row.color}
                      onChange={(event) =>
                        updateVariant(row.key, { color: event.target.value })
                      }
                      error={fieldErrors[`variants.${index}.color`]}
                    />
                    <Input
                      label="Kode Warna (hex)"
                      name={`color-hex-${row.key}`}
                      placeholder="#111111"
                      value={row.colorHex}
                      onChange={(event) =>
                        updateVariant(row.key, { colorHex: event.target.value })
                      }
                      error={fieldErrors[`variants.${index}.color_hex`]}
                    />
                    <Input
                      label="Berat (gram)"
                      name={`weight-${row.key}`}
                      type="number"
                      min={0}
                      value={row.weightGrams}
                      onChange={(event) =>
                        updateVariant(row.key, {
                          weightGrams: event.target.value,
                        })
                      }
                      error={fieldErrors[`variants.${index}.weight_grams`]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Gambar</h2>
                <FieldHint>
                  Unggah berkas gambar (maks. 5 MB per berkas). Gambar pertama
                  otomatis menjadi gambar utama.
                </FieldHint>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setImages((previous) => [...previous, emptyImage()])
                }
              >
                Tambah Gambar
              </Button>
            </div>

            <div className="space-y-3">
              {images.map((row, index) => (
                <div
                  key={row.key}
                  className="border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Gambar {index + 1}</p>
                    {images.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setImages((previous) =>
                            previous.filter((item) => item.key !== row.key),
                          )
                        }
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label
                        htmlFor={`image-file-${row.key}`}
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Berkas Gambar
                      </label>
                      <input
                        id={`image-file-${row.key}`}
                        name={`image-file-${row.key}`}
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          updateImage(row.key, {
                            file: event.target.files?.[0] ?? null,
                          })
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                      />
                      {row.file ? (
                        <FieldHint>{row.file.name}</FieldHint>
                      ) : null}
                    </div>

                    <Input
                      label="Teks Alternatif"
                      name={`image-alt-${row.key}`}
                      value={row.altText}
                      onChange={(event) =>
                        updateImage(row.key, { altText: event.target.value })
                      }
                    />

                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Atau tempel URL gambar
                      </summary>
                      <div className="mt-2">
                        <Input
                          name={`image-url-${row.key}`}
                          placeholder="https://…"
                          value={row.imageUrl}
                          disabled={Boolean(row.file)}
                          onChange={(event) =>
                            updateImage(row.key, {
                              imageUrl: event.target.value,
                            })
                          }
                          error={fieldErrors[`images.${index}.image_url`]}
                          hint="Diabaikan bila berkas gambar dipilih."
                        />
                      </div>
                    </details>
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.isPrimary}
                      onChange={(event) =>
                        updateImage(row.key, {
                          isPrimary: event.target.checked,
                        })
                      }
                      className="size-4 rounded border-border"
                    />
                    Jadikan gambar utama
                  </label>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {product ? "Simpan Perubahan" : "Simpan Produk"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
