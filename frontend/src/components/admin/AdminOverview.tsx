"use client";

import Link from "next/link";

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
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAdminProducts } from "@/lib/api/products";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { formatPriceRange } from "@/lib/utils/formatCurrency";

export function AdminOverview() {
  const products = useAsyncData(
    () => fetchAdminProducts({ per_page: 5 }),
    "admin-overview-products",
  );
  const activeProducts = useAsyncData(
    () => fetchAdminProducts({ is_active: true, per_page: 1 }),
    "admin-overview-active",
  );

  const stats = [
    {
      label: "Total Produk",
      value: products.data?.meta.total,
      loading: products.loading,
      href: "/admin/products",
    },
    {
      label: "Produk Aktif",
      value: activeProducts.data?.meta.total,
      loading: activeProducts.loading,
      href: "/admin/products",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ringkasan"
        description="Pantau katalog dan siapkan produk untuk dijual."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="border border-border bg-card p-5 transition-colors hover:border-foreground"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {stat.loading ? "…" : (stat.value ?? 0)}
            </p>
          </Link>
        ))}
      </div>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Produk Terbaru</h2>
          <Link
            href="/admin/products"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Kelola produk
          </Link>
        </div>

        <div className="mt-4">
          {products.error ? (
            <Alert tone="error">{products.error}</Alert>
          ) : products.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : products.data && products.data.data.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Produk</TH>
                  <TH>Harga</TH>
                  <TH>Status</TH>
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
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                      </div>
                    </TD>
                    <TD>{formatPriceRange(product.price_min, product.price_max)}</TD>
                    <TD>
                      <Badge tone={product.is_active ? "success" : "neutral"}>
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              title="Belum ada produk"
              description="Tambahkan produk pertama untuk mulai mengisi katalog."
            />
          )}
        </div>
      </section>
    </div>
  );
}
