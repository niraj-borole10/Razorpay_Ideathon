import crypto from 'crypto';
import { config } from '../config';
import { auditEngine } from '../audit-dashboard/auditEngine';
import { catalogService } from '../catalog-engine/catalogService';

export interface WebhookPayload {
  entity: string;
  account_id: string;
  event: 'payment.captured' | 'payment.failed' | 'order.paid' | 'payment_link.paid';
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
  created_at: number;
}

export class WebhookService {
  /**
   * Validates Razorpay webhook signature
   */
  public verifySignature(rawBody: string, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) {
      return false;
    }
    if (config.mockRazorpayMode && (signatureHeader === 'test_mock_sig' || signatureHeader.length >= 10)) {
      return true;
    }

    const expected = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expected === signatureHeader;
  }

  /**
   * Processes verified webhook event
   */
  public processWebhook(eventData: WebhookPayload): { success: boolean; message: string } {
    const event = eventData.event;
    const payment = eventData.payload.payment?.entity;
    const order = eventData.payload.order?.entity;

    const traceId = payment?.notes?.trace_id || order?.notes?.trace_id;
    const sku = payment?.notes?.sku || order?.notes?.sku;
    const quantity = parseInt(payment?.notes?.quantity || '1', 10);

    if (traceId) {
      if (event === 'payment.captured' || event === 'order.paid') {
        auditEngine.addStep(
          traceId,
          'WEBHOOK_VERIFICATION',
          `Razorpay Webhook: ${event}`,
          `Payment verified & settled. Payment ID: ${payment?.id || 'N/A'}, Method: ${payment?.method || 'UPI'}, Amount: ₹${((payment?.amount || order?.amount || 0) / 100).toFixed(2)}`,
          'pass',
          { event, paymentId: payment?.id, method: payment?.method }
        );

        auditEngine.updateRazorpay(traceId, {
          paymentId: payment?.id,
          status: 'captured',
          method: payment?.method
        });

        auditEngine.finishTrace(traceId, 'PAYMENT_CAPTURED');

        // Permanently deduct inventory upon confirmed payment
        if (sku) {
          catalogService.updateStock(sku, quantity);
        }
      } else if (event === 'payment.failed') {
        auditEngine.addStep(
          traceId,
          'WEBHOOK_VERIFICATION',
          'Razorpay Webhook: payment.failed',
          `Customer payment failed on gateway. Reason: User dropped off or insufficient funds. Readying fallback.`,
          'warn'
        );
        auditEngine.finishTrace(traceId, 'FAILED_FALLBACK_TRIGGERED');
      }
    }

    return { success: true, message: `Processed ${event}` };
  }
}

export const webhookService = new WebhookService();
