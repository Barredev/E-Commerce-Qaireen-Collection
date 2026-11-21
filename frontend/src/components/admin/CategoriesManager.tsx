"use client";

import Link from "next/link";
import { useState } from "react";

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
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  deleteCategory,
  fetchAdminCategoryTree,
} from "@/lib/api/categories";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { Category } from "@/lib/types/category";

export function CategoriesManager() {
  const categories = useAsyncData(
    () => fetchAdminCategoryTree(),
    "admin-categories",
  );
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setActionError(null);

    try {
      await deleteCategory(id);
      categories.reload();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  const rows: { category: Category; depth: number }[] = [];

  for (const parent of categories.data ?? []) {
    rows.push({ category: parent, depth: 0 });

    for (const child of parent.children ?? []) {
      rows.push({ category: child, depth: 1 });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori"
        description="Susun kategori dua tingkat: induk dan sub-kategori."
        action={
          <Link
            href="/admin/categories/new"
            className={buttonClasses("primary", "md")}
          >
            Tambah Kategori
          </Link>
        }
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      {categories.error ? (
        <Alert tone="error">{categories.error}</Alert>
      ) : categories.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Nama</TH>
              <TH>Produk</TH>
              <TH>Status</TH>
              <TH>Urutan</TH>
              <TH className="text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map(({ category, depth }) => (
              <TR key={category.id}>
                <TD>
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: depth * 20 }}
                  >
                    {depth > 0 ? (
                      <span className="text-muted-foreground">↳</span>
                    ) : null}
                    <div>
                      <p
                        className={
                          depth === 0 ? "font-medium" : "text-sm"
                        }
                      >
                        {category.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{category.slug}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD>{category.products_count ?? 0}</TD>
                <TD>
                  <Badge tone={category.is_active ? "success" : "neutral"}>
                    {category.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TD>
                <TD>{category.sort_order}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/categories/${category.id}/edit`}
                      className={buttonClasses("ghost", "sm")}
                    >
                      Ubah
                    </Link>
                    <ConfirmButton
                      message={`Hapus kategori "${category.name}"?`}
                      onConfirm={() => handleDelete(category.id)}
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <EmptyState
          title="Belum ada kategori"
          description="Buat kategori induk terlebih dahulu, lalu tambahkan sub-kategori."
          action={
            <Link
              href="/admin/categories/new"
              className={buttonClasses("primary", "sm")}
            >
              Tambah Kategori
            </Link>
          }
        />
      )}
    </div>
  );
}
