"use client";

import { useState } from "react";

import { useVariantOptions } from "@/lib/hooks/useVariantOptions";

/**
 * Pemilih varian untuk form stok. Endpoint daftar varian global belum ada,
 * jadi opsi diambil dari produk admin dan disaring lewat kata kunci.
 */
export function VariantPicker({
  value,
  onChange,
  error,
  id = "variant_id",
  label = "Varian",
  disabled = false,
}: {
  value: string;
  onChange: (variantId: string) => void;
  error?: string;
  id?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const { options, loading, error: loadError } = useVariantOptions(search);

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
        <span className="ml-0.5 text-danger">*</span>
      </label>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cari nama produk atau SKU…"
        aria-label="Cari varian"
        className="mb-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
      />

      <select
        id={id}
        value={value}
        disabled={disabled || loading}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none disabled:opacity-60"
      >
        <option value="">
          {loading ? "Memuat varian…" : "Pilih varian…"}
        </option>
        {options.map((option) => (
          <option key={option.variantId} value={option.variantId}>
            {option.label}
          </option>
        ))}
      </select>

      {loadError ? (
        <p className="mt-1.5 text-xs text-danger">{loadError}</p>
      ) : null}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
