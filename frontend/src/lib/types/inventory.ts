export type ReceiptSourceType =
  | "production"
  | "purchase"
  | "return"
  | "transfer_in";

export type ReceiptStatus = "draft" | "confirmed" | "cancelled";

export type StockCondition = "good" | "damaged";

export type MovementType =
  | "receipt"
  | "sale"
  | "return_in"
  | "adjustment"
  | "transfer_out"
  | "transfer_in";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  is_active: boolean;
  is_default: boolean;
  stocks_count?: number;
  created_at: string | null;
}

export interface WarehouseQuery {
  q?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface WarehousePayload {
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

export interface StockVariantSummary {
  id: string;
  sku: string;
  size: string;
  color: string;
  label: string;
  price?: number;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: { id: string; name: string } | null;
  } | null;
}

export interface InventoryStock {
  id: string;
  variant_id: string;
  warehouse?: Warehouse;
  variant?: StockVariantSummary;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  updated_at: string | null;
}

export interface InventoryStockQuery {
  warehouse_id?: string;
  low_stock?: boolean;
  q?: string;
  page?: number;
  per_page?: number;
}

export interface StockReceiptItem {
  id: string;
  variant_id: string;
  sku?: string;
  variant_label?: string;
  product_name?: string | null;
  quantity: number;
  unit_cost: number | null;
  condition: StockCondition | null;
  condition_label: string | null;
  notes: string | null;
}

export interface StockReceipt {
  id: string;
  receipt_number: string;
  status: ReceiptStatus | null;
  status_label: string | null;
  source_type: ReceiptSourceType | null;
  source_type_label: string | null;
  warehouse?: Warehouse;
  received_by: string | null;
  receiver?: { id: string; name: string } | null;
  received_at: string | null;
  notes: string | null;
  items_count?: number;
  total_quantity?: number;
  items?: StockReceiptItem[];
  created_at: string | null;
}

export interface StockReceiptQuery {
  status?: ReceiptStatus;
  source_type?: ReceiptSourceType;
  warehouse_id?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface StockReceiptItemPayload {
  variant_id: string;
  quantity: number;
  unit_cost?: number | null;
  condition?: StockCondition;
  notes?: string | null;
}

export interface StockReceiptPayload {
  warehouse_id: string;
  source_type: ReceiptSourceType;
  received_at?: string | null;
  notes?: string | null;
  items: StockReceiptItemPayload[];
}

export interface StockMovement {
  id: string;
  movement_type: MovementType | null;
  movement_type_label: string | null;
  quantity: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  warehouse?: Warehouse;
  variant?: {
    id: string;
    sku: string;
    label: string;
    product_name: string | null;
  };
  author?: { id: string; name: string } | null;
  created_at: string | null;
}

export interface StockMovementQuery {
  variant_id?: string;
  warehouse_id?: string;
  movement_type?: MovementType;
  reference_type?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface StockAdjustmentPayload {
  variant_id: string;
  warehouse_id: string;
  new_quantity: number;
  low_stock_threshold?: number | null;
  notes: string;
}
