import { API_BASE_URL } from "@/lib/api/client";

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

/**
 * URL gambar produk bisa berupa path relatif (`/storage/...`) yang disimpan
 * Laravel Storage, atau URL absolut dari penyimpanan eksternal. Path relatif
 * harus diarahkan ke origin API, bukan origin frontend.
 */
export function resolveMediaUrl(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return value;
}
