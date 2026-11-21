import type { Metadata } from "next";

import { CategoryList } from "@/components/storefront/CategoryList";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Kategori & Departemen Busana",
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="DEPARTEMEN BELANJA"
        title="SEMUA KATEGORI BUSANA"
        description="Jelajahi beragam gaya pakaian mulai dari atasan, bawahan, dress, hijab hingga outer."
      />

      <div className="mt-8">
        <CategoryList />
      </div>
    </div>
  );
}
