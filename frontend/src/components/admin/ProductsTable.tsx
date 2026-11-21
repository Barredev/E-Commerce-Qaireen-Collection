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
import { ProductThumbnail } from "@/components/storefront/ProductThumbnail";
import { Pagination } from "@/components/shared/Pagination";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAdminBrands } from "@/lib/api/brands";
import { fetchAdminCategories } from "@/lib/api/categories";
import { deleteProduct, fetchAdminProducts } from "@/lib/api/products";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { formatPriceRange } from "@/lib/utils/formatCurrency";

export function ProductsTable() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const products = useAsyncData(
    () =>
      fetchAdminProducts({
        q: q || undefined,
        brand_id: brandId || undefined,
        category_id: categoryId || undefined,
        is_active:
          activeFilter === "" ? undefined : activeFilter === "1",
        page,
        per_page: 20,
      }),
    `${q}-${brandId}-${categoryId}-${activeFilter}-${page}`,
  );

  const brands = useAsyncData(
    () => fetchAdminBrands({ per_page: 100 }),
    "products-table-brands",
  );
  const categories = useAsyncData(
    () => fetchAdminCategories({ per_page: 100 }),
    "products-table-categories",
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  function resetFilters() {
    setQInput("");
    setQ("");
    setBrandId("");
    setCategoryId("");
    setActiveFilter("");
    setPage(1);
  }

  async function handleDelete(id: string) {
    setActionError(null);

    try {
      await deleteProduct(id);
      products.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Kelola produk, varian, dan gambar katalog."
        action={
          <Link
            href="/admin/products/new"
            className={buttonClasses("primary", "md")}
          >
            Tambah Produk
          </Link>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-end gap-3 border border-border bg-card p-4"
      >
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">Cari</span>
          <input
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            placeholder="Nama produk…"
            className="border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
          />
        </label>

        <label className="flex min-w-40 flex-col gap-1.5 text-sm">
          <span className="font-medium">Brand</span>
          <select
            value={brandId}
            onChange={(event) => {
              setBrandId(event.target.value);
              setPage(1);
            }}
            className="border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
          >
            <option value="">Semua</option>
            {(brands.data?.data ?? []).map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-40 flex-col gap-1.5 text-sm">
          <span className="font-medium">Kategori</span>
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            className="border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
          >
            <option value="">Semua</option>
            {(categories.data?.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-32 flex-col gap-1.5 text-sm">
          <span className="font-medium">Status</span>
          <select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              setPage(1);
            }}
            className="border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
          >
            <option value="">Semua</option>
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
        </label>

        <Button type="submit" variant="outline">
          Terapkan
        </Button>
        <Button type="button" variant="ghost" onClick={resetFilters}>
          Reset
        </Button>
      </form>

      {products.error ? (
        <Alert tone="error">{products.error}</Alert>
      ) : products.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : products.data && products.data.data.length > 0 ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Produk</TH>
                <TH>Brand</TH>
                <TH>Kategori</TH>
                <TH>Harga</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {products.data.data.map((product) => (
                <TR key={product.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-md border border-border">
                        <ProductThumbnail
                          src={product.thumbnail}
                          alt={product.name}
                          className="size-full"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{product.slug}
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">
                    {product.brand?.name ?? "—"}
                  </TD>
                  <TD className="text-muted-foreground">
                    {product.category?.name ?? "—"}
                  </TD>
                  <TD>{formatPriceRange(product.price_min, product.price_max)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={product.is_active ? "success" : "neutral"}>
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {product.is_featured ? (
                        <Badge tone="info">Unggulan</Badge>
                      ) : null}
                    </div>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className={buttonClasses("ghost", "sm")}
                      >
                        Ubah
                      </Link>
                      <ConfirmButton
                        message={`Hapus produk "${product.name}" beserta variannya?`}
                        onConfirm={() => handleDelete(product.id)}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination
            page={products.data.meta.current_page}
            lastPage={products.data.meta.last_page}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title="Belum ada produk"
          description="Tambahkan produk pertama untuk mulai mengisi katalog."
          action={
            <Link
              href="/admin/products/new"
              className={buttonClasses("primary", "sm")}
            >
              Tambah Produk
            </Link>
          }
        />
      )}
    </div>
  );
}
