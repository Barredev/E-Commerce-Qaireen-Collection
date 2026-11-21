"use client";

import Link from "next/link";
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
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAdminReturns } from "@/lib/api/returns";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  RETURN_STATUS_OPTIONS,
  returnStatusTone,
} from "@/lib/utils/returnStatus";

export function ReturnsTable() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const returns = useAsyncData(
    () =>
      fetchAdminReturns({
        q: q || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        per_page: 20,
      }),
    `returns-${q}-${status}-${from}-${to}-${page}`,
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
    setFrom("");
    setTo("");
    setPage(1);
  }

  const data = returns.data?.data ?? [];
  const meta = returns.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retur & Pengembalian Dana"
        description="Verifikasi barang retur dari pelanggan, setujui komplain, dan catat pengembalian dana."
      />

      {returns.error ? <Alert tone="error">{returns.error}</Alert> : null}

      <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
        <form
          onSubmit={handleSearch}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="text-xs font-medium text-foreground">
              Cari Retur
            </label>
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="No. retur atau no. pesanan…"
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Status Retur
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
              {RETURN_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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

          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
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

      {returns.loading ? (
        <p className="text-sm text-muted-foreground">Memuat data retur…</p>
      ) : data.length === 0 ? (
        <EmptyState
          title="Tidak ada retur yang sesuai"
          description="Ubah filter pencarian Anda atau tunggu pengajuan retur baru dari pelanggan."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>No. Retur</TH>
                <TH>No. Pesanan</TH>
                <TH>Pelanggan</TH>
                <TH>Tanggal</TH>
                <TH>Alasan</TH>
                <TH align="right">Nominal Refund</TH>
                <TH>Status</TH>
                <TH align="right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((ret) => (
                <TR key={ret.id}>
                  <TD>
                    <Link
                      href={`/admin/returns/${ret.id}`}
                      className="font-mono text-xs text-foreground underline-offset-4 hover:underline"
                    >
                      {ret.return_number}
                    </Link>
                  </TD>
                  <TD>
                    <span className="font-mono text-xs">
                      {ret.order_number ?? "-"}
                    </span>
                  </TD>
                  <TD>
                    <p className="font-medium text-foreground">
                      {ret.customer?.name ?? "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ret.customer?.email ?? ""}
                    </p>
                  </TD>
                  <TD>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(ret.requested_at ?? ret.created_at)}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-xs">{ret.reason_category_label}</span>
                  </TD>
                  <TD align="right">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(ret.refund_amount)}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={returnStatusTone(ret.status)}>
                      {ret.status_label}
                    </Badge>
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/admin/returns/${ret.id}`}
                      className="inline-flex h-8 items-center justify-center rounded border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Kelola
                    </Link>
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
    </div>
  );
}
