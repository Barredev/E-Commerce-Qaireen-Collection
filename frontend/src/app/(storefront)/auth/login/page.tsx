import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard, AuthFormSkeleton } from "@/components/storefront/auth/AuthCard";
import { LoginForm } from "@/components/storefront/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Masuk"
      description="Kelola pesanan, simpan wishlist, dan pantau pengiriman."
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
