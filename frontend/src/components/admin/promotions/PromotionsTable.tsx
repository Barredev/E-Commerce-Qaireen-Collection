"use client";

import Link from "next/link";
import { useState } from "react";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/admin/Table";
import { Pagination } from "@/components/shared/Pagination";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import {
  deleteAdminPromotion,
  fetchAdminPromotions,
  toggleAdminPromotionActive,
} from "@/lib/api/promotions";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { Promotion } from "@/lib/types/promotion";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

export function PromotionsTable() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);

  const promos = useAsyncData(
    () =>
      fetchAdminPromotions({
        q: search,
        type: type || undefined,
        is_active: isActive || undefined,
        page,
      }),
    `admin-promos-${search}-${type}-${isActive}-${page}`,
  );

  async function handleDelete(id: string) {
    await deleteAdminPromotion(id);
    promos.reload();
  }

  async function handleToggle(id: string) {
    await toggleAdminPromotionActive(id);
    promos.reload();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Promosi & Kupon</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola kode voucher diskon belanja, kupon potongan harga, dan aturan penanggung biaya promosi.
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className={buttonClasses({ variant: "primary", size: "md" })}
        >
          + Buat Kupon Baru
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau kode kupon…"
            className="w-64"
          />
          <Button type="submit" variant="secondary" size="md">
            Cari
          </Button>
        </form>

        <div className="w-48">
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Tipe Diskon</option>
            <option value="percentage">Persentase (%)</option>
            <option value="fixed_amount">Potongan Tetap (Rp)</option>
            <option value="free_shipping">Gratis Ongkir</option>
          </Select>
        </div>

        <div className="w-40">
          <Select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </Select>
        </div>
      </div>

      {promos.loading ? (
        <div className="h-64 animate-pulse rounded-md bg-muted/40" />
      ) : promos.error ? (
        <Alert variant="error">{promos.error}</Alert>
      ) : !promos.data?.data.length ? (
        <EmptyState
          title="Belum ada kupon promosi"
          description={
            search || type || isActive
              ? "Tidak ada kupon yang cocok dengan kriteria pencarian."
              : "Buat kupon promosi pertama untuk mendorong konversi penjualan."
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Kode & Nama Kupon</TH>
                <TH>Nilai Diskon</TH>
                <TH>Beban Diskon</TH>
                <TH>Cakupan</TH>
                <TH className="text-right">Terpakai / Limit</TH>
                <TH>Masa Berlaku</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {promos.data.data.map((p: Promotion) => (
                <TR key={p.id}>
                  <TD>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {p.code}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.name}
                    </div>
                  </TD>
                  <TD>
                    <div className="font-semibold text-foreground">
                      {p.type === "percentage"
                        ? `${p.value}%`
                        : p.type === "fixed_amount"
                          ? formatCurrency(p.value)
                          : "Gratis Ongkir"}
                    </div>
                    {p.max_discount ? (
                      <div className="text-xs text-muted-foreground">
                        Maks {formatCurrency(p.max_discount)}
                      </div>
                    ) : null}
                    {p.min_purchase ? (
                      <div className="text-xs text-muted-foreground">
                        Min Belanja {formatCurrency(p.min_purchase)}
                      </div>
                    ) : null}
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        p.discount_bearer === "platform" ? "info" : "neutral"
                      }
                    >
                      {p.discount_bearer_label}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {p.applies_to_label}
                  </TD>
                  <TD className="text-right">
                    <span className="font-semibold text-foreground">
                      {p.usage_count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / {p.usage_limit ?? "∞"}
                    </span>
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {p.starts_at ? (
                      <div>Mulai: {formatDate(p.starts_at)}</div>
                    ) : null}
                    {p.ends_at ? (
                      <div>S/d: {formatDate(p.ends_at)}</div>
                    ) : (
                      <div>Tanpa batas</div>
                    )}
                  </TD>
                  <TD>
                    <button
                      type="button"
                      onClick={() => handleToggle(p.id)}
                      className="cursor-pointer"
                      title="Klik untuk ubah status"
                    >
                      <Badge variant={p.is_active ? "success" : "neutral"}>
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </button>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/promotions/${p.id}/edit`}
                        className={buttonClasses({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Edit
                      </Link>
                      <ConfirmButton
                        onConfirm={() => handleDelete(p.id)}
                        confirmText="Yakin hapus kupon promosi ini?"
                        variant="destructive"
                        size="sm"
                      >
                        Hapus
                      </ConfirmButton>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={promos.data.meta.current_page}
            lastPage={promos.data.meta.last_page}
            onChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}
    </div>
  );
}
