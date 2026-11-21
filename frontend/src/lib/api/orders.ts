import { api } from "@/lib/api/client";
import type { PaginatedResponse, ResourceResponse } from "@/lib/types/api";
import type { Order, Shipment, ShipOrderPayload } from "@/lib/types/order";

export async function fetchMyOrders(
  page = 1,
): Promise<PaginatedResponse<Order>> {
  const response = await api.get<PaginatedResponse<Order>>("/account/orders", {
    params: { page },
  });
  return response.data;
}

export async function fetchMyOrder(orderNumber: string): Promise<Order> {
  const response = await api.get<ResourceResponse<Order>>(
    `/account/orders/${orderNumber}`,
  );
  return response.data.data;
}

export async function cancelMyOrder(
  orderNumber: string,
  reason?: string,
): Promise<Order> {
  const response = await api.post<ResourceResponse<Order>>(
    `/account/orders/${orderNumber}/cancel`,
    { reason },
  );
  return response.data.data;
}

export interface AdminOrdersFilter {
  page?: number;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  per_page?: number;
}

export async function fetchAdminOrders(
  filters: AdminOrdersFilter = {},
): Promise<PaginatedResponse<Order>> {
  const params: Record<string, string | number> = {};

  if (filters.page) {
    params.page = filters.page;
  }
  if (filters.status) {
    params.status = filters.status;
  }
  if (filters.q?.trim()) {
    params.q = filters.q.trim();
  }
  if (filters.from) {
    params.from = filters.from;
  }
  if (filters.to) {
    params.to = filters.to;
  }
  if (filters.per_page) {
    params.per_page = filters.per_page;
  }

  const response = await api.get<PaginatedResponse<Order>>("/admin/orders", {
    params,
  });
  return response.data;
}

export async function fetchAdminOrder(id: string): Promise<Order> {
  const response = await api.get<ResourceResponse<Order>>(`/admin/orders/${id}`);
  return response.data.data;
}

export async function updateAdminOrderStatus(
  id: string,
  status: string,
  reason?: string,
): Promise<Order> {
  const response = await api.put<ResourceResponse<Order>>(
    `/admin/orders/${id}/status`,
    {
      status,
      ...(reason ? { reason } : {}),
    },
  );
  return response.data.data;
}

export async function shipAdminOrder(
  id: string,
  payload: ShipOrderPayload,
): Promise<Order> {
  const response = await api.post<ResourceResponse<Order>>(
    `/admin/orders/${id}/ship`,
    payload,
  );
  return response.data.data;
}

export async function trackAdminShipment(shipmentId: string): Promise<Shipment> {
  const response = await api.post<ResourceResponse<Shipment>>(
    `/admin/shipments/${shipmentId}/track`,
  );
  return response.data.data;
}

export interface PaymentTokenResponse {
  token: string;
  redirect_url: string;
  payment_gateway: string;
  is_simulated: boolean;
  client_key?: string;
  is_production?: boolean;
}

export async function createPaymentToken(
  orderNumber: string,
): Promise<PaymentTokenResponse> {
  const response = await api.post<{ data: PaymentTokenResponse }>(
    `/account/orders/${orderNumber}/pay`,
  );
  return response.data.data;
}

export async function simulateOrderPayment(
  orderNumber: string,
): Promise<{ status: string; message: string; order_status: string }> {
  const response = await api.post<{
    status: string;
    message: string;
    order_status: string;
  }>(`/account/orders/${orderNumber}/simulate-pay`);
  return response.data;
}
