"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

const SIZE_CLASSES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

export type StarSize = keyof typeof SIZE_CLASSES;

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2.6l2.86 5.8 6.4.93-4.63 4.51 1.09 6.37L12 17.2l-5.72 3.01 1.09-6.37L2.74 9.33l6.4-.93L12 2.6z" />
    </svg>
  );
}

/**
 * Bintang tampilan-saja. Nilai desimal ditampilkan dengan memotong lapisan
 * bintang penuh, sehingga 4,3 bintang terlihat sebagai 4 bintang utuh plus
 * sepotong bintang kelima.
 */
export function StarRating({
  value,
  max = 5,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  size?: StarSize;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(value, max));
  const percent = (clamped / max) * 100;
  const starClass = SIZE_CLASSES[size];

  return (
    <span
      role="img"
      aria-label={`${clamped.toFixed(1)} dari ${max} bintang`}
      className={cn("relative inline-flex align-middle", className)}
    >
      <span className="flex gap-0.5 text-border">
        {Array.from({ length: max }, (_, index) => (
          <StarIcon key={index} className={starClass} />
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      >
        <span className="flex w-max gap-0.5 text-warning">
          {Array.from({ length: max }, (_, index) => (
            <StarIcon key={index} className={starClass} />
          ))}
        </span>
      </span>
    </span>
  );
}

/**
 * Bintang interaktif untuk form ulasan. Nilai 0 berarti belum dipilih.
 */
export function StarRatingInput({
  value,
  onChange,
  label,
  size = "lg",
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: StarSize;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div
      role="radiogroup"
      aria-label={label ?? "Rating"}
      className="flex items-center gap-1"
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: 5 }, (_, index) => index + 1).map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} bintang`}
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onFocus={() => setHovered(star)}
          onBlur={() => setHovered(null)}
          className="cursor-pointer rounded-xs p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <StarIcon
            className={cn(
              SIZE_CLASSES[size],
              star <= active ? "text-warning" : "text-border",
            )}
          />
        </button>
      ))}
    </div>
  );
}
