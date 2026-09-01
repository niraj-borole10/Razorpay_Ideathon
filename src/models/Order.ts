import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IOrder extends Document {
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
  discount: number;
  quantity: number;
  status: 'Created' | 'Paid' | 'Processing' | 'Shipped' | 'Delivered' | 'Failed' | 'Refunded';
  channel: string;
  channelType: 'chat' | 'm2m' | 'direct';
  trackingNumber: string;
  estDelivery: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema<IOrder> = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    paymentId: {
      type: String,
      default: null,
      index: true
    },
    traceId: {
      type: String,
      default: null,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true
    },
    customerEmail: {
      type: String,
      default: ''
    },
    customerAddress: {
      type: String,
      default: '101 Residency Road, Central District, Bengaluru 560025'
    },
    item: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'General'
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'
    },
    amount: {
      type: Number,
      required: true
    },
    originalPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['Created', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Failed', 'Refunded'],
      default: 'Created',
      index: true
    },
    channel: {
      type: String,
      default: 'In-App Conversational Checkout'
    },
    channelType: {
      type: String,
      enum: ['chat', 'm2m', 'direct'],
      default: 'chat'
    },
    trackingNumber: {
      type: String,
      default: () => `BLUEDART-${Math.floor(100000 + Math.random() * 900000)}`
    },
    estDelivery: {
      type: String,
      default: 'Estimated Delivery in 2 Business Days'
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    bufferCommands: false
  }
);

// Compound index for querying user orders quickly by creation date
OrderSchema.index({ userId: 1, createdAt: -1 });

export const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
