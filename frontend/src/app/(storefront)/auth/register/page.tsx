import type { Metadata } from "next";

import { AuthCard } from "@/components/storefront/auth/AuthCard";
import { RegisterForm } from "@/components/storefront/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Daftar",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Buat Akun"
      description="Satu akun untuk berbelanja seluruh koleksi Qaireen Collection."
    >
      <RegisterForm />
    </AuthCard>
  );
}
