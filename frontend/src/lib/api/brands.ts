import { api } from "./client";

import type { Brand } from "@/lib/types/brand";
import type { MessageResponse, PaginatedResponse, ResourceResponse } from "@/lib/types/api";

export interface AdminBrandQuery {
  q?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface BrandPayload {
  name: string;
  slug?: string | null;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
  meta_title?: string | null;
  meta_description?: string | null;
}

export async function fetchAdminBrands(
  query: AdminBrandQuery = {},
): Promise<PaginatedResponse<Brand>> {
  const { data } = await api.get<PaginatedResponse<Brand>>("/admin/brands", {
    params: query,
  });

  return data;
}

export async function fetchAdminBrand(id: string): Promise<Brand> {
  const { data } = await api.get<ResourceResponse<Brand>>(`/admin/brands/${id}`);

  return data.data;
}

export async function createBrand(payload: BrandPayload): Promise<Brand> {
  const { data } = await api.post<ResourceResponse<Brand>>(
    "/admin/brands",
    payload,
  );

  return data.data;
}

export async function updateBrand(
  id: string,
  payload: Partial<BrandPayload>,
): Promise<Brand> {
  const { data } = await api.put<ResourceResponse<Brand>>(
    `/admin/brands/${id}`,
    payload,
  );

  return data.data;
}

export async function deleteBrand(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/admin/brands/${id}`);

  return data;
}
