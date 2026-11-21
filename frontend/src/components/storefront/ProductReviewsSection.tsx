"use client";

import { useState } from "react";

import { StarRating } from "@/components/shared/StarRating";
import { Pagination } from "@/components/shared/Pagination";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Spinner } from "@/components/ui/Spinner";
import { fetchProductReviews } from "@/lib/api/feedback";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { ProductReviewSummary, SizeFit } from "@/lib/types/feedback";
import { formatDate } from "@/lib/utils/formatDate";

const PER_PAGE = 5;

const FIT_ORDER: { key: SizeFit; label: string }[] = [
  { key: "too_small", label: "Kekecilan" },
  { key: "fit", label: "Pas" },
  { key: "too_large", label: "Kebesaran" },
];

function percent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function DistributionBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const width = percent(count, total);

  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
        {label}
      </span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-xs bg-muted">
        <span
          className="block h-full rounded-xs bg-warning transition-[width] duration-500"
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function SummaryPanel({ summary }: { summary: ProductReviewSummary }) {
  const total = summary.total_reviews;

  return (
    <div className="grid gap-8 border-y-2 border-foreground py-8 sm:grid-cols-[minmax(0,180px)_1fr] lg:grid-cols-[minmax(0,220px)_1fr_1fr] bg-muted/20 px-4 rounded-xs">
      <div className="flex flex-col items-start gap-2">
        <span className="font-display text-6xl font-black leading-none tabular-nums text-foreground">
          {summary.average_rating !== null
            ? summary.average_rating.toFixed(1)
            : "—"}
        </span>
        <StarRating value={summary.average_rating ?? 0} size="md" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {total > 0 ? `${total} ulasan terverifikasi` : "Belum ada ulasan"}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
          SEBARAN BINTANG
        </p>
        {[5, 4, 3, 2, 1].map((star) => (
          <DistributionBar
            key={star}
            label={`${star} Bintang`}
            count={summary.rating_distribution[String(star)] ?? 0}
            total={total}
          />
        ))}
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
            KECOCOKAN UKURAN
          </p>
          {summary.fit_total > 0 ? (
            <div className="mt-3 space-y-2">
              {FIT_ORDER.map((fit) => (
                <DistributionBar
                  key={fit.key}
                  label={fit.label}
                  count={summary.fit_distribution[fit.key] ?? 0}
                  total={summary.fit_total}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Belum ada penilaian ukuran.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
            KUALITAS BAHAN
          </p>
          {summary.material_average !== null ? (
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={summary.material_average} size="sm" />
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {summary.material_average.toFixed(1)} / 5.0
              </span>
              <span className="text-xs text-muted-foreground">
                ({summary.material_total} penilaian)
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Belum ada penilaian bahan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductReviewsSection({ slug }: { slug: string }) {
  const [page, setPage] = useState(1);

  const reviews = useAsyncData(
    () => fetchProductReviews(slug, page, PER_PAGE),
    `product-reviews-${slug}-${page}`,
  );

  const data = reviews.data;
  const summary = data?.summary;

  return (
    <section className="mt-8">
      <SectionHeading
        eyebrow="BUKTI SOSIAL &amp; ULASAN"
        title="ULASAN PELANGGAN TERVERIFIKASI"
        description="Ulasan nyata dari pembeli yang telah menerima pesanan dari toko kami."
      />

      <div className="mt-8">
        {reviews.loading && !data ? (
          <div className="flex items-center gap-2 py-8 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Spinner /> MEMUAT ULASAN...
          </div>
        ) : reviews.error && !data ? (
          <Alert tone="error">{reviews.error}</Alert>
        ) : !data || !summary ? null : summary.total_reviews === 0 ? (
          <EmptyState
            title="BELUM ADA ULASAN"
            description="Jadilah pembeli pertama yang membagikan pengalaman Anda memakai produk ini."
          />
        ) : (
          <div className="space-y-8">
            <SummaryPanel summary={summary} />

            <div className="divide-y divide-border border-b border-border">
              {data.data.map((review) => (
                <article key={review.id} className="py-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-wider text-foreground">
                          {review.buyer_name ?? "Pembeli Terverifikasi"}
                        </p>
                        <Badge tone="success">✓ VERIFIED BUYER</Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <StarRating value={review.rating} size="sm" />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>

                    {review.variant.size || review.variant.color ? (
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {[review.variant.size, review.variant.color]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  {review.comment ? (
                    <p className="mt-3 max-w-3xl text-xs sm:text-sm leading-relaxed text-foreground">
                      {review.comment}
                    </p>
                  ) : null}

                  {review.material_rating !== null ||
                  review.size_fit_label ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.material_rating !== null ? (
                        <Badge tone="neutral">
                          BAHAN: {review.material_rating}/5
                        </Badge>
                      ) : null}
                      {review.size_fit_label ? (
                        <Badge tone="neutral">UKURAN: {review.size_fit_label.toUpperCase()}</Badge>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <Pagination
              page={data.meta.current_page}
              lastPage={data.meta.last_page}
              onChange={(next) => setPage(next)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
