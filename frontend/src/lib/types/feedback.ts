export type SizeFit = "too_small" | "fit" | "too_large";

export interface ReviewVariant {
  size: string | null;
  color: string | null;
}

export interface ReviewProduct {
  id: string;
  name: string;
  slug: string;
}

export interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  material_rating: number | null;
  size_fit: SizeFit | null;
  size_fit_label: string | null;
  buyer_name: string | null;
  variant: ReviewVariant;
  product: ReviewProduct | null;
  created_at: string | null;
}

export interface ProductReviewSummary {
  total_reviews: number;
  average_rating: number | null;
  rating_distribution: Record<string, number>;
  material_total: number;
  material_average: number | null;
  fit_total: number;
  fit_distribution: Record<SizeFit, number>;
}

export interface OrderFeedback {
  id: string;
  shipping_rating: number | null;
  service_rating: number | null;
  comment: string | null;
  created_at: string | null;
}

export interface OrderFeedbackItem {
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  variant_size: string;
  variant_color: string;
  quantity: number;
  review: ProductReview | null;
}

export interface OrderFeedbackStatus {
  order_number: string;
  status: string;
  can_review: boolean;
  message: string | null;
  items: OrderFeedbackItem[];
  order_feedback: OrderFeedback | null;
}

export interface SubmitReviewPayload {
  order_item_id: string;
  rating: number;
  comment?: string | null;
  material_rating?: number | null;
  size_fit?: SizeFit | null;
}

export interface SubmitOrderFeedbackPayload {
  shipping_rating?: number | null;
  service_rating?: number | null;
  comment?: string | null;
}

export interface SubmitFeedbackPayload {
  reviews: SubmitReviewPayload[];
  order_feedback?: SubmitOrderFeedbackPayload | null;
}

export interface SubmitFeedbackResult {
  reviews: ProductReview[];
  order_feedback: OrderFeedback | null;
}

export interface AdminReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  material_rating: number | null;
  size_fit: SizeFit | null;
  size_fit_label: string | null;
  is_hidden: boolean;
  hidden_at: string | null;
  hidden_reason: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  product: ReviewProduct | null;
  order_number: string | null;
  variant: ReviewVariant;
  created_at: string | null;
}
