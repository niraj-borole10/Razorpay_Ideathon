export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  size?: string;
  color?: string;
  priceInr: number;
  stock: number;
}

export interface DiscountPolicy {
  maxAllowedDiscountPct: number;
  minOrderQuantityForBulk?: number;
  bulkDiscountPct?: number;
  allowAgentNegotiation: boolean;
  couponCodesAllowed?: string[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'Footwear' | 'Wearables' | 'Apparel' | 'Accessories';
  description: string;
  tags: string[];
  priceInr: number;
  costPriceInr: number;
  currency: string;
  stock: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  variants: ProductVariant[];
  discountPolicy: DiscountPolicy;
}

export interface AP2ProductManifest {
  sku: string;
  product_id: string;
  title: string;
  category: string;
  currency: string;
  unit_price: number;
  unit_price_paisa: number;
  in_stock: boolean;
  inventory_level: number;
  specifications: {
    description: string;
    tags: string[];
    variants_available: Array<{
      variant_id: string;
      sku: string;
      label: string;
      stock: number;
      price: number;
    }>;
  };
  agent_negotiation_rules: {
    negotiation_enabled: boolean;
    max_negotiated_discount_pct: number;
    floor_price_inr: number;
    volume_discounts: Array<{
      min_quantity: number;
      discount_pct: number;
    }>;
  };
  payment_methods_supported: string[];
  checkout_endpoints: {
    quote: string;
    transact: string;
    in_app_intent: string;
  };
}

export interface AP2CatalogResponse {
  protocol_version: 'AP2/1.0' | 'ACP/2.0' | 'UAP/1.0';
  merchant_id: string;
  merchant_name: string;
  catalog_timestamp: string;
  supported_currencies: string[];
  total_products: number;
  payment_provider: 'Razorpay';
  sandbox_mode: boolean;
  products: AP2ProductManifest[];
  guardrails: {
    max_discount_cap_pct: number;
    max_order_limit_inr: number;
    quote_validity_seconds: number;
  };
}
