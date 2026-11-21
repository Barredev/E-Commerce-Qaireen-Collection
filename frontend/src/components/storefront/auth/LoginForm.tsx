"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { login } from "@/lib/api/auth";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import type { User } from "@/lib/types/user";

function defaultDestination(user: User): string {
  switch (user.role) {
    case "admin":
      return "/admin";
    case "warehouse":
      return "/admin/inventory/stocks";
    default:
      return "/account";
  }
}

/** Hanya izinkan path internal agar `?redirect=` tidak dipakai untuk open redirect. */
function safeRedirect(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const response = await login({ email, password });
      setAuth(response.data, response.token);

      const target =
        safeRedirect(searchParams.get("redirect")) ??
        defaultDestination(response.data);

      router.replace(target);
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
      />

      <Input
        label="Kata Sandi"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />

      <Button type="submit" fullWidth loading={submitting} className="rounded-xs font-black uppercase tracking-wider">
        MASUK SEKARANG
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href="/auth/register"
          className="font-black uppercase tracking-wider text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
        >
          DAFTAR SEKARANG
        </Link>
      </p>
    </form>
  );
}
