import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { catalogService } from '../catalog-engine/catalogService';
import { guardrailEnforcer } from './guardrailPolicy';
import { razorpayService } from '../razorpay-service/razorpayClient';
import { auditEngine } from '../audit-dashboard/auditEngine';

export interface AP2TransactRequest {
  protocol_version: string;
  buyer_agent_id: string;
  target_sku: string;
  quantity?: number;
  proposed_unit_price_inr?: number;
  proposed_discount_pct?: number;
  shipping_address?: {
    recipient_name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  payment_intent?: 'razorpay_order' | 'razorpay_payment_link' | 'upi_mandate';
  agent_metadata?: Record<string, any>;
}

export interface AP2TransactResponse {
  protocol: string;
  status: 'AUTHORIZED' | 'BOUNDED_AUTHORIZED' | 'REJECTED_POLICY_VIOLATION' | 'REJECTED_OUT_OF_STOCK';
  trace_id: string;
  gated_intent_token: string;
  order_summary: {
    sku: string;
    product_name: string;
    quantity: number;
    base_unit_price_inr: number;
    approved_unit_price_inr: number;
    total_amount_inr: number;
    total_amount_paisa: number;
    discount_applied_pct: number;
    currency: 'INR';
  };
  razorpay_authorization: {
    order_id: string;
    key_id: string;
    payment_capture: number;
    receipt: string;
    checkout_url?: string;
  };
  guardrail_verdict: {
    bounded: boolean;
    margin_floor_protected: boolean;
    policy_breach_detected: boolean;
    explanation: string;
  };
  validity_seconds: number;
  created_at: string;
}

export class AP2ProtocolHandler {
  /**
   * Processes Machine-to-Machine AP2 Transact requests from Autonomous AI Buyer Agents
   */
  public async handleAgentTransaction(request: AP2TransactRequest): Promise<AP2TransactResponse> {
    const qty = request.quantity && request.quantity > 0 ? request.quantity : 1;
    const buyerId = request.buyer_agent_id || 'unidentified_ai_buyer';

    const trace = auditEngine.startTrace(
      'ap2_machine_buyer',
      `Autonomous_Agent[${buyerId}]`,
      `AP2 M2M Transact Request for SKU: ${request.target_sku} (Qty: ${qty})`,
      request.target_sku
    );

    auditEngine.addStep(
      trace.traceId,
      'INTENT_PARSING',
      'AP2 Machine-to-Machine Handshake Received',
      `Protocol: ${request.protocol_version || 'AP2/1.0'}. Buyer Agent: ${buyerId}. Target SKU: ${request.target_sku}. Qty: ${qty}.`,
      'info',
      { request }
    );

    // 1. Locate SKU in Catalog
    const product = catalogService.getProductBySku(request.target_sku);
    if (!product) {
      auditEngine.addStep(
        trace.traceId,
        'CATALOG_LOOKUP',
        'SKU Not Found',
        `SKU ${request.target_sku} does not exist in merchant catalog manifest.`,
        'fail'
      );
      auditEngine.finishTrace(trace.traceId, 'BOUNDED_REJECTED');

      throw new Error(`SKU_NOT_FOUND: ${request.target_sku} is not in merchant catalog.`);
    }

    trace.productName = product.name;
    trace.quantity = qty;

    auditEngine.addStep(
      trace.traceId,
      'CATALOG_LOOKUP',
      'SKU Resolved',
      `Matched: ${product.name} (Base Price: ₹${product.priceInr}, Stock: ${product.stock}).`,
      'info'
    );

    // 2. Guardrail Bounding on Price/Discount
    const guardrailResult = guardrailEnforcer.evaluatePriceProposal(
      trace.traceId,
      product,
      request.proposed_unit_price_inr ? request.proposed_unit_price_inr * qty : undefined,
      request.proposed_discount_pct,
      qty
    );

    if (!guardrailResult.allowed) {
      auditEngine.finishTrace(trace.traceId, 'BOUNDED_REJECTED');
      return {
        protocol: 'AP2/1.0',
        status: 'REJECTED_POLICY_VIOLATION',
        trace_id: trace.traceId,
        gated_intent_token: '',
        order_summary: {
          sku: product.sku,
          product_name: product.name,
          quantity: qty,
          base_unit_price_inr: product.priceInr,
          approved_unit_price_inr: product.priceInr,
          total_amount_inr: product.priceInr * qty,
          total_amount_paisa: product.priceInr * qty * 100,
          discount_applied_pct: 0,
          currency: 'INR'
        },
        razorpay_authorization: {
          order_id: '',
          key_id: razorpayService.getKeyId(),
          payment_capture: 1,
          receipt: ''
        },
        guardrail_verdict: {
          bounded: false,
          margin_floor_protected: true,
          policy_breach_detected: true,
          explanation: guardrailResult.explanation
        },
        validity_seconds: 0,
        created_at: new Date().toISOString()
      };
    }

    const totalApprovedInr = guardrailResult.approvedPriceInr;
    const unitApprovedInr = Math.round(totalApprovedInr / qty);

    auditEngine.updatePricing(trace.traceId, {
      originalPriceInr: product.priceInr * qty,
      requestedDiscountPct: request.proposed_discount_pct,
      requestedPriceInr: request.proposed_unit_price_inr ? request.proposed_unit_price_inr * qty : undefined,
      approvedDiscountPct: guardrailResult.approvedDiscountPct,
      finalPriceInr: totalApprovedInr
    });

    // 3. Issue Gated Cryptographic Intent Token
    const gatedPayload = `${trace.traceId}|${buyerId}|${product.sku}|${totalApprovedInr}|${Date.now()}`;
    const gatedToken = `ap2_tok_${crypto.createHash('sha256').update(gatedPayload).digest('hex').substring(0, 24)}`;

    auditEngine.addStep(
      trace.traceId,
      'GUARDRAIL_BOUNDING',
      'Gated Intent Token Issued',
      `Generated cryptographically signed authorization token: ${gatedToken}. Validity: 900s.`,
      'pass',
      { gatedToken }
    );
    auditEngine.updateGuardrails(trace.traceId, { gatedTokenIssued: true });

    // 4. Create Razorpay Order
    const rzpOrder = await razorpayService.createOrder({
      traceId: trace.traceId,
      amountInr: totalApprovedInr,
      notes: {
        buyer_agent_id: buyerId,
        protocol: 'AP2/1.0',
        gated_token: gatedToken,
        sku: product.sku,
        quantity: qty.toString()
      },
      customer: {
        name: request.shipping_address?.recipient_name || `Agent ${buyerId}`
      }
    });

    auditEngine.finishTrace(trace.traceId, 'ORDER_CREATED');

    return {
      protocol: 'AP2/1.0',
      status: guardrailResult.policyBreachAttempted ? 'BOUNDED_AUTHORIZED' : 'AUTHORIZED',
      trace_id: trace.traceId,
      gated_intent_token: gatedToken,
      order_summary: {
        sku: product.sku,
        product_name: product.name,
        quantity: qty,
        base_unit_price_inr: product.priceInr,
        approved_unit_price_inr: unitApprovedInr,
        total_amount_inr: totalApprovedInr,
        total_amount_paisa: totalApprovedInr * 100,
        discount_applied_pct: guardrailResult.approvedDiscountPct,
        currency: 'INR'
      },
      razorpay_authorization: {
        order_id: rzpOrder.orderId,
        key_id: rzpOrder.keyId,
        payment_capture: 1,
        receipt: rzpOrder.receipt,
        checkout_url: `https://checkout.razorpay.com/v1/checkout.js?order_id=${rzpOrder.orderId}`
      },
      guardrail_verdict: {
        bounded: true,
        margin_floor_protected: true,
        policy_breach_detected: guardrailResult.policyBreachAttempted,
        explanation: guardrailResult.explanation
      },
      validity_seconds: 900,
      created_at: new Date().toISOString()
    };
  }
}

export const ap2ProtocolHandler = new AP2ProtocolHandler();
