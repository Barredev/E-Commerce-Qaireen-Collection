"use client";

import { useEffect, useState } from "react";

import { FieldError, FieldHint, FieldLabel } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { searchShippingDestinations } from "@/lib/api/shipping";
import type { ShippingDestination } from "@/lib/types/order";

/**
 * Kota tujuan RajaOngkir. Nilai `id` inilah yang dipakai backend untuk
 * menghitung tarif kurir, jadi alamat tanpa kota tujuan tidak bisa di-quote.
 */
export function ShippingDestinationPicker({
  value,
  onChange,
  error,
  hint = "Digunakan untuk menghitung ongkos kirim otomatis.",
}: {
  value: ShippingDestination | null;
  onChange: (destination: ShippingDestination | null) => void;
  error?: string;
  hint?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShippingDestination[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();

    // All state changes happen inside the timer callback so the effect body
    // only ever schedules work.
    const timer = setTimeout(() => {
      if (term.length < 2) {
        setResults([]);
        return;
      }

      setSearching(true);
      searchShippingDestinations(term)
        .then((response) => setResults(response.data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (value) {
    return (
      <div>
        <FieldLabel>Kota Tujuan Pengiriman</FieldLabel>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
          <div className="text-sm">
            <p className="font-medium text-foreground">{value.name}</p>
            <p className="text-xs text-muted-foreground">{value.province}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="cursor-pointer border-b border-border pb-0.5 text-xs font-medium uppercase tracking-[0.14em] text-foreground transition-colors hover:border-foreground"
          >
            Ganti
          </button>
        </div>
        <FieldError>{error}</FieldError>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel>Kota Tujuan Pengiriman</FieldLabel>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ketik nama kota, mis. Bandung"
        className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:outline-none"
      />

      {searching ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner /> Mencari kota…
        </div>
      ) : null}

      {results.length > 0 ? (
        <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card text-sm">
          {results.map((destination) => (
            <li key={destination.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(destination);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <span className="font-medium text-foreground">
                  {destination.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {destination.province}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <FieldError>{error}</FieldError>
      <FieldHint>{hint}</FieldHint>
    </div>
  );
}
