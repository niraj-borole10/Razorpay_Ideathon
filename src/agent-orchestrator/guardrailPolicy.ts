import { config } from '../config';
import { Product } from '../catalog-engine/types';
import { auditEngine } from '../audit-dashboard/auditEngine';

export interface GuardrailEvaluationResult {
  allowed: boolean;
  originalPrice: number;
  approvedDiscountPct: number;
  approvedPriceInr: number;
  policyBreachAttempted: boolean;
  breachReason?: string;
  explanation: string;
}

export class GuardrailPolicyEnforcer {
  /**
   * Strictly bounds any proposed price or discount percentage within merchant & system safety bounds
   */
  public evaluatePriceProposal(
    traceId: string,
    product: Product,
    proposedPriceInr?: number,
    proposedDiscountPct?: number,
    quantity: number = 1
  ): GuardrailEvaluationResult {
    const originalPrice = product.priceInr * quantity;
    const maxAllowedDiscountPct = Math.min(
      product.discountPolicy.maxAllowedDiscountPct,
      config.guardrails.maxAllowedDiscountPct
    );

    // Floor price based on minimum profit margin
    const minUnitFloor = Math.max(
      product.costPriceInr * (1 + config.guardrails.minMarginFloorPct / 100),
      product.priceInr * (1 - maxAllowedDiscountPct / 100)
    );
    const minTotalFloor = Math.round(minUnitFloor * quantity);

    let effectiveDiscountPct = 0;
    let effectiveProposedPrice = originalPrice;

    if (proposedDiscountPct !== undefined) {
      effectiveDiscountPct = proposedDiscountPct;
      effectiveProposedPrice = Math.round(originalPrice * (1 - proposedDiscountPct / 100));
    } else if (proposedPriceInr !== undefined) {
      effectiveProposedPrice = proposedPriceInr;
      effectiveDiscountPct = ((originalPrice - proposedPriceInr) / originalPrice) * 100;
    }

    auditEngine.addStep(
      traceId,
      'GUARDRAIL_BOUNDING',
      'Policy Bounding Verification',
      `Evaluating requested price ₹${effectiveProposedPrice} (${effectiveDiscountPct.toFixed(1)}% off) against max allowed ${maxAllowedDiscountPct}% and margin floor ₹${minTotalFloor}.`,
      'info',
      {
        originalPrice,
        effectiveProposedPrice,
        maxAllowedDiscountPct,
        minTotalFloor
      }
    );

    let policyBreachAttempted = false;
    let breachReason = '';
    let approvedDiscountPct = effectiveDiscountPct;
    let approvedPriceInr = effectiveProposedPrice;

    // Check 1: Exceeding max discount
    if (effectiveDiscountPct > maxAllowedDiscountPct) {
      policyBreachAttempted = true;
      breachReason = `Requested discount ${effectiveDiscountPct.toFixed(1)}% exceeds hard guardrail cap of ${maxAllowedDiscountPct}%.`;
      approvedDiscountPct = maxAllowedDiscountPct;
      approvedPriceInr = Math.round(originalPrice * (1 - maxAllowedDiscountPct / 100));

      auditEngine.addStep(
        traceId,
        'GUARDRAIL_BOUNDING',
        'Discount Capped by Policy Enforcer',
        `Guardrail triggered: ${breachReason} Automatically bounded to maximum permissible ${maxAllowedDiscountPct}% (₹${approvedPriceInr}).`,
        'warn',
        { requestedPct: effectiveDiscountPct, cappedPct: maxAllowedDiscountPct }
      );
    }

    // Check 2: Minimum margin floor breach
    if (approvedPriceInr < minTotalFloor) {
      policyBreachAttempted = true;
      breachReason = `Proposed price ₹${approvedPriceInr} drops below margin floor ₹${minTotalFloor}.`;
      approvedPriceInr = minTotalFloor;
      approvedDiscountPct = ((originalPrice - approvedPriceInr) / originalPrice) * 100;

      auditEngine.addStep(
        traceId,
        'GUARDRAIL_BOUNDING',
        'Margin Floor Defense Active',
        `Guardrail triggered: ${breachReason} Clamped to merchant floor price ₹${minTotalFloor}.`,
        'warn',
        { minTotalFloor, finalApproved: approvedPriceInr }
      );
    }

    // Check 3: Max transaction ceiling
    if (approvedPriceInr > config.guardrails.maxTransactionLimitInr) {
      auditEngine.addStep(
        traceId,
        'GUARDRAIL_BOUNDING',
        'Transaction Limit Exceeded',
        `Transaction amount ₹${approvedPriceInr} exceeds security ceiling ₹${config.guardrails.maxTransactionLimitInr}.`,
        'fail'
      );
      auditEngine.updateGuardrails(traceId, { transactionLimitPassed: false });
      return {
        allowed: false,
        originalPrice,
        approvedDiscountPct: 0,
        approvedPriceInr: originalPrice,
        policyBreachAttempted: true,
        breachReason: `Amount exceeds transaction ceiling ₹${config.guardrails.maxTransactionLimitInr}`,
        explanation: 'Transaction aborted due to security ceiling violation.'
      };
    }

    // Check 4: Stock availability
    const isStockAvailable = product.stock >= quantity;
    if (!isStockAvailable) {
      auditEngine.addStep(
        traceId,
        'GUARDRAIL_BOUNDING',
        'Stock Verification Failed',
        `Requested ${quantity} units of ${product.sku}, but current available inventory is ${product.stock}.`,
        'fail'
      );
      auditEngine.updateGuardrails(traceId, { stockAvailable: false });
      return {
        allowed: false,
        originalPrice,
        approvedDiscountPct: 0,
        approvedPriceInr: originalPrice,
        policyBreachAttempted: false,
        breachReason: `Insufficient inventory (${product.stock} available)`,
        explanation: 'Item is currently out of stock for the requested quantity.'
      };
    }

    auditEngine.updateGuardrails(traceId, {
      maxDiscountBounded: true,
      marginFloorMaintained: true,
      stockAvailable: true,
      transactionLimitPassed: true,
      policyBreachPrevented: policyBreachAttempted
    });

    auditEngine.addStep(
      traceId,
      'GUARDRAIL_BOUNDING',
      'Guardrail Bounding Passed',
      `All 4 security bounding checks verified: Max Discount <= ${maxAllowedDiscountPct}%, Margin Floor >= ₹${minTotalFloor}, Stock Verified (${product.stock} avail), Ceilings Passed. Approved price: ₹${approvedPriceInr}.`,
      'pass'
    );

    return {
      allowed: true,
      originalPrice,
      approvedDiscountPct: Math.round(approvedDiscountPct * 10) / 10,
      approvedPriceInr,
      policyBreachAttempted,
      breachReason,
      explanation: policyBreachAttempted
        ? `I can't offer that large a cut, but I have bounded the price to our maximum authorized discount of ${approvedDiscountPct.toFixed(0)}% (₹${approvedPriceInr}).`
        : `Approved price of ₹${approvedPriceInr} with ${approvedDiscountPct.toFixed(0)}% discount.`
    };
  }
}

export const guardrailEnforcer = new GuardrailPolicyEnforcer();
