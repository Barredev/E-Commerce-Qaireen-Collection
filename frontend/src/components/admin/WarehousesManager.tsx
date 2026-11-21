"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
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
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  deleteWarehouse,
  fetchWarehouses,
  setDefaultWarehouse,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function WarehousesManager() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const warehouses = useAsyncData(
    () => fetchWarehouses({ q: q || undefined, page, per_page: 20 }),
    `${q}-${page}`,
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  async function handleDelete(id: string) {
    setActionError(null);

    try {
      await deleteWarehouse(id);
      warehouses.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  async function handleMakeDefault(id: string) {
    setActionError(null);

    try {
      await setDefaultWarehouse(id);
      warehouses.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gudang"
        description="Kelola lokasi penyimpanan stok. Satu gudang menjadi gudang default."
        action={
          <Link
            href="/admin/warehouses/new"
            className={buttonClasses("primary", "md")}
          >
            Tambah Gudang
          </Link>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="search"
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
          placeholder="Cari nama atau kode gudang…"
          aria-label="Cari gudang"
          className="w-full max-w-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
        />
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      {warehouses.error ? (
        <Alert tone="error">{warehouses.error}</Alert>
      ) : warehouses.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : warehouses.data && warehouses.data.data.length > 0 ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Gudang</TH>
                <TH>Kota</TH>
                <TH>Pool Stok</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {warehouses.data.data.map((warehouse) => (
                <TR key={warehouse.id}>
                  <TD>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{warehouse.name}</span>
                      {warehouse.is_default ? (
                        <Badge tone="info">Default</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {warehouse.code}
                    </p>
                  </TD>
                  <TD className="text-muted-foreground">
                    {warehouse.city ?? "—"}
                  </TD>
                  <TD>{warehouse.stocks_count ?? 0}</TD>
                  <TD>
                    <Badge tone={warehouse.is_active ? "success" : "neutral"}>
                      {warehouse.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      {warehouse.is_default ? null : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMakeDefault(warehouse.id)}
                        >
                          Jadikan default
                        </Button>
                      )}
                      <Link
                        href={`/admin/warehouses/${warehouse.id}/edit`}
                        className={buttonClasses("ghost", "sm")}
                      >
                        Ubah
                      </Link>
                      <ConfirmButton
                        message={`Hapus gudang "${warehouse.name}"?`}
                        onConfirm={() => handleDelete(warehouse.id)}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={warehouses.data.meta.current_page}
            lastPage={warehouses.data.meta.last_page}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada gudang"
          description="Tambahkan gudang pertama sebelum mencatat penerimaan stok."
          action={
            <Link
              href="/admin/warehouses/new"
              className={buttonClasses("primary", "sm")}
            >
              Tambah Gudang
            </Link>
          }
        />
      )}
    </div>
  );
}
