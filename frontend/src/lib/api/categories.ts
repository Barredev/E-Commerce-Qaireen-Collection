import { api } from "./client";

import type {
  Category,
  CategoryDetailResponse,
} from "@/lib/types/category";
import type {
  MessageResponse,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/types/api";

export interface AdminCategoryQuery {
  q?: string;
  is_active?: boolean;
  tree?: boolean;
  page?: number;
  per_page?: number;
}

export interface CategoryPayload {
  parent_id?: string | null;
  name: string;
  slug?: string | null;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export async function fetchCategoryTree(): Promise<Category[]> {
  const { data } = await api.get<{ data: Category[] }>("/categories");

  return data.data;
}

export async function fetchCategory(
  slug: string,
  page = 1,
): Promise<CategoryDetailResponse> {
  const { data } = await api.get<CategoryDetailResponse>(
    `/categories/${slug}`,
    { params: { page } },
  );

  return data;
}

export async function fetchAdminCategories(
  query: AdminCategoryQuery = {},
): Promise<PaginatedResponse<Category>> {
  const { data } = await api.get<PaginatedResponse<Category>>(
    "/admin/categories",
    { params: query },
  );

  return data;
}

export async function fetchAdminCategoryTree(): Promise<Category[]> {
  const { data } = await api.get<{ data: Category[] }>("/admin/categories", {
    params: { tree: 1 },
  });

  return data.data;
}

export async function fetchAdminCategory(id: string): Promise<Category> {
  const { data } = await api.get<ResourceResponse<Category>>(
    `/admin/categories/${id}`,
  );

  return data.data;
}

export async function createCategory(
  payload: CategoryPayload,
): Promise<Category> {
  const { data } = await api.post<ResourceResponse<Category>>(
    "/admin/categories",
    payload,
  );

  return data.data;
}

export async function updateCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<Category> {
  const { data } = await api.put<ResourceResponse<Category>>(
    `/admin/categories/${id}`,
    payload,
  );

  return data.data;
}

export async function deleteCategory(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/admin/categories/${id}`);

  return data;
}
