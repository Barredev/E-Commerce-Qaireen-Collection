"use client";

import { create } from "zustand";

import { addToCart, fetchCart, removeCartItem, updateCartItem } from "@/lib/api/cart";
import { useAuthStore } from "@/lib/stores/authStore";
import type { Cart } from "@/lib/types/order";

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  loadCart: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
  itemsCount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  loading: false,
  error: null,

  loadCart: async () => {
    if (!useAuthStore.getState().token) {
      set({ cart: null, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const cart = await fetchCart();
      set({ cart, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addItem: async (variantId: string, quantity = 1) => {
    set({ loading: true, error: null });
    try {
      const updated = await addToCart(variantId, quantity);
      set({ cart: updated, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  updateItem: async (itemId: string, quantity: number) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateCartItem(itemId, quantity);
      set({ cart: updated, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  removeItem: async (itemId: string) => {
    set({ loading: true, error: null });
    try {
      const updated = await removeCartItem(itemId);
      set({ cart: updated, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  clearCart: () => set({ cart: null }),

  itemsCount: () => {
    const currentCart = get().cart;
    if (!currentCart) {
      return 0;
    }
    return currentCart.items_count ?? 0;
  },
}));
