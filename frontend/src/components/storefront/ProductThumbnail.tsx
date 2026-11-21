/* eslint-disable @next/next/no-img-element */
// Gambar produk berasal dari URL yang diisi admin (bisa dari domain mana pun),
// sehingga sengaja memakai <img> tanpa optimizer agar tidak perlu mendaftarkan
// setiap domain di remotePatterns.

import { cn } from "@/lib/utils/cn";
import { resolveMediaUrl } from "@/lib/utils/media";

export function ProductThumbnail({
  src,
  alt,
  className,
  placeholder = "Belum ada gambar",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  placeholder?: string;
}) {
  const url = resolveMediaUrl(src);

  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-center text-xs text-muted-foreground",
          className,
        )}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
    />
  );
}
