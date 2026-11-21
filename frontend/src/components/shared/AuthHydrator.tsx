"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/lib/stores/authStore";

/**
 * Zustand `persist` dikonfigurasi dengan `skipHydration` supaya render pertama
 * di klien sama dengan HTML hasil prerender (belum ada user). Komponen ini
 * memicu pembacaan token dari localStorage setelah mount.
 */
export function AuthHydrator() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  return null;
}
