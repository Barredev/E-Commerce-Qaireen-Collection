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
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Pagination } from "@/components/shared/Pagination";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteBrand, fetchAdminBrands } from "@/lib/api/brands";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";

export function BrandsTable() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const brands = useAsyncData(
    () => fetchAdminBrands({ q: q || undefined, page, per_page: 20 }),
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
      await deleteBrand(id);
      brands.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identitas Toko"
        description="Nama, logo, dan deskripsi toko yang tampil di storefront."
        action={
          <Link
            href="/admin/brands/new"
            className={buttonClasses("primary", "md")}
          >
            Tambah Identitas
          </Link>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="search"
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
          placeholder="Cari nama toko…"
          aria-label="Cari identitas toko"
          className="w-full max-w-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
        />
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      {brands.error ? (
        <Alert tone="error">{brands.error}</Alert>
      ) : brands.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      ) : brands.data && brands.data.data.length > 0 ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Produk</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {brands.data.data.map((brand) => (
                <TR key={brand.id}>
                  <TD>
                    <p className="font-medium">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">
                      /{brand.slug}
                    </p>
                  </TD>
                  <TD>{brand.products_count ?? 0}</TD>
                  <TD>
                    <Badge tone={brand.is_active ? "success" : "neutral"}>
                      {brand.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/brands/${brand.id}/edit`}
                        className={buttonClasses("ghost", "sm")}
                      >
                        Ubah
                      </Link>
                      <ConfirmButton
                        message={`Hapus identitas "${brand.name}"?`}
                        onConfirm={() => handleDelete(brand.id)}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={brands.data.meta.current_page}
            lastPage={brands.data.meta.last_page}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada identitas toko"
          description="Tambahkan identitas toko untuk mulai mengisi katalog."
          action={
            <Link
              href="/admin/brands/new"
              className={buttonClasses("primary", "sm")}
            >
              Tambah Identitas
            </Link>
          }
        />
      )}
    </div>
  );
}
