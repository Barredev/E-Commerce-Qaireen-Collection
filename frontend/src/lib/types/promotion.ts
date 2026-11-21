export type PromotionType = "percentage" | "fixed_amount" | "free_shipping";

export type PromotionAppliesTo = "all" | "category" | "product";

export type DiscountBearer = "platform" | "shared";

export interface Promotion {
  id: string;
  name: string;
  code: string;
  type: PromotionType;
  type_label: string;
  value: number;
  min_purchase: number | null;
  max_discount: number | null;
  applies_to: PromotionAppliesTo;
  applies_to_label: string;
  applicable_ids: string[] | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  discount_bearer: DiscountBearer;
  discount_bearer_label: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PromotionPayload {
  name: string;
  code: string;
  type: PromotionType;
  value: number;
  min_purchase?: number | null;
  max_discount?: number | null;
  applies_to: PromotionAppliesTo;
  applicable_ids?: string[] | null;
  discount_bearer: DiscountBearer;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  description?: string | null;
}

/**
 * Hasil validasi kupon saat checkout, dikembalikan oleh
 * `POST /api/v1/checkout/apply-coupon`.
 */
export interface CouponApplicationResult {
  id: string;
  name: string;
  code: string;
  type: PromotionType;
  type_label: string;
  value: number;
  discount_amount: number;
  discount_bearer: DiscountBearer;
  discount_bearer_label: string;
  is_free_shipping: boolean;
  message: string;
}
