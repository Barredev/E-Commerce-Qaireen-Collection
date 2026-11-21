import { api } from "@/lib/api/client";
import type { ResourceResponse } from "@/lib/types/api";
import type { Cart } from "@/lib/types/order";

export async function fetchCart(): Promise<Cart> {
  const response = await api.get<ResourceResponse<Cart>>("/cart");
  return response.data.data;
}

export async function addToCart(
  variantId: string,
  quantity = 1,
): Promise<Cart> {
  const response = await api.post<ResourceResponse<Cart>>("/cart/items", {
    variant_id: variantId,
    quantity,
  });
  return response.data.data;
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<Cart> {
  const response = await api.put<ResourceResponse<Cart>>(
    `/cart/items/${itemId}`,
    { quantity },
  );
  return response.data.data;
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  const response = await api.delete<ResourceResponse<Cart>>(
    `/cart/items/${itemId}`,
  );
  return response.data.data;
}
