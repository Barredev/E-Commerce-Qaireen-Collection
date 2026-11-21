"use client";

import { Button } from "@/components/ui/Button";
import { FieldLabel, fieldClasses } from "@/components/ui/Field";
import type { Category } from "@/lib/types/category";
import { cn } from "@/lib/utils/cn";

export interface FilterValues {
  q: string;
  category: string;
  size: string;
  color: string;
  minPrice: string;
  maxPrice: string;
}

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export function FilterSidebar({
  values,
  categories,
  loading,
  onChange,
  onReset,
}: {
  values: FilterValues;
  categories: Category[];
  loading: boolean;
  onChange: (updates: Partial<FilterValues>) => void;
  onReset: () => void;
}) {
  const hasActiveFilter = Object.entries(values).some(
    ([key, value]) => key !== "q" && Boolean(value),
  );

  return (
    <aside className="w-full shrink-0 lg:w-64 lg:border-r lg:border-border lg:pr-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <p className="font-display text-xs font-black uppercase tracking-[0.16em] text-foreground">
          FILTER KATALOG
        </p>
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-bold uppercase tracking-wider text-danger underline underline-offset-2 hover:opacity-80 cursor-pointer"
          >
            RESET ALL
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-6">
        {/* Category selector */}
        <div>
          <FieldLabel htmlFor="filter-category" className="text-[11px] font-bold uppercase tracking-wider">
            KATEGORI
          </FieldLabel>
          <select
            id="filter-category"
            value={values.category}
            disabled={loading}
            onChange={(event) => onChange({ category: event.target.value })}
            className={cn(fieldClasses, "rounded-xs text-xs font-medium uppercase")}
          >
            <option value="">Semua Kategori</option>
            {categories.map((parent) => (
              <optgroup key={parent.id} label={parent.name.toUpperCase()}>
                <option value={parent.slug}>{parent.name}</option>
                {(parent.children ?? []).map((child) => (
                  <option key={child.id} value={child.slug}>
                    ↳ {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Size chips */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-foreground">
            PILIH UKURAN
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {SIZE_OPTIONS.map((size) => {
              const active = values.size === size;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onChange({ size: active ? "" : size })}
                  aria-pressed={active}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-xs border text-xs font-black uppercase transition-all cursor-pointer",
                    active
                      ? "border-foreground bg-foreground text-background shadow-xs"
                      : "border-border bg-card text-foreground hover:border-foreground",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color filter */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("color");
            onChange({ color: typeof value === "string" ? value.trim() : "" });
          }}
        >
          <FieldLabel htmlFor="filter-color" className="text-[11px] font-bold uppercase tracking-wider">
            WARNA
          </FieldLabel>
          <div className="flex gap-1.5">
            <input
              key={`color-${values.color}`}
              id="filter-color"
              name="color"
              defaultValue={values.color}
              placeholder="mis. Hitam, Putih, Lilac"
              className={cn(fieldClasses, "rounded-xs text-xs")}
            />
            <Button type="submit" variant="outline" size="sm" className="rounded-xs shrink-0">
              CARI
            </Button>
          </div>
        </form>

        {/* Price range */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const min = data.get("min_price");
            const max = data.get("max_price");

            onChange({
              minPrice: typeof min === "string" ? min.trim() : "",
              maxPrice: typeof max === "string" ? max.trim() : "",
            });
          }}
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-foreground">
            RENTANG HARGA (RP)
          </p>
          <div className="flex items-center gap-1.5">
            <input
              key={`min-${values.minPrice}`}
              aria-label="Harga minimum"
              name="min_price"
              inputMode="numeric"
              defaultValue={values.minPrice}
              placeholder="Min"
              className={cn(fieldClasses, "rounded-xs text-xs")}
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              key={`max-${values.maxPrice}`}
              aria-label="Harga maksimum"
              name="max_price"
              inputMode="numeric"
              defaultValue={values.maxPrice}
              placeholder="Maks"
              className={cn(fieldClasses, "rounded-xs text-xs")}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            fullWidth
            className="mt-2 rounded-xs text-[11px]"
          >
            TERAPKAN HARGA
          </Button>
        </form>
      </div>
    </aside>
  );
}
