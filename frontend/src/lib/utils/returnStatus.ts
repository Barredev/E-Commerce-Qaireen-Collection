import type { BadgeTone } from "@/components/ui/Badge";
import type { RefundMethod, ReturnReason, ReturnStatus } from "@/lib/types/order";

export function returnStatusTone(status: ReturnStatus): BadgeTone {
  switch (status) {
    case "requested":
      return "warning";
    case "approved":
    case "received":
      return "info";
    case "refunded":
      return "success";
    case "rejected":
      return "error";
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}

export const RETURN_STATUS_OPTIONS: { value: ReturnStatus; label: string }[] = [
  { value: "requested", label: "Diajukan" },
  { value: "approved", label: "Disetujui" },
  { value: "received", label: "Diterima Gudang" },
  { value: "refunded", label: "Dana Dikembalikan" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
];

export const RETURN_REASON_OPTIONS: { value: ReturnReason; label: string }[] = [
  { value: "wrong_item", label: "Barang Salah Kirim" },
  { value: "damaged", label: "Barang Rusak atau Cacat" },
  { value: "not_as_described", label: "Tidak Sesuai Deskripsi" },
  { value: "size_mismatch", label: "Ukuran Tidak Cocok" },
  { value: "changed_mind", label: "Berubah Pikiran" },
  { value: "other", label: "Lainnya" },
];

export const REFUND_METHOD_OPTIONS: {
  value: RefundMethod;
  label: string;
}[] = [
  { value: "bank_transfer", label: "Transfer Bank" },
  { value: "ewallet", label: "Dompet Digital" },
  { value: "store_credit", label: "Saldo Toko" },
  { value: "original_payment", label: "Metode Pembayaran Asli" },
];

export function stockConditionLabel(condition: "good" | "damaged"): string {
  return condition === "good" ? "Baik" : "Rusak";
}
