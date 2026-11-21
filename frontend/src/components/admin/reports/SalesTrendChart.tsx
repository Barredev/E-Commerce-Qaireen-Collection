"use client";

import { useState } from "react";

import type { DailySalesTrend } from "@/lib/types/report";
import { formatCurrency } from "@/lib/utils/formatCurrency";

/**
 * Grafik batang tren penjualan harian — SVG buatan sendiri, tanpa library.
 *
 * Keputusan bentuk: satu deret waktu (omset per hari) → batang tipis. Tidak ada
 * legenda karena judul bagian sudah menamai deretnya. Batang memakai tinta
 * (`--foreground`) di atas permukaan kartu, sehingga kontrasnya tetap aman di
 * mode terang maupun gelap tanpa perlu palet kategorikal.
 *
 * Tabel di bawah grafik adalah kembaran aksesibelnya: semua nilai yang tampil
 * di sini bisa dibaca sebagai teks.
 */

const VIEW_W = 900;
const VIEW_H = 300;
const PAD_LEFT = 64;
const PAD_RIGHT = 12;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;

const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

/** Empat interval → lima garis bantu, angka sumbu selalu bulat. */
const TICK_COUNT = 4;

const compactCurrency = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

const longDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * `new Date("2026-11-01")` dibaca sebagai tengah malam UTC, yang bisa bergeser
 * satu hari di zona waktu negatif. Tanggal laporan adalah tanggal kalender, jadi
 * komponennya dirakit ulang sebagai waktu lokal.
 */
function parseReportDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Langkah sumbu "bulat": 1, 2, 2.5, 5, atau 10 dikali pangkat sepuluh. */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;

  return nice * magnitude;
}

/**
 * Batang dengan ujung data membulat 4px dan kaki rata di garis dasar.
 * `height` bisa 0 untuk hari tanpa penjualan — batang kosong tidak digambar.
 */
function barPath(x: number, top: number, width: number, height: number): string {
  if (height <= 0.5) {
    return "";
  }

  const radius = Math.min(4, width / 2, height);
  const bottom = top + height;

  return [
    `M ${x} ${bottom}`,
    `L ${x} ${top + radius}`,
    `Q ${x} ${top} ${x + radius} ${top}`,
    `L ${x + width - radius} ${top}`,
    `Q ${x + width} ${top} ${x + width} ${top + radius}`,
    `L ${x + width} ${bottom}`,
    "Z",
  ].join(" ");
}

export function SalesTrendChart({ rows }: { rows: DailySalesTrend[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (rows.length === 0) {
    return null;
  }

  const peak = rows.reduce((max, row) => Math.max(max, row.revenue), 0);
  const step = niceStep(peak > 0 ? peak / TICK_COUNT : 1);
  const axisMax = step * TICK_COUNT;

  const slot = PLOT_W / rows.length;
  const barWidth = Math.min(24, Math.max(4, slot * 0.55));
  const labelStride = Math.max(1, Math.ceil(rows.length / 7));

  function yFor(value: number): number {
    return PAD_TOP + PLOT_H - (value / axisMax) * PLOT_H;
  }

  const active = activeIndex === null ? null : rows[activeIndex];
  const activeX =
    activeIndex === null
      ? 0
      : PAD_LEFT + activeIndex * slot + (slot - barWidth) / 2 + barWidth / 2;
  const activeTop =
    active === null ? 0 : yFor(active.revenue);

  // Tooltip: kotak 148×46, dijepit agar tidak keluar dari area gambar.
  const tooltipWidth = 148;
  const tooltipHeight = 46;
  const tooltipX = Math.min(
    Math.max(activeX - tooltipWidth / 2, PAD_LEFT),
    VIEW_W - PAD_RIGHT - tooltipWidth,
  );
  const tooltipY = Math.max(PAD_TOP, activeTop - tooltipHeight - 12);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full min-w-[640px]"
        role="img"
        aria-label={`Tren penjualan harian untuk ${rows.length} hari terakhir. Nilai lengkap tersedia pada tabel di bawah.`}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {/* Garis bantu: rambut 1px solid, tidak pernah putus-putus. */}
        {Array.from({ length: TICK_COUNT }).map((_, index) => {
          const value = step * (index + 1);
          const y = yFor(value);

          return (
            <g key={`grid-${index}`}>
              <line
                x1={PAD_LEFT}
                x2={VIEW_W - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text
                x={PAD_LEFT - 10}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="var(--muted-foreground)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {compactCurrency.format(value)}
              </text>
            </g>
          );
        })}

        {/* Garis dasar. */}
        <line
          x1={PAD_LEFT}
          x2={VIEW_W - PAD_RIGHT}
          y1={PAD_TOP + PLOT_H}
          y2={PAD_TOP + PLOT_H}
          stroke="var(--border)"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />

        {rows.map((row, index) => {
          const x = PAD_LEFT + index * slot + (slot - barWidth) / 2;
          const top = yFor(row.revenue);
          const height = PAD_TOP + PLOT_H - top;
          const dimmed = activeIndex !== null && activeIndex !== index;

          return (
            <g key={row.date}>
              <path
                d={barPath(x, top, barWidth, height)}
                fill="var(--foreground)"
                opacity={dimmed ? 0.3 : 1}
              />
              {/* Area tangkap selebar slot: seluruh tinggi plot, bukan hanya batangnya. */}
              <rect
                x={PAD_LEFT + index * slot}
                y={PAD_TOP}
                width={slot}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
              />
              {index % labelStride === 0 || index === rows.length - 1 ? (
                <text
                  x={x + barWidth / 2}
                  y={VIEW_H - 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {shortDate.format(parseReportDate(row.date))}
                </text>
              ) : null}
            </g>
          );
        })}

        {active !== null ? (
          <g pointerEvents="none">
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={tooltipX + 10}
              y={tooltipY + 18}
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              {longDate.format(parseReportDate(active.date))}
            </text>
            <text
              x={tooltipX + 10}
              y={tooltipY + 34}
              fontSize="12"
              fill="var(--foreground)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCurrency(active.revenue)}
            </text>
            <text
              x={tooltipX + tooltipWidth - 10}
              y={tooltipY + 34}
              fontSize="10"
              textAnchor="end"
              fill="var(--muted-foreground)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {active.orders_count} pesanan
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
