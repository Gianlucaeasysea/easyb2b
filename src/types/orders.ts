export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_pct: number | null;
  subtotal: number;
  products?: { name: string; sku: string | null } | null;
}

export interface OrderDocument {
  id: string;
  file_name: string;
  file_path: string;
  doc_type: string;
  created_at: string;
}

export type OrderStatusValue = 'draft' | 'submitted' | 'confirmed' | 'processing' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export interface Order {
  id: string;
  client_id: string;
  status: OrderStatusValue | null;
  total_amount: number | null;
  notes: string | null;
  created_at: string;
  order_code: string | null;
  order_type: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  payment_status: string | null;
  payment_terms: string | null;
  payment_due_date: string | null;
  payed_date: string | null;
  shipping_cost_client: number | null;
  shipping_cost_easysea: number | null;
  internal_notes: string | null;
  delivery_date: string | null;
  pickup_date: string | null;
  updated_at: string;
  order_items?: OrderItem[];
  order_documents?: OrderDocument[];
}

export interface DraftItem extends OrderItem {
  name: string;
  sku: string;
}

export interface PriceCheckItem {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  originalPrice: number;
  currentPrice: number | null;
  available: boolean;
}

export interface PriceCheckData {
  order: Order;
  items: PriceCheckItem[];
  originalTotal: number;
  newTotal: number;
  hasChanges: boolean;
}
