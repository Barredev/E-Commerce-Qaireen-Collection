import { api } from "@/lib/api/client";
import type { PaginatedResponse, ResourceResponse } from "@/lib/types/api";
import type {
  AdminReviewItem,
  OrderFeedbackStatus,
  ProductReview,
  ProductReviewSummary,
  SubmitFeedbackPayload,
  SubmitFeedbackResult,
} from "@/lib/types/feedback";

export type ProductReviewsResponse = PaginatedResponse<ProductReview> & {
  summary: ProductReviewSummary;
};

export async function fetchProductReviews(
  productSlug: string,
  page = 1,
  perPage = 5,
): Promise<ProductReviewsResponse> {
  const response = await api.get<ProductReviewsResponse>(
    `/products/${productSlug}/reviews`,
    { params: { page, per_page: perPage } },
  );
  return response.data;
}

export async function fetchOrderFeedbackStatus(
  orderNumber: string,
): Promise<OrderFeedbackStatus> {
  const response = await api.get<ResourceResponse<OrderFeedbackStatus>>(
    `/account/orders/${orderNumber}/feedback`,
  );
  return response.data.data;
}

export async function submitOrderFeedback(
  orderNumber: string,
  payload: SubmitFeedbackPayload,
): Promise<SubmitFeedbackResult> {
  const response = await api.post<ResourceResponse<SubmitFeedbackResult>>(
    `/account/orders/${orderNumber}/feedback`,
    payload,
  );
  return response.data.data;
}

export interface AdminReviewsFilter {
  page?: number;
  status?: "hidden" | "visible";
  rating?: number;
  product_id?: string;
  q?: string;
  from?: string;
  to?: string;
  per_page?: number;
}

export async function fetchAdminReviews(
  filters: AdminReviewsFilter = {},
): Promise<PaginatedResponse<AdminReviewItem>> {
  const params: Record<string, string | number> = {};

  if (filters.page) {
    params.page = filters.page;
  }
  if (filters.status) {
    params.status = filters.status;
  }
  if (filters.rating) {
    params.rating = filters.rating;
  }
  if (filters.product_id) {
    params.product_id = filters.product_id;
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

  const response = await api.get<PaginatedResponse<AdminReviewItem>>(
    "/admin/reviews",
    { params },
  );
  return response.data;
}

export async function toggleAdminReviewVisibility(
  reviewId: string,
  reason?: string,
): Promise<AdminReviewItem> {
  const response = await api.patch<ResourceResponse<AdminReviewItem>>(
    `/admin/reviews/${reviewId}/toggle-visibility`,
    { ...(reason?.trim() ? { reason: reason.trim() } : {}) },
  );
  return response.data.data;
}
