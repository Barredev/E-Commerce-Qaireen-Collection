const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = typeof value === "string" ? Number.parseFloat(value) : value;

  return Number.isFinite(amount) ? amount : null;
}

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = toNumber(value);

  return amount === null ? "—" : formatter.format(amount);
}

export function formatPriceRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): string {
  const lowest = toNumber(min);
  const highest = toNumber(max);

  if (lowest === null) {
    return "—";
  }

  if (highest === null || lowest === highest) {
    return formatCurrency(lowest);
  }

  return `${formatCurrency(lowest)} – ${formatCurrency(highest)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
