"use client";

import { useState, type FormEvent } from "react";

import { StarRatingInput } from "@/components/shared/StarRating";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { submitOrderFeedback } from "@/lib/api/feedback";
import type {
  OrderFeedbackItem,
  OrderFeedbackStatus,
  SizeFit,
} from "@/lib/types/feedback";

interface DraftReview {
  rating: number;
  comment: string;
  materialRating: number;
  sizeFit: SizeFit | "";
}

const EMPTY_DRAFT: DraftReview = {
  rating: 0,
  comment: "",
  materialRating: 0,
  sizeFit: "",
};

const SIZE_FIT_OPTIONS: { value: SizeFit; label: string }[] = [
  { value: "too_small", label: "Kekecilan" },
  { value: "fit", label: "Pas / Sesuai" },
  { value: "too_large", label: "Kebesaran" },
];

function emptyDrafts(items: OrderFeedbackItem[]): Record<string, DraftReview> {
  const drafts: Record<string, DraftReview> = {};

  for (const item of items) {
    drafts[item.order_item_id] = { ...EMPTY_DRAFT };
  }

  return drafts;
}

/**
 * Isi dialog dipisah dari `Modal` supaya seluruh state isian hidup selama
 * dialog terbuka saja: `Modal` mengembalikan `null` saat tertutup, sehingga
 * komponen ini ter-unmount dan isian otomatis kosong lagi pada pembukaan
 * berikutnya — tanpa perlu `setState` di dalam effect.
 */
function ReviewFormBody({
  orderNumber,
  status,
  onClose,
  onSubmitted,
}: {
  orderNumber: string;
  status: OrderFeedbackStatus | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const pendingItems: OrderFeedbackItem[] =
    status?.items.filter((item) => item.review === null) ?? [];

  const [drafts, setDrafts] = useState<Record<string, DraftReview>>(() =>
    emptyDrafts(pendingItems),
  );
  const [shippingRating, setShippingRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [serviceComment, setServiceComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Payload hanya memuat barang yang sudah diberi rating, sehingga key error
  // `reviews.{n}.rating` dari server harus dihitung dari daftar yang sama —
  // bukan dari urutan seluruh barang di pesanan.
  const ratedIndexById = new Map<string, number>(
    pendingItems
      .filter((item) => (drafts[item.order_item_id]?.rating ?? 0) > 0)
      .map((item, index): [string, number] => [item.order_item_id, index]),
  );

  function updateDraft(orderItemId: string, patch: Partial<DraftReview>) {
    setDrafts((current) => ({
      ...current,
      [orderItemId]: { ...(current[orderItemId] ?? EMPTY_DRAFT), ...patch },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const reviews = pendingItems
      .filter((item) => (drafts[item.order_item_id]?.rating ?? 0) > 0)
      .map((item) => {
        const draft = drafts[item.order_item_id] ?? EMPTY_DRAFT;

        return {
          order_item_id: item.order_item_id,
          rating: draft.rating,
          comment: draft.comment.trim() ? draft.comment.trim() : null,
          material_rating:
            draft.materialRating > 0 ? draft.materialRating : null,
          size_fit: draft.sizeFit === "" ? null : draft.sizeFit,
        };
      });

    if (reviews.length === 0) {
      setError("Beri rating minimal satu produk sebelum mengirim ulasan.");
      return;
    }

    const hasServiceFeedback =
      shippingRating > 0 || serviceRating > 0 || serviceComment.trim() !== "";

    setSubmitting(true);

    try {
      await submitOrderFeedback(orderNumber, {
        reviews,
        order_feedback: hasServiceFeedback
          ? {
              shipping_rating: shippingRating > 0 ? shippingRating : null,
              service_rating: serviceRating > 0 ? serviceRating : null,
              comment: serviceComment.trim() ? serviceComment.trim() : null,
            }
          : null,
      });

      onSubmitted();
      onClose();
    } catch (err) {
      const errors = getApiFieldErrors(err);

      // Hanya sebagian key validasi yang punya tempat tampil di form ini:
      // `reviews`, `status`, dan `reviews.{n}.rating` (inline per barang).
      // Bila server mengembalikan key lain, pesan umum dipakai agar tidak hilang.
      const hasUnrenderedError = Object.keys(errors).some(
        (key) =>
          key !== "reviews" &&
          key !== "status" &&
          !/^reviews\.\d+\.rating$/.test(key),
      );

      setFieldErrors(errors);
      setError(
        hasUnrenderedError || Object.keys(errors).length === 0
          ? getApiErrorMessage(err)
          : null,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {fieldErrors.reviews ? (
        <Alert tone="error">{fieldErrors.reviews}</Alert>
      ) : null}
      {fieldErrors.status ? (
        <Alert tone="error">{fieldErrors.status}</Alert>
      ) : null}

      <section className="space-y-6">
        <h3 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
          ULASAN PRODUK
        </h3>

        {pendingItems.length === 0 ? (
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            SEMUA PRODUK PADA PESANAN INI SUDAH DIULAS.
          </p>
        ) : (
          pendingItems.map((item) => {
            const draft = drafts[item.order_item_id] ?? EMPTY_DRAFT;
            const ratedIndex = ratedIndexById.get(item.order_item_id);
            const ratingError =
              ratedIndex === undefined
                ? undefined
                : fieldErrors[`reviews.${ratedIndex}.rating`];

            return (
              <div
                key={item.order_item_id}
                className="space-y-4 border-t-2 border-border pt-5 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="font-display text-sm font-black uppercase tracking-tight text-foreground">
                    {item.product_name}
                  </p>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {[item.variant_size, item.variant_color]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div>
                  <FieldLabel required>RATING PRODUK</FieldLabel>
                  <div className="mt-1.5">
                    <StarRatingInput
                      value={draft.rating}
                      onChange={(rating) =>
                        updateDraft(item.order_item_id, { rating })
                      }
                      label={`Rating untuk ${item.product_name}`}
                    />
                  </div>
                  {ratingError ? (
                    <p className="mt-1.5 text-xs font-bold text-danger">{ratingError}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>KUALITAS BAHAN</FieldLabel>
                    <div className="mt-1.5">
                      <StarRatingInput
                        value={draft.materialRating}
                        onChange={(materialRating) =>
                          updateDraft(item.order_item_id, { materialRating })
                        }
                        label={`Kualitas bahan ${item.product_name}`}
                        size="md"
                      />
                    </div>
                  </div>

                  <Select
                    label="KECOCOKAN UKURAN"
                    value={draft.sizeFit}
                    onChange={(e) =>
                      updateDraft(item.order_item_id, {
                        sizeFit: e.target.value as SizeFit | "",
                      })
                    }
                  >
                    <option value="">Tidak diisi</option>
                    {SIZE_FIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <Textarea
                  label="ULASAN PRODUK (OPSIONAL)"
                  value={draft.comment}
                  maxLength={1000}
                  onChange={(e) =>
                    updateDraft(item.order_item_id, {
                      comment: e.target.value,
                    })
                  }
                  placeholder="Ceritakan bahan, jahitan, atau kecocokan ukurannya…"
                />
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-4 border-t-2 border-border pt-6">
        <h3 className="font-display text-xs font-black uppercase tracking-wider text-foreground">
          LAYANAN &amp; PENGIRIMAN
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>KECEPATAN PENGIRIMAN</FieldLabel>
            <div className="mt-1.5">
              <StarRatingInput
                value={shippingRating}
                onChange={setShippingRating}
                label="Rating kecepatan pengiriman"
                size="md"
              />
            </div>
          </div>

          <div>
            <FieldLabel>LAYANAN PELANGGAN</FieldLabel>
            <div className="mt-1.5">
              <StarRatingInput
                value={serviceRating}
                onChange={setServiceRating}
                label="Rating layanan pelanggan"
                size="md"
              />
            </div>
          </div>
        </div>

        <Textarea
          label="KOMENTAR LAYANAN (OPSIONAL)"
          value={serviceComment}
          maxLength={1000}
          onChange={(e) => setServiceComment(e.target.value)}
          placeholder="mis. packing rapi dan kurir cepat sampai"
        />
      </section>

      <div className="flex justify-end gap-3 border-t-2 border-border pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={submitting}
          className="rounded-xs font-bold uppercase tracking-wider"
        >
          BATAL
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={submitting}
          className="rounded-xs font-black uppercase tracking-wider"
        >
          KIRIM ULASAN
        </Button>
      </div>
    </form>
  );
}

/**
 * Satu dialog untuk seluruh ulasan pesanan: tiap barang yang belum diulas
 * mendapat blok sendiri, lalu satu blok tambahan untuk layanan toko.
 */
export function ReviewFormModal({
  open,
  onClose,
  orderNumber,
  status,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  orderNumber: string;
  status: OrderFeedbackStatus | null;
  onSubmitted: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Beri Ulasan"
      description="Ulasan Anda membantu pembeli lain memilih ukuran dan bahan yang tepat."
      size="lg"
    >
      <ReviewFormBody
        orderNumber={orderNumber}
        status={status}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    </Modal>
  );
}
