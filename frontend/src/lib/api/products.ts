import { api } from "./client";

import type { MessageResponse, PaginatedResponse, ResourceResponse } from "@/lib/types/api";
import type {
  Product,
  ProductDetail,
  ProductImagePayload,
  ProductPayload,
  ProductQuery,
  ProductVariant,
  ProductVariantPayload,
} from "@/lib/types/product";

export interface AdminProductQuery {
  q?: string;
  brand_id?: string;
  category_id?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export async function fetchProducts(
  query: ProductQuery = {},
): Promise<PaginatedResponse<Product>> {
  const { data } = await api.get<PaginatedResponse<Product>>("/products", {
    params: query,
  });

  return data;
}

export async function fetchProduct(slug: string): Promise<ProductDetail> {
  const { data } = await api.get<ResourceResponse<ProductDetail>>(
    `/products/${slug}`,
  );

  return data.data;
}

export async function fetchAdminProducts(
  query: AdminProductQuery = {},
): Promise<PaginatedResponse<Product>> {
  const { data } = await api.get<PaginatedResponse<Product>>("/admin/products", {
    params: query,
  });

  return data;
}

export async function fetchAdminProduct(id: string): Promise<ProductDetail> {
  const { data } = await api.get<ResourceResponse<ProductDetail>>(
    `/admin/products/${id}`,
  );

  return data.data;
}

export async function createProduct(
  payload: ProductPayload,
): Promise<ProductDetail> {
  const { data } = await api.post<ResourceResponse<ProductDetail>>(
    "/admin/products",
    payload,
  );

  return data.data;
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>,
): Promise<ProductDetail> {
  const { data } = await api.put<ResourceResponse<ProductDetail>>(
    `/admin/products/${id}`,
    payload,
  );

  return data.data;
}

export async function deleteProduct(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/admin/products/${id}`);

  return data;
}

export async function createVariant(
  productId: string,
  payload: ProductVariantPayload,
): Promise<ProductVariant> {
  const { data } = await api.post<ResourceResponse<ProductVariant>>(
    `/admin/products/${productId}/variants`,
    payload,
  );

  return data.data;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  payload: Partial<ProductVariantPayload>,
): Promise<ProductVariant> {
  const { data } = await api.put<ResourceResponse<ProductVariant>>(
    `/admin/products/${productId}/variants/${variantId}`,
    payload,
  );

  return data.data;
}

export async function deleteVariant(
  productId: string,
  variantId: string,
): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(
    `/admin/products/${productId}/variants/${variantId}`,
  );

  return data;
}

export async function createProductImage(
  productId: string,
  payload: ProductImagePayload | FormData,
): Promise<void> {
  await api.post(`/admin/products/${productId}/images`, payload);
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(
    `/admin/products/${productId}/images/${imageId}`,
  );

  return data;
}

export async function reorderProductImages(
  productId: string,
  images: { id: string; sort_order: number }[],
): Promise<void> {
  await api.put(`/admin/products/${productId}/images/reorder`, { images });
}
