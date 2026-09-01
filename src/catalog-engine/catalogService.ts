import { merchantCatalog } from './catalogData';
import { Product, AP2ProductManifest, AP2CatalogResponse } from './types';
import { config } from '../config';

export class CatalogService {
  private products: Product[] = [...merchantCatalog];

  public getAllProducts(): Product[] {
    return this.products;
  }

  public getProductBySku(sku: string): Product | undefined {
    return this.products.find(
      p => p.sku.toLowerCase() === sku.toLowerCase() ||
           p.variants.some(v => v.sku.toLowerCase() === sku.toLowerCase())
    );
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  public addProduct(product: Omit<Product, 'id'> & { id?: string }): Product {
    const newProduct: Product = {
      ...product,
      id: product.id || `prod_${Date.now()}`,
      currency: product.currency || 'INR',
      rating: product.rating || 5.0,
      reviewCount: product.reviewCount || 1,
      variants: product.variants || [],
      discountPolicy: product.discountPolicy || {
        maxAllowedDiscountPct: 15,
        allowAgentNegotiation: true
      }
    };
    this.products.unshift(newProduct);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.products.findIndex(p => p.id === id || p.sku === id);
    if (index === -1) return null;

    this.products[index] = {
      ...this.products[index],
      ...updates
    };
    return this.products[index];
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.products.length;
    this.products = this.products.filter(p => p.id !== id && p.sku !== id);
    return this.products.length < initialLen;
  }

  public searchProducts(query: string, maxPrice?: number): Product[] {
    const q = query.toLowerCase().trim();
    return this.products.filter(product => {
      const matchesText = 
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.tags.some(tag => tag.toLowerCase().includes(q));

      const matchesPrice = maxPrice ? product.priceInr <= maxPrice : true;
      return matchesText && matchesPrice;
    });
  }

  public updateStock(sku: string, quantityDeduction: number): boolean {
    for (const product of this.products) {
      if (product.sku.toLowerCase() === sku.toLowerCase()) {
        if (product.stock >= quantityDeduction) {
          product.stock -= quantityDeduction;
          return true;
        }
        return false;
      }
      const variant = product.variants.find(v => v.sku.toLowerCase() === sku.toLowerCase());
      if (variant) {
        if (variant.stock >= quantityDeduction && product.stock >= quantityDeduction) {
          variant.stock -= quantityDeduction;
          product.stock -= quantityDeduction;
          return true;
        }
        return false;
      }
    }
    return false;
  }

  public updateProductDiscountPolicy(sku: string, maxDiscountPct: number): boolean {
    const product = this.getProductBySku(sku);
    if (product) {
      product.discountPolicy.maxAllowedDiscountPct = Math.min(
        maxDiscountPct,
        config.guardrails.maxAllowedDiscountPct
      );
      return true;
    }
    return false;
  }

  /**
   * Generates AP2 (Agent Payment Protocol) & ACP (Agent Commerce Protocol) compliant manifest
   */
  public generateAP2Manifest(baseUrl: string = ''): AP2CatalogResponse {
    const ap2Products: AP2ProductManifest[] = this.products.map(product => {
      const floorPrice = Math.max(
        product.costPriceInr * (1 + config.guardrails.minMarginFloorPct / 100),
        product.priceInr * (1 - (product.discountPolicy.maxAllowedDiscountPct / 100))
      );

      return {
        sku: product.sku,
        product_id: product.id,
        title: product.name,
        category: product.category,
        currency: product.currency,
        unit_price: product.priceInr,
        unit_price_paisa: product.priceInr * 100,
        in_stock: product.stock > 0,
        inventory_level: product.stock,
        specifications: {
          description: product.description,
          tags: product.tags,
          variants_available: product.variants.map(v => ({
            variant_id: v.id,
            sku: v.sku,
            label: v.name,
            stock: v.stock,
            price: v.priceInr
          }))
        },
        agent_negotiation_rules: {
          negotiation_enabled: product.discountPolicy.allowAgentNegotiation,
          max_negotiated_discount_pct: product.discountPolicy.maxAllowedDiscountPct,
          floor_price_inr: Math.round(floorPrice),
          volume_discounts: [
            {
              min_quantity: product.discountPolicy.minOrderQuantityForBulk || 3,
              discount_pct: product.discountPolicy.bulkDiscountPct || 10
            }
          ]
        },
        payment_methods_supported: ['upi_intent', 'upi_collect', 'card', 'netbanking', 'wallet'],
        checkout_endpoints: {
          quote: `${baseUrl}/api/v1/agent/pricing/quote`,
          transact: `${baseUrl}/api/v1/agent/transact`,
          in_app_intent: `${baseUrl}/api/v1/agent/conversational/chat`
        }
      };
    });

    return {
      protocol_version: 'AP2/1.0',
      merchant_id: 'rzp_merch_aeropulse_01',
      merchant_name: config.razorpay.merchantName,
      catalog_timestamp: new Date().toISOString(),
      supported_currencies: ['INR'],
      total_products: ap2Products.length,
      payment_provider: 'Razorpay',
      sandbox_mode: config.mockRazorpayMode,
      products: ap2Products,
      guardrails: {
        max_discount_cap_pct: config.guardrails.maxAllowedDiscountPct,
        max_order_limit_inr: config.guardrails.maxTransactionLimitInr,
        quote_validity_seconds: config.guardrails.expirationTimeMinutes * 60
      }
    };
  }
}

export const catalogService = new CatalogService();
