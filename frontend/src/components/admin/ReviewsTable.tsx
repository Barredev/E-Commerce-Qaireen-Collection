"use client";

import { useState, type FormEvent } from "react";

import { PageHeader } from "@/components/admin/PageHeader";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/admin/Table";
import { Pagination } from "@/components/shared/Pagination";
import { StarRating } from "@/components/shared/StarRating";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  fetchAdminReviews,
  toggleAdminReviewVisibility,
} from "@/lib/api/feedback";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { AdminReviewItem } from "@/lib/types/feedback";
import { formatDate } from "@/lib/utils/formatDate";

export function ReviewsTable() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [target, setTarget] = useState<AdminReviewItem | null>(null);
  const [reason, setReason] = useState("");
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const reviews = useAsyncData(
    () =>
      fetchAdminReviews({
        q: q || undefined,
        status:
          status === "hidden" || status === "visible" ? status : undefined,
        rating: rating ? Number(rating) : undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        per_page: 20,
      }),
    `admin-reviews-${q}-${status}-${rating}-${from}-${to}-${page}`,
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  function resetFilters() {
    setQInput("");
    setQ("");
    setStatus("");
    setRating("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function openToggleModal(review: AdminReviewItem) {
    setTarget(review);
    setReason("");
    setToggleError(null);
  }

  async function handleToggleVisibility() {
    if (!target) {
      return;
    }

    setToggling(true);
    setToggleError(null);

    try {
      await toggleAdminReviewVisibility(
        target.id,
        target.is_hidden ? undefined : reason.trim() || undefined,
      );
      setTarget(null);
      reviews.reload();
    } catch (err) {
      setToggleError(getApiErrorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  const data = reviews.data?.data ?? [];
  const meta = reviews.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ulasan Produk"
        description="Pantau ulasan pembeli terverifikasi dan sembunyikan ulasan yang melanggar aturan."
      />

      {reviews.error ? <Alert tone="error">{reviews.error}</Alert> : null}

      <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
        <form
          onSubmit={handleSearch}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="text-xs font-medium text-foreground">
              Cari Ulasan
            </label>
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Komentar, produk, pelanggan…"
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Status Moderasi
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="visible">Tampil</option>
              <option value="hidden">Disembunyikan</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Rating
            </label>
            <select
              value={rating}
              onChange={(e) => {
                setRating(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none"
            >
              <option value="">Semua Rating</option>
              {[5, 4, 3, 2, 1].map((star) => (
                <option key={star} value={star}>
                  {star} Bintang
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" size="sm">
              Terapkan Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
        </form>
      </div>

      {reviews.loading ? (
        <p className="text-sm text-muted-foreground">Memuat ulasan…</p>
      ) : data.length === 0 ? (
        <EmptyState
          title="Tidak ada ulasan yang sesuai"
          description="Ubah filter pencarian Anda atau tunggu ulasan baru dari pembeli terverifikasi."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Produk</TH>
                <TH>Pelanggan</TH>
                <TH>Rating</TH>
                <TH>Ulasan</TH>
                <TH>Tanggal</TH>
                <TH>Status</TH>
                <TH align="right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((review) => (
                <TR key={review.id}>
                  <TD>
                    <p className="font-medium text-foreground">
                      {review.product?.name ?? "-"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      {[review.variant.size, review.variant.color]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </p>
                  </TD>
                  <TD>
                    <p className="font-medium text-foreground">
                      {review.customer?.name ?? "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {review.customer?.email ?? ""}
                    </p>
                    {review.order_number ? (
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {review.order_number}
                      </p>
                    ) : null}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <StarRating value={review.rating} size="sm" />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {review.rating}/5
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <p className="max-w-xs truncate text-xs text-foreground">
                      {review.comment ?? "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {review.size_fit_label ?? "Ukuran tidak diisi"}
                      {review.material_rating !== null
                        ? ` · Bahan ${review.material_rating}/5`
                        : ""}
                    </p>
                  </TD>
                  <TD>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={review.is_hidden ? "danger" : "success"}>
                      {review.is_hidden ? "Disembunyikan" : "Tampil"}
                    </Badge>
                    {review.is_hidden && review.hidden_reason ? (
                      <p className="mt-1 max-w-[180px] truncate text-[11px] text-muted-foreground">
                        {review.hidden_reason}
                      </p>
                    ) : null}
                  </TD>
                  <TD align="right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openToggleModal(review)}
                    >
                      {review.is_hidden ? "Tampilkan" : "Sembunyikan"}
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {meta && meta.last_page > 1 ? (
            <div className="pt-2">
              <Pagination
                page={meta.current_page}
                lastPage={meta.last_page}
                onChange={(p) => setPage(p)}
              />
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target?.is_hidden ? "Tampilkan Ulasan" : "Sembunyikan Ulasan"}
        description={
          target?.is_hidden
            ? "Ulasan akan kembali tampil di halaman produk."
            : "Ulasan tidak akan tampil di halaman produk sampai ditampilkan kembali."
        }
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTarget(null)}
              disabled={toggling}
            >
              Batal
            </Button>
            <Button
              tone={target?.is_hidden ? "primary" : "danger"}
              size="sm"
              loading={toggling}
              onClick={() => void handleToggleVisibility()}
            >
              {target?.is_hidden ? "Tampilkan" : "Sembunyikan"}
            </Button>
          </>
        }
      >
        {toggleError ? (
          <div className="mb-4">
            <Alert tone="error">{toggleError}</Alert>
          </div>
        ) : null}

        {target ? (
          <div className="space-y-4">
            <div className="border-l-2 border-border pl-3">
              <div className="flex items-center gap-2">
                <StarRating value={target.rating} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {target.customer?.name ?? "-"}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground">
                {target.comment ?? "Tanpa komentar."}
              </p>
            </div>

            {!target.is_hidden ? (
              <div>
                <FieldLabel htmlFor="review-hidden-reason">
                  Alasan Moderasi (Opsional)
                </FieldLabel>
                <Textarea
                  id="review-hidden-reason"
                  value={reason}
                  maxLength={255}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="mis. mengandung ujaran tidak pantas"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
