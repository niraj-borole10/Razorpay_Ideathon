import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  jwtSecret: string;
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
    merchantName: string;
    merchantDescription: string;
  };
  guardrails: {
    maxAllowedDiscountPct: number;
    maxTransactionLimitInr: number;
    minMarginFloorPct: number;
    expirationTimeMinutes: number;
    velocityLimitPerMinute: number;
  };
  mockRazorpayMode: boolean;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shopstore',
  jwtSecret: process.env.JWT_SECRET || 'shopstore_jwt_super_secret_key_2026_agentic',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_AgentCommerce123',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_AgentCommerceKey99',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_whsec_agentic_test_secret',
    merchantName: 'ShopStore (Razorpay Agentic Merchant)',
    merchantDescription: 'Agentic Commerce & In-App Conversational Store'
  },
  guardrails: {
    maxAllowedDiscountPct: parseFloat(process.env.MAX_ALLOWED_DISCOUNT_PERCENTAGE || '15'),
    maxTransactionLimitInr: parseFloat(process.env.MAX_TRANSACTION_LIMIT_INR || '100000'),
    minMarginFloorPct: parseFloat(process.env.MIN_MARGIN_FLOOR_PERCENTAGE || '20'),
    expirationTimeMinutes: parseInt(process.env.EXPIRATION_TIME_MINUTES || '15', 10),
    velocityLimitPerMinute: 30
  },
  mockRazorpayMode: process.env.MOCK_RAZORPAY_MODE === 'true' || 
    !process.env.RAZORPAY_KEY_ID || 
    process.env.RAZORPAY_KEY_ID.includes('YourKeyIdHere') ||
    process.env.RAZORPAY_KEY_ID.includes('AgentCommerce')
};
