"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { register } from "@/lib/api/auth";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const response = await register({
        name: form.name,
        email: form.email,
        phone: form.phone.trim() ? form.phone.trim() : undefined,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      setAuth(response.data, response.token);
      router.replace("/account");
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
        label="Nama Lengkap"
        name="name"
        autoComplete="name"
        required
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
        error={fieldErrors.name}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={form.email}
        onChange={(event) => update("email", event.target.value)}
        error={fieldErrors.email}
      />

      <Input
        label="Nomor Telepon"
        name="phone"
        type="tel"
        autoComplete="tel"
        hint="Opsional, dipakai untuk konfirmasi pengiriman."
        value={form.phone}
        onChange={(event) => update("phone", event.target.value)}
        error={fieldErrors.phone}
      />

      <Input
        label="Kata Sandi"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Minimal 8 karakter."
        value={form.password}
        onChange={(event) => update("password", event.target.value)}
        error={fieldErrors.password}
      />

      <Input
        label="Ulangi Kata Sandi"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        required
        value={form.password_confirmation}
        onChange={(event) => update("password_confirmation", event.target.value)}
        error={fieldErrors.password_confirmation}
      />

      <Button type="submit" fullWidth loading={submitting} className="rounded-xs font-black uppercase tracking-wider">
        DAFTAR SEKARANG
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href="/auth/login"
          className="font-black uppercase tracking-wider text-foreground underline decoration-2 underline-offset-4 hover:text-danger"
        >
          MASUK KE AKUN
        </Link>
      </p>
    </form>
  );
}
