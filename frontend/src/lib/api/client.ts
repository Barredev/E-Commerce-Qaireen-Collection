import axios from "axios";

import { useAuthStore } from "@/lib/stores/authStore";
import type { ValidationErrorResponse } from "@/lib/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const { token, clearAuth } = useAuthStore.getState();

      if (token) {
        // Cukup bersihkan sesi lokal. Pengalihan ke halaman masuk ditangani
        // oleh guard di layout halaman yang membutuhkan autentikasi.
        clearAuth();
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(
  error: unknown,
  fallback = "Terjadi kesalahan. Silakan coba lagi.",
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ValidationErrorResponse | undefined;

    if (data?.errors) {
      const firstError = Object.values(data.errors)[0];

      if (firstError?.length) {
        return firstError[0];
      }
    }

    if (data?.message) {
      return data.message;
    }

    if (!error.response) {
      return "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
    }
  }

  return fallback;
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ValidationErrorResponse | undefined;
    const fieldErrors: Record<string, string> = {};

    if (data?.errors) {
      for (const [field, messages] of Object.entries(data.errors)) {
        if (messages.length) {
          fieldErrors[field] = messages[0];
        }
      }
    }

    return fieldErrors;
  }

  return {};
}
