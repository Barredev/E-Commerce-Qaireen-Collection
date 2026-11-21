export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  sort_order: number;
  products_count?: number;
  meta_title?: string | null;
  meta_description?: string | null;
  created_at: string | null;
}
