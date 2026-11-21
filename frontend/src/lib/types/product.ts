import type { Brand } from "./brand";
import type { Category } from "./category";

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  color_hex: string | null;
  price: number;
  weight_grams: number;
  is_active: boolean;
  label: string;
}

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  variant_id: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface SizeGuide {
  id: string;
  size_label: string;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  length_cm: number | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: Brand | null;
  category?: Category | null;
  base_price: number;
  price_min: number;
  price_max: number;
  is_active: boolean;
  is_featured: boolean;
  thumbnail: string | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
  published_at: string | null;
  created_at: string | null;
}

export interface ProductDetail extends Product {
  description: string | null;
  material: string | null;
  care_instructions: string | null;
  meta_title: string | null;
  meta_description: string | null;
  size_guides: SizeGuide[];
}

export type ProductSort = "price_asc" | "price_desc" | "name" | "newest";

export interface ProductQuery {
  q?: string;
  category?: string;
  size?: string;
  color?: string;
  min_price?: number | string;
  max_price?: number | string;
  featured?: boolean;
  sort?: ProductSort;
  page?: number;
  per_page?: number;
}

export interface ProductVariantPayload {
  sku: string;
  size: string;
  color: string;
  color_hex?: string | null;
  price: number;
  weight_grams?: number;
  is_active?: boolean;
}

export interface ProductImagePayload {
  image_url: string;
  alt_text?: string | null;
  variant_id?: string | null;
  sort_order?: number;
  is_primary?: boolean;
}

export interface ProductPayload {
  /** Opsional: server mengisi otomatis dari identitas toko tunggal. */
  brand_id?: string;
  category_id?: string | null;
  name: string;
  slug?: string | null;
  description?: string | null;
  material?: string | null;
  care_instructions?: string | null;
  base_price: number;
  is_active?: boolean;
  is_featured?: boolean;
  published_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  variants?: ProductVariantPayload[];
  images?: ProductImagePayload[];
}
