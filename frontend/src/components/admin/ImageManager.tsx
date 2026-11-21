"use client";

import { useRef, useState, type FormEvent } from "react";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ProductThumbnail } from "@/components/storefront/ProductThumbnail";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input } from "@/components/ui/Field";
import {
  createProductImage,
  deleteProductImage,
  reorderProductImages,
} from "@/lib/api/products";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import type { ProductImage } from "@/lib/types/product";

export function ImageManager({
  productId,
  images,
  onChanged,
}: {
  productId: string;
  images: ProductImage[];
  onChanged: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const file = fileInput.current?.files?.[0];

    try {
      if (file) {
        const data = new FormData();
        data.append("file", file);

        if (altText.trim()) {
          data.append("alt_text", altText.trim());
        }

        if (isPrimary) {
          data.append("is_primary", "1");
        }

        await createProductImage(productId, data);
      } else {
        await createProductImage(productId, {
          image_url: imageUrl.trim(),
          alt_text: altText.trim() || null,
          is_primary: isPrimary,
        });
      }

      setImageUrl("");
      setAltText("");
      setIsPrimary(false);

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      onChanged();
    } catch (submitError) {
      setFieldErrors(getApiFieldErrors(submitError));
      setError(getApiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(image: ProductImage) {
    setError(null);

    try {
      await deleteProductImage(productId, image.id);
      onChanged();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= images.length) {
      return;
    }

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];

    setError(null);

    try {
      await reorderProductImages(
        productId,
        next.map((image, position) => ({
          id: image.id,
          sort_order: position,
        })),
      );
      onChanged();
    } catch (moveError) {
      setError(getApiErrorMessage(moveError));
    }
  }

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div>
        <h2 className="text-base font-semibold">Gambar</h2>
        <FieldHint>
          Unggah berkas gambar (maks. 5 MB). Gambar pertama otomatis menjadi
          gambar utama.
        </FieldHint>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="overflow-hidden border border-border bg-card"
            >
              <div className="relative aspect-square">
                <ProductThumbnail
                  src={image.image_url}
                  alt={image.alt_text ?? "Gambar produk"}
                  className="size-full"
                />
                {image.is_primary ? (
                  <span className="absolute left-2 top-2">
                    <Badge tone="info">Utama</Badge>
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-1 border-t border-border p-2">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    aria-label="Pindah ke kiri"
                  >
                    ←
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label="Pindah ke kanan"
                  >
                    →
                  </Button>
                </div>
                <ConfirmButton
                  message="Hapus gambar ini?"
                  onConfirm={() => handleDelete(image)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Alert tone="info">Produk ini belum memiliki gambar.</Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-2"
        noValidate
      >
        <p className="text-sm font-medium sm:col-span-2">Tambah Gambar</p>

        <div className="sm:col-span-2">
          <label
            htmlFor="image-file"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Berkas Gambar
          </label>
          <input
            ref={fileInput}
            id="image-file"
            name="file"
            type="file"
            accept="image/*"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </div>

        <Input
          label="Teks Alternatif"
          name="alt_text"
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          error={fieldErrors.alt_text}
        />

        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Atau tempel URL gambar
          </summary>
          <div className="mt-2">
            <Input
              name="image_url"
              placeholder="https://…"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              error={fieldErrors.image_url}
              hint="Diabaikan bila berkas gambar dipilih."
            />
          </div>
        </details>

        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(event) => setIsPrimary(event.target.checked)}
            className="size-4 rounded border-border"
          />
          Jadikan gambar utama
        </label>

        <div className="sm:col-span-2">
          <Button type="submit" size="sm" loading={submitting}>
            Tambah Gambar
          </Button>
        </div>
      </form>
    </section>
  );
}
