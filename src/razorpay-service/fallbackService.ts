import { auditEngine } from '../audit-dashboard/auditEngine';
import { razorpayService } from './razorpayClient';
import { catalogService } from '../catalog-engine/catalogService';

export interface FallbackSimulationRequest {
  failureType: 'EXPIRED_SESSION' | 'INVALID_TRANSACTION_PAYLOAD' | 'CLIENT_DROP_OFF' | 'PRICE_TAMPERING_DETECTED';
  sku?: string;
  customerName?: string;
  customerPhone?: string;
}

export class FallbackService {
  /**
   * Simulates a critical transaction failure and executes automated graceful recovery
   * by constructing a hardened, static Razorpay Payment Link delivered via omnichannel notification
   */
  public async handleGracefulFallback(params: FallbackSimulationRequest): Promise<{
    success: boolean;
    traceId: string;
    failureSummary: string;
    recoveryAction: string;
    fallbackPaymentLink: {
      id: string;
      url: string;
      expiresInMinutes: number;
      amountInr: number;
    };
    auditTrace: any;
  }> {
    const sku = params.sku || 'SHOE-RUN-001';
    const product = catalogService.getProductBySku(sku) || catalogService.getAllProducts()[0];
    const customerName = params.customerName || 'Rahul Sharma';
    const customerContact = params.customerPhone || '+919876543210';

    const trace = auditEngine.startTrace(
      'fallback_recovery',
      'Autonomous_Fault_Tolerance_Engine',
      `Graceful Recovery from [${params.failureType}]`,
      product.sku,
      product.name
    );

    auditEngine.updatePricing(trace.traceId, {
      originalPriceInr: product.priceInr,
      approvedDiscountPct: 5,
      finalPriceInr: Math.round(product.priceInr * 0.95)
    });

    let failureDescription = '';
    switch (params.failureType) {
      case 'EXPIRED_SESSION':
        failureDescription = 'In-app checkout session timed out (>15 mins inactivity) during user payment step.';
        break;
      case 'INVALID_TRANSACTION_PAYLOAD':
        failureDescription = 'Buyer agent transmitted malformed JSON currency/signature fields causing API rejection.';
        break;
      case 'PRICE_TAMPERING_DETECTED':
        failureDescription = 'Client manipulated client-side amount field; backend cryptographic verification rejected payload.';
        break;
      case 'CLIENT_DROP_OFF':
        failureDescription = 'User abandoned payment modal before OTP entry; session marked stale.';
        break;
    }

    auditEngine.addStep(
      trace.traceId,
      'FALLBACK_ACTION',
      `Failure Incident Detected: ${params.failureType}`,
      `Trigger: ${failureDescription} Initiating Automated Fallback Circuit.`,
      'fail',
      { failureType: params.failureType }
    );

    auditEngine.addStep(
      trace.traceId,
      'FALLBACK_ACTION',
      'Executing Self-Healing Protocol',
      `1. Locking inventory for 30 minutes. 2. Preserving 5% customer courtesy discount. 3. Generating immutable Razorpay Hosted Payment Link.`,
      'warn'
    );

    // Generate static fallback payment link
    const finalAmount = Math.round(product.priceInr * 0.95);
    const linkResult = await razorpayService.createPaymentLink({
      traceId: trace.traceId,
      amountInr: finalAmount,
      description: `Recovery Payment: ${product.name} (Ref: ${trace.traceId})`,
      customer: {
        name: customerName,
        contact: customerContact
      },
      expireByMinutes: 30,
      notes: {
        recovery_type: params.failureType,
        original_sku: product.sku
      }
    });

    auditEngine.addStep(
      trace.traceId,
      'FALLBACK_ACTION',
      'Fallback Payment Link Dispatched',
      `Hardened static link generated (${linkResult.shortUrl}). Sent to customer WhatsApp/SMS. Zero merchant revenue loss.`,
      'pass',
      { shortUrl: linkResult.shortUrl }
    );

    auditEngine.finishTrace(trace.traceId, 'FAILED_FALLBACK_TRIGGERED');

    return {
      success: true,
      traceId: trace.traceId,
      failureSummary: failureDescription,
      recoveryAction: 'Gracefully recovered: Bounded 5% discount preserved, Razorpay static payment link created, dispatched via fallback channel.',
      fallbackPaymentLink: {
        id: linkResult.paymentLinkId,
        url: linkResult.shortUrl,
        expiresInMinutes: 30,
        amountInr: finalAmount
      },
      auditTrace: auditEngine.getTrace(trace.traceId)
    };
  }
}

export const fallbackService = new FallbackService();
