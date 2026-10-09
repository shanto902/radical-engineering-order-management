export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type FilterStatus = 'all' | OrderStatus;

export interface Product {
  id: string;
  name: string;
  price?: string | number;
  discounted_price?: string | number | null;
  image?: string | null;
  sku?: string | null;
  category?: number | string | null;
}

export interface OrderItem {
  id: string;
  order?: string;
  quantity: number;
  product?: Product | null;
}

export interface ExtraCharge {
  name: string;
  cost: string | number;
}

export interface Order {
  id: string;
  order_id: string;
  name: string;
  phone: string;
  address: string;
  status: OrderStatus;
  total: number | string;
  placed_at: string;
  date_created?: string;
  date_updated?: string | null;
  extra_charges?: ExtraCharge[] | null;
  order_items?: OrderItem[];
}

export interface StatusConfig {
  key: OrderStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export interface OrderSummaryMetrics {
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  processingCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;
}
