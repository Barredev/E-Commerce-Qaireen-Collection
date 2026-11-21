import type { AxiosResponse } from "axios";

/**
 * Memicu unduhan berkas dari blob di browser.
 *
 * Header `Content-Disposition` tidak diekspos oleh CORS (`exposed_headers`
 * kosong), sehingga nama berkas selalu disusun di sisi klien.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadBlob(
  request: Promise<AxiosResponse<Blob>>,
  filename: string,
): Promise<void> {
  const response = await request;

  triggerDownload(response.data, filename);
}

/**
 * Membuka dokumen HTML (invoice siap cetak) di tab baru.
 *
 * Tab dibuka lebih dulu sebelum menunggu respons supaya tidak diblokir popup
 * blocker, lalu diarahkan ke blob URL setelah berkas selesai diunduh.
 */
export async function openPrintPreview(
  request: Promise<AxiosResponse<Blob>>,
  fallbackFilename = "invoice.html",
): Promise<void> {
  const preview = window.open("", "_blank");

  try {
    const response = await request;
    const url = URL.createObjectURL(
      new Blob([response.data], { type: "text/html" }),
    );

    if (preview) {
      preview.location.href = url;
    } else {
      triggerDownload(response.data, fallbackFilename);
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    preview?.close();

    throw error;
  }
}
