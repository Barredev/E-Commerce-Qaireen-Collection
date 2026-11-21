export interface OverviewReport {
  total_revenue: number;
  total_subtotal: number;
  total_discounts: number;
  total_orders: number;
  total_physical_units: number;
  total_reserved_units: number;
  low_stock_count: number;
}

export interface DailySalesTrend {
  date: string;
  orders_count: number;
  revenue: number;
  discounts: number;
}

export interface OrderStatusBreakdown {
  status: string;
  label: string;
  count: number;
  total_amount: number;
}

export interface SalesReport {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_discounts: number;
  orders_count: number;
  average_order_value: number;
  daily_trend: DailySalesTrend[];
  status_breakdown: OrderStatusBreakdown[];
}

export interface WarehouseStockSummary {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
  variants_count: number;
}

export interface LowStockItem {
  id: string;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  warehouse_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  threshold: number;
}

export interface InventoryReport {
  total_units_on_hand: number;
  total_units_available: number;
  total_units_reserved: number;
  by_warehouse: WarehouseStockSummary[];
  low_stock_items: LowStockItem[];
}
