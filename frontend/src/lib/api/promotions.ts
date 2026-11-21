import { api } from "./client";

import type {
  MessageResponse,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/types/api";
import type {
  CouponApplicationResult,
  Promotion,
  PromotionPayload,
} from "@/lib/types/promotion";

export interface AdminPromotionQuery {
  q?: string;
  type?: string;
  is_active?: string | boolean;
  page?: number;
  per_page?: number;
}

/**
 * Promosi yang sedang berjalan, dipakai etalase (tanpa autentikasi).
 */
export async function fetchActivePromotions(limit = 6): Promise<Promotion[]> {
  const { data } = await api.get<{ data: Promotion[] }>("/promotions", {
    params: { limit },
  });

  return data.data;
}

export async function applyCoupon(
  code: string,
): Promise<CouponApplicationResult> {
  const { data } = await api.post<ResourceResponse<CouponApplicationResult>>(
    "/checkout/apply-coupon",
    { code },
  );

  return data.data;
}

export async function fetchAdminPromotions(
  query: AdminPromotionQuery = {},
): Promise<PaginatedResponse<Promotion>> {
  const { data } = await api.get<PaginatedResponse<Promotion>>(
    "/admin/promotions",
    { params: query },
  );

  return data;
}

export async function fetchAdminPromotionDetail(
  id: string,
): Promise<Promotion> {
  const { data } = await api.get<ResourceResponse<Promotion>>(
    `/admin/promotions/${id}`,
  );

  return data.data;
}

export async function createAdminPromotion(
  payload: PromotionPayload,
): Promise<Promotion> {
  const { data } = await api.post<ResourceResponse<Promotion>>(
    "/admin/promotions",
    payload,
  );

  return data.data;
}

export async function updateAdminPromotion(
  id: string,
  payload: Partial<PromotionPayload>,
): Promise<Promotion> {
  const { data } = await api.put<ResourceResponse<Promotion>>(
    `/admin/promotions/${id}`,
    payload,
  );

  return data.data;
}

export async function deleteAdminPromotion(
  id: string,
): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(
    `/admin/promotions/${id}`,
  );

  return data;
}

export async function toggleAdminPromotionActive(
  id: string,
): Promise<Promotion> {
  const { data } = await api.patch<ResourceResponse<Promotion>>(
    `/admin/promotions/${id}/toggle-active`,
  );

  return data.data;
}

export async function subscribeNewsletter(email: string): Promise<{
  message: string;
  data: { email: string; already_subscribed: boolean };
}> {
  const { data } = await api.post<{
    message: string;
    data: { email: string; already_subscribed: boolean };
  }>("/newsletter", { email });

  return data;
}
