import { OrderModel, IOrder } from '../models/Order';
import { isMongoConnected } from '../db/connection';

// In-memory fallback order storage for resilience
const fallbackOrders: IOrder[] = [];

export interface CreateOrderParams {
  orderId: string;
  paymentId?: string;
  traceId?: string;
  userId: string;
  username: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  item: string;
  sku: string;
  category?: string;
  imageUrl?: string;
  amount: number;
  originalPrice: number;
  discount?: number;
  quantity?: number;
  status?: 'Created' | 'Paid' | 'Processing' | 'Shipped' | 'Delivered' | 'Failed' | 'Refunded';
  channel?: string;
  channelType?: 'chat' | 'm2m' | 'direct';
  trackingNumber?: string;
  estDelivery?: string;
  metadata?: Record<string, any>;
}

export class OrderService {
  /**
   * Seed baseline orders for default users
   */
  public async seedInitialOrders(): Promise<void> {
    const seedData: CreateOrderParams[] = [
      {
        orderId: 'order_TVTwhK3sDGMmhY',
        paymentId: 'pay_TVTx8823kdL99',
        traceId: 'trc_seed_01',
        userId: 'cust_rahul',
        username: 'rahul',
        customerName: 'Rahul Sharma',
        customerEmail: 'rahul.sharma@example.com',
        customerAddress: '42 MG Road, Indiranagar, Bengaluru 560038',
        item: 'FlexiBand Heavy-Duty Resistance Loop Bands (Set of 5)',
        sku: 'ACC-BND-009',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&auto=format&fit=crop&q=80',
        amount: 349,
        originalPrice: 349,
        discount: 10,
        quantity: 1,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat',
        trackingNumber: 'BLUEDART-849204',
        estDelivery: 'Arriving Tuesday by 8:00 PM'
      },
      {
        orderId: 'order_TVTj8942kmQqq2',
        paymentId: 'pay_TVTk9183884ff',
        traceId: 'trc_seed_02',
        userId: 'cust_vikram',
        username: 'vikram',
        customerName: 'Vikram Mehta',
        customerEmail: 'v.mehta@corp.in',
        customerAddress: '77 Cyber City, Phase 2, Gurugram 122002',
        item: 'DeepTissue High-Density Foam Muscle Roller',
        sku: 'ACC-ROL-013',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
        amount: 549,
        originalPrice: 549,
        discount: 15,
        quantity: 1,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat',
        trackingNumber: 'DELHIVERY-992384',
        estDelivery: 'Dispatched • In Transit'
      },
      {
        orderId: 'order_TVTm39922nSyy4',
        paymentId: 'pay_TVTn8472911bb',
        traceId: 'trc_seed_03',
        userId: 'cust_sneha',
        username: 'sneha',
        customerName: 'Sneha Kapur',
        customerEmail: 'sneha.k@example.com',
        customerAddress: '18 Bandra West, Mumbai 400050',
        item: 'ShopStore Pro Carbon Fiber Tennis Racket (300g)',
        sku: 'EQP-RAC-003',
        category: 'Equipment',
        imageUrl: 'https://images.unsplash.com/photo-1617083934555-563630985c40?w=600&auto=format&fit=crop&q=80',
        amount: 2069,
        originalPrice: 2299,
        discount: 10,
        quantity: 1,
        status: 'Paid',
        channel: 'AP2 Autonomous AI Buyer',
        channelType: 'm2m',
        trackingNumber: 'BLUEDART-551029',
        estDelivery: 'Delivered • Signed by Recipient'
      },
      {
        orderId: 'order_TVTk49911mPxx5',
        paymentId: 'pay_TVTl7729900aa',
        traceId: 'trc_seed_04',
        userId: 'cust_aditi',
        username: 'aditi',
        customerName: 'Aditi Roy',
        customerEmail: 'aditi.roy@gmail.com',
        customerAddress: '12 Alipore Road, Kolkata 700027',
        item: 'HydroFlow 1L Insulated Stainless Steel Sports Bottle',
        sku: 'ACC-BOT-007',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
        amount: 629,
        originalPrice: 699,
        discount: 10,
        quantity: 1,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat',
        trackingNumber: 'EKART-482019',
        estDelivery: 'Arriving Tomorrow by 1:00 PM'
      }
    ];

    for (const item of seedData) {
      if (isMongoConnected()) {
        try {
          const exists = await OrderModel.findOne({ orderId: item.orderId });
          if (!exists) {
            await OrderModel.create(item);
          }
        } catch (e) {}
      }

      if (!fallbackOrders.find(o => o.orderId === item.orderId)) {
        fallbackOrders.push(item as any);
      }
    }
  }

  /**
   * Save or update an order
   */
  public async saveOrder(params: CreateOrderParams): Promise<any> {
    if (isMongoConnected()) {
      try {
        const existing = await OrderModel.findOne({ orderId: params.orderId });
        if (existing) {
          Object.assign(existing, params);
          return await existing.save();
        } else {
          return await OrderModel.create(params);
        }
      } catch (e: any) {
        console.warn(`[OrderService] MongoDB write fallback: ${e.message}`);
      }
    }

    const index = fallbackOrders.findIndex(o => o.orderId === params.orderId);
    if (index >= 0) {
      fallbackOrders[index] = { ...fallbackOrders[index], ...params } as any;
      return fallbackOrders[index];
    } else {
      const newOrder = {
        ...params,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      fallbackOrders.unshift(newOrder);
      return newOrder;
    }
  }

  /**
   * Update order status upon payment verification
   */
  public async updateOrderStatus(
    orderId: string,
    paymentId: string,
    status: IOrder['status'] = 'Paid'
  ): Promise<any> {
    if (isMongoConnected()) {
      try {
        const order = await OrderModel.findOne({
          $or: [{ orderId }, { traceId: orderId }]
        });
        if (order) {
          order.paymentId = paymentId;
          order.status = status;
          await order.save();
          return order;
        }
      } catch (e) {}
    }

    const fb = fallbackOrders.find(o => o.orderId === orderId || o.traceId === orderId);
    if (fb) {
      fb.paymentId = paymentId;
      fb.status = status;
      return fb;
    }
    return null;
  }

  /**
   * Get orders for a specific user
   */
  public async getOrdersForUser(userIdOrUsername: string): Promise<any[]> {
    const clean = userIdOrUsername.toLowerCase().trim();

    if (isMongoConnected()) {
      try {
        const orders = await OrderModel.find({
          $or: [
            { userId: clean },
            { userId: `cust_${clean}` },
            { username: clean }
          ]
        }).sort({ createdAt: -1 });

        if (orders && orders.length > 0) {
          return orders;
        }
      } catch (e) {}
    }

    // Query fallback memory
    return fallbackOrders.filter(o => 
      o.userId?.toLowerCase() === clean ||
      o.userId?.toLowerCase() === `cust_${clean}` ||
      o.username?.toLowerCase() === clean
    );
  }

  /**
   * Get all orders (for admin/analytics)
   */
  public async getAllOrders(): Promise<any[]> {
    if (isMongoConnected()) {
      try {
        const orders = await OrderModel.find({}).sort({ createdAt: -1 });
        if (orders && orders.length > 0) {
          return orders;
        }
      } catch (e) {}
    }

    return fallbackOrders;
  }
}

export const orderService = new OrderService();
