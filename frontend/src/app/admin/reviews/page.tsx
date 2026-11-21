import type { Metadata } from "next";

import { ReviewsTable } from "@/components/admin/ReviewsTable";

export const metadata: Metadata = {
  title: "Ulasan Produk",
  description: "Pantau dan moderasi ulasan pembeli terverifikasi.",
};

export default function AdminReviewsPage() {
  return <ReviewsTable />;
}
