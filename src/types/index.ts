export interface DirectusUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  avatar?: string | null;
  role?: { id?: string; name?: string } | string | null;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type FilterStatus = "all" | OrderStatus;

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
  last_updated_by?: DirectusUser | any | null;
  extra_charges?: ExtraCharge[] | null;
  order_items?: OrderItem[];
}

/**
 * Returns formatted "Firstname Lastname" of the admin/staff who changed the status.
 * Gracefully handles variations in Directus user fields.
 */
export const getOrderUpdaterName = (
  updater?: DirectusUser | any | null
): string | null => {
  if (!updater) return null;
  if (typeof updater === 'string') return null;
  const first = (updater.first_name || updater.firstname || updater.firstName || '').trim();
  const last = (updater.last_name || updater.lastname || updater.lastName || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ');
  if (fullName) return fullName;
  if (updater.name) return String(updater.name).trim();
  if (updater.email) return String(updater.email).split('@')[0];
  return null;
};

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
