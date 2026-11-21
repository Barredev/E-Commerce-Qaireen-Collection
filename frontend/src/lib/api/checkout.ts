import { api } from "@/lib/api/client";
import type { ResourceResponse } from "@/lib/types/api";
import type { CheckoutPayload, Order } from "@/lib/types/order";

export async function submitCheckout(payload: CheckoutPayload): Promise<Order> {
  const response = await api.post<ResourceResponse<Order>>(
    "/checkout",
    payload,
  );
  return response.data.data;
}
