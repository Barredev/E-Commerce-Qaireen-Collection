import { api } from "@/lib/api/client";
import type { PaginatedResponse, ResourceResponse } from "@/lib/types/api";
import type {
  OrderReturn,
  ReceiveReturnLinePayload,
  RefundReturnPayload,
  StoreReturnPayload,
} from "@/lib/types/order";

export async function fetchMyReturns(
  page = 1,
): Promise<PaginatedResponse<OrderReturn>> {
  const response = await api.get<PaginatedResponse<OrderReturn>>(
    "/account/returns",
    { params: { page } },
  );
  return response.data;
}

export async function createReturn(
  orderNumber: string,
  payload: StoreReturnPayload,
): Promise<OrderReturn> {
  const response = await api.post<ResourceResponse<OrderReturn>>(
    `/account/orders/${orderNumber}/returns`,
    payload,
  );
  return response.data.data;
}

export async function fetchMyReturn(returnNumber: string): Promise<OrderReturn> {
  const response = await api.get<ResourceResponse<OrderReturn>>(
    `/account/returns/${returnNumber}`,
  );
  return response.data.data;
}

export async function cancelMyReturn(
  returnNumber: string,
): Promise<OrderReturn> {
  const response = await api.post<ResourceResponse<OrderReturn>>(
    `/account/returns/${returnNumber}/cancel`,
  );
  return response.data.data;
}

export interface AdminReturnsFilter {
  page?: number;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  per_page?: number;
}

export async function fetchAdminReturns(
  filters: AdminReturnsFilter = {},
): Promise<PaginatedResponse<OrderReturn>> {
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

  const response = await api.get<PaginatedResponse<OrderReturn>>(
    "/admin/returns",
    { params },
  );
  return response.data;
}

export async function fetchAdminReturn(id: string): Promise<OrderReturn> {
  const response = await api.get<ResourceResponse<OrderReturn>>(
    `/admin/returns/${id}`,
  );
  return response.data.data;
}

export async function approveAdminReturn(
  id: string,
  resolution?: string,
): Promise<OrderReturn> {
  const response = await api.put<ResourceResponse<OrderReturn>>(
    `/admin/returns/${id}/approve`,
    { ...(resolution ? { resolution } : {}) },
  );
  return response.data.data;
}

export async function rejectAdminReturn(
  id: string,
  resolution: string,
): Promise<OrderReturn> {
  const response = await api.put<ResourceResponse<OrderReturn>>(
    `/admin/returns/${id}/reject`,
    { resolution },
  );
  return response.data.data;
}

export async function receiveAdminReturn(
  id: string,
  items: ReceiveReturnLinePayload[],
): Promise<OrderReturn> {
  const response = await api.put<ResourceResponse<OrderReturn>>(
    `/admin/returns/${id}/receive`,
    { items },
  );
  return response.data.data;
}

export async function refundAdminReturn(
  id: string,
  payload: RefundReturnPayload,
): Promise<OrderReturn> {
  const response = await api.put<ResourceResponse<OrderReturn>>(
    `/admin/returns/${id}/refund`,
    payload,
  );
  return response.data.data;
}
