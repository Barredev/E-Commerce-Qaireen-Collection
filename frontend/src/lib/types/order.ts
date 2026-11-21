export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded"
  | "expired";

export type ShipmentStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "returned";

export interface CartItemVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  color_hex: string | null;
  label: string;
  price: number;
}

export interface CartItemProductBrand {
  id: string;
  name: string;
  slug: string;
}

export interface CartItemProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  brand: CartItemProductBrand | null;
}

export interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  variant: CartItemVariant | null;
  product: CartItemProduct | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  items_count: number;
  subtotal: number;
  updated_at: string | null;
}

export interface Address {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  district: string | null;
  city: string;
  province: string;
  postal_code: string;
  rajaongkir_destination_id: string | null;
  is_default: boolean;
}

export interface AddressPayload {
  label?: string | null;
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string | null;
  district?: string | null;
  city: string;
  province: string;
  postal_code: string;
  rajaongkir_destination_id?: string | null;
  is_default?: boolean;
}

export interface ShippingDestination {
  id: string;
  name: string;
  province: string;
  type?: string;
}

export interface ShippingQuote {
  code: string;
  name: string;
  service: string;
  description: string;
  cost: number;
  etd: string | null;
}

export interface ShippingQuoteResult {
  destination_id: string;
  weight_grams: number;
  is_simulated: boolean;
  couriers: ShippingQuote[];
}

export interface ShippingDestinationResult {
  destinations: ShippingDestination[];
  is_simulated: boolean;
}

export interface OrderItem {
  id: string;
  order_id?: string;
  variant_id: string;
  brand_id: string;
  product_id?: string | null;
  product_slug?: string | null;
  product_name: string;
  variant_sku: string;
  variant_size: string;
  variant_color: string;
  brand_name: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  line_total: number;
  created_at?: string;
  order?: {
    id?: string;
    order_number?: string;
    status?: string;
    status_label?: string;
    completed_at?: string | null;
  } | null;
}

export interface Payment {
  id: string;
  payment_method: string;
  payment_gateway: string | null;
  gateway_transaction_id?: string | null;
  amount: number;
  status: PaymentStatus;
  status_label: string;
  paid_at: string | null;
  expired_at: string | null;
}

export interface ShipmentTrackingEntry {
  status: ShipmentStatus | null;
  description: string;
  occurred_at: string | null;
}

export interface Shipment {
  id: string;
  courier_code: string;
  courier_name: string;
  courier_service: string;
  tracking_number: string | null;
  shipping_cost: number;
  status: ShipmentStatus;
  status_label: string;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery: string | null;
  tracking_history: ShipmentTrackingEntry[];
  last_tracked_at: string | null;
}

export interface OrderCourier {
  code: string | null;
  name: string | null;
  service: string | null;
}

export interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface OrderShipping {
  name: string;
  phone: string;
  address: string;
  district: string | null;
  city: string;
  province: string;
  postal_code: string;
}

export interface OrderAllowedTransition {
  value: OrderStatus;
  label: string;
}

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "received"
  | "refunded"
  | "cancelled";

export type ReturnReason =
  | "wrong_item"
  | "damaged"
  | "not_as_described"
  | "size_mismatch"
  | "changed_mind"
  | "other";

export type RefundMethod =
  | "bank_transfer"
  | "ewallet"
  | "store_credit"
  | "original_payment";

export type StockCondition = "good" | "damaged";

export interface ReturnItem {
  id: string;
  order_item_id: string;
  product_name: string | null;
  variant_sku: string | null;
  quantity: number;
  condition: StockCondition | null;
  condition_label: string | null;
  is_restocked: boolean;
  refund_amount: number;
  reason: string | null;
  notes: string | null;
}

export interface ReturnCustomer {
  id: string;
  name: string;
  email: string;
}

export interface ReturnActor {
  id: string;
  name: string;
}

export interface OrderReturn {
  id: string;
  return_number: string;
  order_id: string;
  order_number?: string | null;
  status: ReturnStatus;
  status_label: string;
  reason_category: ReturnReason;
  reason_category_label: string;
  reason: string;
  resolution: string | null;
  notes: string | null;
  refund_amount: number;
  refund_method: RefundMethod | null;
  refund_method_label: string | null;
  refund_reference: string | null;
  requested_at: string | null;
  approved_at: string | null;
  received_at: string | null;
  refunded_at: string | null;
  customer?: ReturnCustomer | null;
  approved_by?: ReturnActor | null;
  verified_by?: ReturnActor | null;
  items?: ReturnItem[];
  created_at: string | null;
}

export interface StoreReturnItemPayload {
  order_item_id: string;
  quantity: number;
  reason?: string | null;
}

export interface StoreReturnPayload {
  reason_category: ReturnReason;
  reason: string;
  notes?: string | null;
  items: StoreReturnItemPayload[];
}

export interface ReceiveReturnLinePayload {
  id: string;
  quantity: number;
  condition: StockCondition;
  notes?: string | null;
}

export interface RefundReturnPayload {
  refund_method: RefundMethod;
  refund_reference?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  status_label: string;
  allowed_transitions: OrderAllowedTransition[];
  subtotal: number;
  discount_total: number;
  shipping_cost: number;
  tax_amount: number;
  grand_total: number;
  coupon_code: string | null;
  courier: OrderCourier | null;
  shipping_destination_id: string | null;
  shipping: OrderShipping;
  billing_name: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  customer?: OrderCustomer | null;
  items: OrderItem[];
  payments?: Payment[];
  shipments?: Shipment[];
  returns?: OrderReturn[];
  created_at: string | null;
}

export interface CheckoutPayload {
  address_id?: string | null;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_district?: string | null;
  shipping_city?: string;
  shipping_province?: string;
  shipping_postal_code?: string;
  shipping_destination_id?: string | null;
  courier_code?: string | null;
  courier_service?: string | null;
  payment_method: "bank_transfer" | "cod" | "ewallet";
  coupon_code?: string | null;
  notes?: string | null;
}

export interface ShipOrderPayload {
  courier_code?: string;
  courier_name?: string;
  courier_service?: string;
  tracking_number?: string | null;
  shipping_cost?: number | null;
  estimated_delivery?: string | null;
}
