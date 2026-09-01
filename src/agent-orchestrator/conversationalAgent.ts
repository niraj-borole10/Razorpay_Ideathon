import { catalogService } from '../catalog-engine/catalogService';
import { guardrailEnforcer } from './guardrailPolicy';
import { razorpayService } from '../razorpay-service/razorpayClient';
import { auditEngine } from '../audit-dashboard/auditEngine';
import { Product } from '../catalog-engine/types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  productCard?: {
    sku: string;
    name: string;
    category: string;
    imageUrl: string;
    originalPrice: number;
    discountedPrice: number;
    discountPct: number;
    inStock: boolean;
    variants?: Array<{ id: string; label: string; sku: string; price: number }>;
  };
  comparisonList?: Array<{
    sku: string;
    name: string;
    category: string;
    imageUrl: string;
    priceInr: number;
    discountedPriceInr: number;
    discountPct: number;
    badge?: string;
  }>;
  upsellCard?: {
    title: string;
    sku: string;
    name: string;
    imageUrl: string;
    bundlePriceInr: number;
    savingsInr: number;
  };
  bargainMeter?: {
    originalPrice: number;
    requestedPrice?: number;
    approvedPrice: number;
    requestedDiscountPct?: number;
    approvedDiscountPct: number;
    maxAllowedDiscountPct: number;
    policyBounded: boolean;
  };
  checkoutPayload?: {
    orderId: string;
    amountInr: number;
    amountPaisa: number;
    currency: string;
    keyId: string;
    merchantName: string;
    productName: string;
    sku: string;
    traceId: string;
  };
  receiptPayload?: {
    orderId: string;
    paymentId: string;
    amountInr: number;
    productName: string;
    method: string;
    timestamp: string;
  };
}

export interface ConversationSession {
  sessionId: string;
  customerName: string;
  customerPhone?: string;
  activeSku?: string;
  negotiatedDiscountPct: number;
  negotiatedPriceInr?: number;
  currentIntent: string;
  cart: Array<{ sku: string; quantity: number; unitPrice: number }>;
  history: Array<{ sender: 'user' | 'agent'; text: string }>;
}

export class ConversationalAgent {
  private sessions: Map<string, ConversationSession> = new Map();

  public getSession(sessionId: string): ConversationSession {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        customerName: 'Shopper',
        negotiatedDiscountPct: 0,
        currentIntent: 'GREETING',
        cart: [],
        history: []
      });
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Intelligently resolves the best-matching product from user text across all catalog items
   */
  private matchProductFromText(userMessage: string, activeSku?: string): Product {
    const allProducts = catalogService.getAllProducts();
    const lower = userMessage.toLowerCase().trim();

    // 1. Direct SKU or Variant SKU match
    for (const prod of allProducts) {
      if (lower.includes(prod.sku.toLowerCase()) || lower.includes(prod.id.toLowerCase())) {
        return prod;
      }
      for (const variant of prod.variants) {
        if (lower.includes(variant.sku.toLowerCase()) || lower.includes(variant.id.toLowerCase())) {
          return prod;
        }
      }
    }

    // 2. Exact or significant product name match
    for (const prod of allProducts) {
      if (lower.includes(prod.name.toLowerCase())) {
        return prod;
      }
    }

    // 3. Keyword / Noun Scoring Match
    let bestProduct: Product | undefined;
    let highestScore = 0;

    const stopWords = new Set(['i', 'want', 'to', 'buy', 'the', 'a', 'an', 'for', 'in', 'under', 'at', 'please', 'can', 'you', 'give', 'me', 'discount', 'price', 'checkout', 'now', 'right']);
    const userWords = lower.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

    for (const prod of allProducts) {
      let score = 0;
      const prodNameLower = prod.name.toLowerCase();
      const categoryLower = prod.category.toLowerCase();
      const tags = prod.tags || [];

      for (const word of userWords) {
        if (prodNameLower.includes(word)) score += 5;
        if (categoryLower.includes(word)) score += 3;
        for (const tag of tags) {
          if (tag.toLowerCase().includes(word) || word.includes(tag.toLowerCase())) {
            score += 2;
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestProduct = prod;
      }
    }

    if (bestProduct && highestScore >= 2) {
      return bestProduct;
    }

    // 4. Check active session SKU if set
    if (activeSku) {
      const activeProd = catalogService.getProductBySku(activeSku);
      if (activeProd) return activeProd;
    }

    // 5. Default fallback
    return allProducts[0];
  }

  /**
   * Main conversational intelligence loop:
   * Intent Classifier -> Catalog Context -> Policy Bounding -> Dynamic Response -> In-App Checkout Generator
   */
  public async handleMessage(sessionId: string, userMessage: string, customerName?: string): Promise<{
    message: ChatMessage;
    traceId: string;
    auditLog: any;
  }> {
    const session = this.getSession(sessionId);
    if (customerName) session.customerName = customerName;
    session.history.push({ sender: 'user', text: userMessage });

    const lower = userMessage.toLowerCase().trim();
    
    // 1. Trace initialization
    const trace = auditEngine.startTrace(
      'in_app_chat',
      `Customer_${session.customerName.replace(/\s+/g, '_')}`,
      `Conversational In-App Shopping: "${userMessage.substring(0, 60)}..."`
    );

    auditEngine.addStep(
      trace.traceId,
      'INTENT_PARSING',
      'User Message & Intent Recognition',
      `Received text: "${userMessage}". Analyzing semantic intent, budget constraints, and SKU mentions.`,
      'info',
      { rawMessage: userMessage }
    );

    // Intent Classification
    const isBrowseAll = /all products|catalog|show all|browse|bestsellers|what do you have|everything/i.test(lower) && !/buy|checkout|order/i.test(lower);
    const isComparison = /compare|vs|versus|difference/i.test(lower);
    const isDiscountNegotiation = /discount|deal|offer|bargain|cheap|less|price cut|coupon|negotiate|30%|20%|15%|10%|\d+%\s*off/i.test(lower);
    const isCheckoutIntent = /buy|checkout|order|pay|purchase|proceed|take it|place order/i.test(lower);
    const isUpsellQuery = /upsell|bundle|combo|add-on|accessory|with t-shirt|outfit/i.test(lower);

    // Format 1: Multi-Product Catalog Grid / Comparison
    if (isBrowseAll || isComparison) {
      const allProds = catalogService.getAllProducts();
      auditEngine.addStep(
        trace.traceId,
        'CATALOG_LOOKUP',
        'Multi-Product Catalog Discovery',
        `Retrieved ${allProds.length} products with agent-negotiable discount pricing.`,
        'info'
      );
      auditEngine.finishTrace(trace.traceId, 'BOUNDED_APPROVED');

      const comparisonList = allProds.map(p => {
        const disc = p.discountPolicy.maxAllowedDiscountPct;
        const discounted = Math.round(p.priceInr * (1 - disc / 100));
        return {
          sku: p.sku,
          name: p.name,
          category: p.category,
          imageUrl: p.imageUrl,
          priceInr: p.priceInr,
          discountedPriceInr: discounted,
          discountPct: disc,
          badge: p.rating >= 4.8 ? '🔥 Bestseller' : (p.category === 'Wearables' ? '⚡ Premium' : undefined)
        };
      });

      return {
        message: {
          id: `msg_${Date.now()}`,
          sender: 'agent',
          text: `Here is our full catalog of ${allProds.length} athletic & fitness products! Every item comes with an **automatic conversational discount** up to 15% and **zero-redirect in-app checkout**:`,
          timestamp: new Date().toISOString(),
          suggestedActions: ['Select Nitro 4 Shoes', 'Select Foam Roller', 'Select Resistance Bands', 'Select Shaker Bottle'],
          comparisonList
        },
        traceId: trace.traceId,
        auditLog: auditEngine.getTrace(trace.traceId)
      };
    }

    // 2. Intelligently match target product
    const previousSku = session.activeSku;
    const product = this.matchProductFromText(userMessage, session.activeSku);
    
    // Reset negotiated discount if switching to a completely different product
    if (previousSku && previousSku !== product.sku) {
      session.negotiatedDiscountPct = 0;
      session.negotiatedPriceInr = undefined;
    }
    session.activeSku = product.sku;

    const traceObj = auditEngine.getTrace(trace.traceId);
    if (traceObj) {
      traceObj.sku = product.sku;
      traceObj.productName = product.name;
    }

    auditEngine.addStep(
      trace.traceId,
      'CATALOG_LOOKUP',
      'Catalog Matching & Inventory Lookup',
      `Selected item: ${product.name} (SKU: ${product.sku}). Base price: ₹${product.priceInr}. Inventory: ${product.stock} units.`,
      'info',
      { sku: product.sku, price: product.priceInr, stock: product.stock }
    );

    // Format 2: Upsell / Bundle Combo
    if (isUpsellQuery) {
      const tee = catalogService.getProductBySku('APP-DRY-005') || catalogService.getAllProducts()[4];
      const bundlePrice = (session.negotiatedPriceInr || product.priceInr) + 399;
      const originalCombined = product.priceInr + tee.priceInr;
      const totalSavings = originalCombined - bundlePrice;

      auditEngine.updatePricing(trace.traceId, {
        originalPriceInr: originalCombined,
        approvedDiscountPct: 18,
        finalPriceInr: bundlePrice
      });
      auditEngine.finishTrace(trace.traceId, 'BOUNDED_APPROVED');

      return {
        message: {
          id: `msg_${Date.now()}`,
          sender: 'agent',
          text: `🎯 **Exclusive Bundle Offer!** Pair your **${product.name}** with our **${tee.name}** for maximum performance and save an extra ₹${totalSavings}!`,
          timestamp: new Date().toISOString(),
          suggestedActions: [`Checkout Bundle for ₹${bundlePrice}`, `Just buy ${product.name}`],
          upsellCard: {
            title: 'Fitness Performance Bundle',
            sku: `${product.sku}+${tee.sku}`,
            name: `${product.name} + ${tee.name}`,
            imageUrl: tee.imageUrl,
            bundlePriceInr: bundlePrice,
            savingsInr: totalSavings
          }
        },
        traceId: trace.traceId,
        auditLog: auditEngine.getTrace(trace.traceId)
      };
    }

    // Format 3: Handle Discount Negotiation Intent with Bargain Meter & Variants
    if (isDiscountNegotiation) {
      auditEngine.addStep(
        trace.traceId,
        'DISCOUNT_NEGOTIATION',
        'Dynamic Price Bargaining Engine Triggered',
        `User requested a discount deal. Inspecting merchant margin and discount guardrails.`,
        'info'
      );

      let requestedPct: number | undefined;
      const pctMatch = lower.match(/(\d+)\s*%/);
      if (pctMatch) {
        requestedPct = parseInt(pctMatch[1], 10);
      }

      const priceMatch = lower.match(/(?:give for|give in|sell at|for|at)\s*(?:₹|rs\.?|inr)?\s*(\d{2,5})/i);
      let requestedPriceInr: number | undefined;
      if (priceMatch && !pctMatch) {
        const parsedPrice = parseInt(priceMatch[1], 10);
        if (parsedPrice < product.priceInr) {
          requestedPriceInr = parsedPrice;
        }
      }

      if (requestedPct === undefined && requestedPriceInr === undefined) {
        requestedPct = 20;
      }

      const guardrailResult = guardrailEnforcer.evaluatePriceProposal(
        trace.traceId,
        product,
        requestedPriceInr,
        requestedPct,
        1
      );

      session.negotiatedDiscountPct = guardrailResult.approvedDiscountPct;
      session.negotiatedPriceInr = guardrailResult.approvedPriceInr;

      auditEngine.updatePricing(trace.traceId, {
        originalPriceInr: product.priceInr,
        requestedDiscountPct: requestedPct,
        requestedPriceInr,
        approvedDiscountPct: guardrailResult.approvedDiscountPct,
        finalPriceInr: guardrailResult.approvedPriceInr
      });

      let replyText = '';
      if (guardrailResult.policyBreachAttempted) {
        replyText = `I hear you! While I can't do **${requestedPct || 'that requested'}%** (our hard guardrail ceiling is 15%), I have unlocked our maximum authorized **${guardrailResult.approvedDiscountPct}% discount**! \n\nPrice adjusted from **₹${product.priceInr}** to **₹${guardrailResult.approvedPriceInr}** (You save ₹${product.priceInr - guardrailResult.approvedPriceInr}). Select your variant and checkout below:`;
      } else {
        replyText = `Great news! I have approved a **${guardrailResult.approvedDiscountPct}% discount** for the **${product.name}**. \n\nSpecial price: **₹${guardrailResult.approvedPriceInr}** (Regular: ₹${product.priceInr}). Ready to checkout?`;
      }

      auditEngine.finishTrace(trace.traceId, 'BOUNDED_APPROVED');

      const responseMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toISOString(),
        suggestedActions: [`Buy Now for ₹${guardrailResult.approvedPriceInr}`, 'Add Workout Tee (Bundle)', 'Show All Products'],
        productCard: {
          sku: product.sku,
          name: product.name,
          category: product.category,
          imageUrl: product.imageUrl,
          originalPrice: product.priceInr,
          discountedPrice: guardrailResult.approvedPriceInr,
          discountPct: guardrailResult.approvedDiscountPct,
          inStock: product.stock > 0,
          variants: product.variants.map(v => ({
            id: v.id,
            label: v.name,
            sku: v.sku,
            price: guardrailResult.approvedPriceInr
          }))
        },
        bargainMeter: {
          originalPrice: product.priceInr,
          requestedPrice: requestedPriceInr,
          requestedDiscountPct: requestedPct,
          approvedPrice: guardrailResult.approvedPriceInr,
          approvedDiscountPct: guardrailResult.approvedDiscountPct,
          maxAllowedDiscountPct: product.discountPolicy.maxAllowedDiscountPct,
          policyBounded: guardrailResult.policyBreachAttempted
        }
      };

      return {
        message: responseMessage,
        traceId: trace.traceId,
        auditLog: auditEngine.getTrace(trace.traceId)
      };
    }

    // Format 4: Handle Direct Buy / Checkout Intent (Zero-Redirect Order Card)
    if (isCheckoutIntent) {
      const finalPrice = session.negotiatedPriceInr || product.priceInr;
      const discountPct = session.negotiatedDiscountPct || 0;

      auditEngine.updatePricing(trace.traceId, {
        originalPriceInr: product.priceInr,
        approvedDiscountPct: discountPct,
        finalPriceInr: finalPrice
      });

      auditEngine.addStep(
        trace.traceId,
        'RAZORPAY_EXECUTION',
        'Initiating In-App Zero-Redirect Checkout',
        `Generating Razorpay Test Mode Order for ${product.name} (SKU: ${product.sku}) at ₹${finalPrice}. Zero external redirect required.`,
        'info'
      );

      const rzpOrder = await razorpayService.createOrder({
        traceId: trace.traceId,
        amountInr: finalPrice,
        notes: {
          sku: product.sku,
          product_name: product.name,
          customer_name: session.customerName,
          channel: 'in_app_chat'
        }
      });

      auditEngine.finishTrace(trace.traceId, 'ORDER_CREATED');

      const responseMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        text: `Here is your zero-redirect checkout payload for **${product.name}** at **₹${finalPrice}**! Click "Authorize ₹${finalPrice} via Razorpay" below to complete payment directly inside this chat window without leaving.`,
        timestamp: new Date().toISOString(),
        suggestedActions: ['Test Failure & Fallback', 'Show All Products'],
        productCard: {
          sku: product.sku,
          name: product.name,
          category: product.category,
          imageUrl: product.imageUrl,
          originalPrice: product.priceInr,
          discountedPrice: finalPrice,
          discountPct,
          inStock: product.stock > 0,
          variants: product.variants.map(v => ({
            id: v.id,
            label: v.name,
            sku: v.sku,
            price: finalPrice
          }))
        },
        checkoutPayload: {
          orderId: rzpOrder.orderId,
          amountInr: rzpOrder.amountInr,
          amountPaisa: rzpOrder.amountPaisa,
          currency: rzpOrder.currency,
          keyId: rzpOrder.keyId,
          merchantName: rzpOrder.merchantName,
          productName: product.name,
          sku: product.sku,
          traceId: trace.traceId
        }
      };

      return {
        message: responseMessage,
        traceId: trace.traceId,
        auditLog: auditEngine.getTrace(trace.traceId)
      };
    }

    // Format 5: Discovery / Default Recommendation Card
    const defaultDiscountPct = 10;
    const initialDiscountPrice = Math.round(product.priceInr * (1 - defaultDiscountPct / 100));

    session.negotiatedDiscountPct = defaultDiscountPct;
    session.negotiatedPriceInr = initialDiscountPrice;

    auditEngine.updatePricing(trace.traceId, {
      originalPriceInr: product.priceInr,
      approvedDiscountPct: defaultDiscountPct,
      finalPriceInr: initialDiscountPrice
    });

    auditEngine.finishTrace(trace.traceId, 'BOUNDED_APPROVED');

    const defaultResponse: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `I recommend our popular **${product.name}** (${product.category})! \n\n${product.description}\n\nI can offer you an instant **10% discount** at **₹${initialDiscountPrice}** (Regular: ₹${product.priceInr}).`,
      timestamp: new Date().toISOString(),
      suggestedActions: [`Buy for ₹${initialDiscountPrice}`, 'Can I get 20% off?', 'Show All Products'],
      productCard: {
        sku: product.sku,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        originalPrice: product.priceInr,
        discountedPrice: initialDiscountPrice,
        discountPct: defaultDiscountPct,
        inStock: product.stock > 0,
        variants: product.variants.map(v => ({
          id: v.id,
          label: v.name,
          sku: v.sku,
          price: initialDiscountPrice
        }))
      }
    };

    return {
      message: defaultResponse,
      traceId: trace.traceId,
      auditLog: auditEngine.getTrace(trace.traceId)
    };
  }
}

export const conversationalAgent = new ConversationalAgent();
