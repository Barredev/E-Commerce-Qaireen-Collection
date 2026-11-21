import { api } from "./client";

import type {
  MessageResponse,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/types/api";
import type {
  InventoryStock,
  InventoryStockQuery,
  StockAdjustmentPayload,
  StockMovement,
  StockMovementQuery,
  StockReceipt,
  StockReceiptPayload,
  StockReceiptQuery,
  Warehouse,
  WarehousePayload,
  WarehouseQuery,
} from "@/lib/types/inventory";

export interface InventoryVariantLookup {
  id: string;
  sku: string;
  size: string;
  color: string;
  label: string;
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export async function fetchInventoryWarehouses(
  query: WarehouseQuery = {},
): Promise<PaginatedResponse<Warehouse>> {
  const { data } = await api.get<PaginatedResponse<Warehouse>>(
    "/admin/inventory/warehouses",
    { params: query },
  );

  return data;
}

export async function fetchInventoryVariants(query: {
  q?: string;
  per_page?: number;
} = {}): Promise<InventoryVariantLookup[]> {
  const { data } = await api.get<{ data: InventoryVariantLookup[] }>(
    "/admin/inventory/variants",
    { params: query },
  );

  return data.data;
}

export async function fetchWarehouses(
  query: WarehouseQuery = {},
): Promise<PaginatedResponse<Warehouse>> {
  const { data } = await api.get<PaginatedResponse<Warehouse>>(
    "/admin/warehouses",
    { params: query },
  );

  return data;
}

export async function fetchWarehouse(id: string): Promise<Warehouse> {
  const { data } = await api.get<ResourceResponse<Warehouse>>(
    `/admin/warehouses/${id}`,
  );

  return data.data;
}

export async function createWarehouse(
  payload: WarehousePayload,
): Promise<Warehouse> {
  const { data } = await api.post<ResourceResponse<Warehouse>>(
    "/admin/warehouses",
    payload,
  );

  return data.data;
}

export async function updateWarehouse(
  id: string,
  payload: Partial<WarehousePayload>,
): Promise<Warehouse> {
  const { data } = await api.put<ResourceResponse<Warehouse>>(
    `/admin/warehouses/${id}`,
    payload,
  );

  return data.data;
}

export async function deleteWarehouse(id: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(
    `/admin/warehouses/${id}`,
  );

  return data;
}

export async function setDefaultWarehouse(id: string): Promise<Warehouse> {
  const { data } = await api.put<ResourceResponse<Warehouse>>(
    `/admin/warehouses/${id}/default`,
  );

  return data.data;
}

export async function fetchInventoryStocks(
  query: InventoryStockQuery = {},
): Promise<PaginatedResponse<InventoryStock>> {
  const { data } = await api.get<PaginatedResponse<InventoryStock>>(
    "/admin/inventory/stocks",
    { params: query },
  );

  return data;
}

export async function fetchStockMovements(
  query: StockMovementQuery = {},
): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await api.get<PaginatedResponse<StockMovement>>(
    "/admin/inventory/movements",
    { params: query },
  );

  return data;
}

export async function fetchStockReceipts(
  query: StockReceiptQuery = {},
): Promise<PaginatedResponse<StockReceipt>> {
  const { data } = await api.get<PaginatedResponse<StockReceipt>>(
    "/admin/inventory/receipts",
    { params: query },
  );

  return data;
}

export async function fetchStockReceipt(id: string): Promise<StockReceipt> {
  const { data } = await api.get<ResourceResponse<StockReceipt>>(
    `/admin/inventory/receipts/${id}`,
  );

  return data.data;
}

export async function createStockReceipt(
  payload: StockReceiptPayload,
): Promise<StockReceipt> {
  const { data } = await api.post<ResourceResponse<StockReceipt>>(
    "/admin/inventory/receipts",
    payload,
  );

  return data.data;
}

export async function updateStockReceipt(
  id: string,
  payload: Partial<StockReceiptPayload>,
): Promise<StockReceipt> {
  const { data } = await api.put<ResourceResponse<StockReceipt>>(
    `/admin/inventory/receipts/${id}`,
    payload,
  );

  return data.data;
}

export async function confirmStockReceipt(id: string): Promise<StockReceipt> {
  const { data } = await api.put<ResourceResponse<StockReceipt>>(
    `/admin/inventory/receipts/${id}/confirm`,
  );

  return data.data;
}

export async function cancelStockReceipt(id: string): Promise<StockReceipt> {
  const { data } = await api.put<ResourceResponse<StockReceipt>>(
    `/admin/inventory/receipts/${id}/cancel`,
  );

  return data.data;
}

export async function createStockAdjustment(
  payload: StockAdjustmentPayload,
): Promise<StockMovement> {
  const { data } = await api.post<ResourceResponse<StockMovement>>(
    "/admin/inventory/adjustments",
    payload,
  );

  return data.data;
}
