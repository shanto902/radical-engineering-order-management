import { readItems, readItem, updateItem } from '@directus/sdk';
import { directus } from './directus';
import { APP_CONFIG } from '../constants/config';
import { Order, OrderStatus, FilterStatus, ExtraCharge } from '../types';

export const ORDER_FIELDS = [
  'id',
  'order_id',
  'name',
  'phone',
  'address',
  'status',
  'total',
  'placed_at',
  'date_created',
  'date_updated',
  'extra_charges',
  'order_items.id',
  'order_items.quantity',
  'order_items.product.id',
  'order_items.product.name',
  'order_items.product.price',
  'order_items.product.discounted_price',
  'order_items.product.image',
  'order_items.product.sku',
] as const;

export interface FetchOrdersParams {
  status?: FilterStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export const ordersApi = {
  /**
   * Fetch orders list with optional status filter, search, pagination
   */
  async getOrders(params?: FetchOrdersParams): Promise<Order[]> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    const filterConditions: any[] = [];

    // Filter by status if not 'all'
    if (params?.status && params.status !== 'all') {
      filterConditions.push({ status: { _eq: params.status } });
    }

    // Search query by order_id, customer name, or phone number
    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      filterConditions.push({
        _or: [
          { order_id: { _icontains: q } },
          { name: { _icontains: q } },
          { phone: { _icontains: q } },
        ],
      });
    }

    const filter =
      filterConditions.length === 1
        ? filterConditions[0]
        : filterConditions.length > 1
        ? { _and: filterConditions }
        : {};

    try {
      const result = await directus.request(
        readItems('orders' as any, {
          filter,
          sort: ['-placed_at', '-date_created'],
          limit,
          offset,
          fields: ORDER_FIELDS as any,
        })
      );

      return (result as unknown as Order[]) || [];
    } catch (err) {
      console.warn('Directus SDK fetch orders failed, trying REST fallback:', err);
      // REST fallback
      return await this.fetchOrdersRest(filter, limit, offset);
    }
  },

  /**
   * Fetch single order by ID
   */
  async getOrderById(id: string): Promise<Order | null> {
    try {
      const result = await directus.request(
        readItem('orders' as any, id, {
          fields: ORDER_FIELDS as any,
        })
      );
      return (result as unknown as Order) || null;
    } catch (err) {
      console.warn(`Directus SDK getOrderById (${id}) error:`, err);
      return null;
    }
  },

  /**
   * Update status of an order (e.g. pending -> confirmed -> shipped)
   */
  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const result = await directus.request(
      updateItem('orders' as any, orderId, {
        status,
      } as any)
    );
    return result as unknown as Order;
  },

  /**
   * Update extra charges and recalculated total
   */
  async updateExtraCharges(
    orderId: string,
    extraCharges: ExtraCharge[],
    newTotal: number
  ): Promise<Order> {
    const result = await directus.request(
      updateItem('orders' as any, orderId, {
        extra_charges: extraCharges,
        total: Math.round(newTotal * 100) / 100,
      } as any)
    );
    return result as unknown as Order;
  },

  /**
   * Poll for latest orders created after a timestamp
   */
  async getNewOrdersSince(sinceTimestamp: string): Promise<Order[]> {
    try {
      const result = await directus.request(
        readItems('orders' as any, {
          filter: {
            _or: [
              { placed_at: { _gt: sinceTimestamp } },
              { date_created: { _gt: sinceTimestamp } },
            ],
          },
          sort: ['-placed_at'],
          limit: 10,
          fields: ORDER_FIELDS as any,
        })
      );
      return (result as unknown as Order[]) || [];
    } catch (err) {
      console.warn('Error polling new orders:', err);
      return [];
    }
  },

  /**
   * Direct REST fallback in case of SDK transport hiccup
   */
  async fetchOrdersRest(
    filter: any,
    limit: number,
    offset: number
  ): Promise<Order[]> {
    try {
      const url = new URL(`${APP_CONFIG.apiBaseUrl}/items/orders`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('sort', '-placed_at,-date_created');
      url.searchParams.set('fields', ORDER_FIELDS.join(','));
      if (Object.keys(filter).length > 0) {
        url.searchParams.set('filter', JSON.stringify(filter));
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${APP_CONFIG.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const json = await response.json();
        return (json.data as Order[]) || [];
      }
    } catch (restErr) {
      console.error('REST fallback failed:', restErr);
    }
    return [];
  },
};
