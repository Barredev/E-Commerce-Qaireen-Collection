import type { PaginatedResponse } from "./api";
import type { Product } from "./product";

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  products_count?: number;
  children?: Category[];
  created_at: string | null;
}

export interface CategoryDetailResponse {
  data: Category;
  products: PaginatedResponse<Product>;
}
