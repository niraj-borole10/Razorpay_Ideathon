import { Router, Request, Response } from 'express';
import { catalogRoutes } from '../catalog-engine/catalogRoutes';
import { auditRoutes } from '../audit-dashboard/auditRoutes';
import { authRouter } from '../auth/authRoutes';
import { orderRouter } from '../orders/orderRoutes';
import { orderService } from '../orders/orderService';
import { authMiddleware, AuthenticatedRequest } from '../auth/authMiddleware';
import { catalogService } from '../catalog-engine/catalogService';
import { conversationalAgent } from '../agent-orchestrator/conversationalAgent';
import { ap2ProtocolHandler } from '../agent-orchestrator/ap2ProtocolHandler';
import { razorpayService } from '../razorpay-service/razorpayClient';
import { webhookService } from '../razorpay-service/webhookHandler';
import { auditEngine } from '../audit-dashboard/auditEngine';
import { config } from '../config';

export const apiRouter = Router();

// Sub-routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/agent', catalogRoutes);
apiRouter.use('/audit', auditRoutes);

/**
 * Health & Config State
 */
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Razorpay Track 01 - AI Growth & Agentic Commerce',
    environment: config.nodeEnv,
    razorpay_mode: config.mockRazorpayMode ? 'SANDBOX_SIMULATOR' : 'LIVE_TEST_MODE',
    mongodb_configured: !!config.mongodbUri,
    guardrails: {
      max_allowed_discount_pct: config.guardrails.maxAllowedDiscountPct,
      max_transaction_limit_inr: config.guardrails.maxTransactionLimitInr,
      min_margin_floor_pct: config.guardrails.minMarginFloorPct
    }
  });
});

/**
 * Conversational Shopping Chat Endpoint
 */
apiRouter.post('/agent/conversational/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { session_id, message, customer_name } = req.body;
    const sessionId = session_id || 'default_session';
    const effectiveName = req.user?.name || customer_name || 'Shopper';

    if (!message) {
      res.status(400).json({ status: 'error', message: 'message is required' });
      return;
    }

    const response = await conversationalAgent.handleMessage(sessionId, message, effectiveName);
    res.json({
      status: 'success',
      data: response
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * AP2 / ACP Autonomous Buyer Transact Endpoint
 */
apiRouter.post('/agent/transact', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestBody = req.body;
    if (!requestBody.target_sku) {
      res.status(400).json({
        status: 'error',
        message: 'target_sku is required for AP2 transaction'
      });
      return;
    }

    const result = await ap2ProtocolHandler.handleAgentTransaction(requestBody);

    // If order was created, record in MongoDB
    if (result.razorpay_authorization?.order_id) {
      const product = catalogService.getProductBySku(requestBody.target_sku);
      const userId = req.user?.userId || `cust_${(requestBody.shipping_address?.recipient_name || requestBody.buyer_agent_id || 'agent').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const username = req.user?.username || (requestBody.shipping_address?.recipient_name || requestBody.buyer_agent_id || 'agent').toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      await orderService.saveOrder({
        orderId: result.razorpay_authorization.order_id,
        traceId: result.trace_id,
        userId,
        username,
        customerName: requestBody.shipping_address?.recipient_name || `Agent ${requestBody.buyer_agent_id}`,
        customerAddress: requestBody.shipping_address ? `${requestBody.shipping_address.street}, ${requestBody.shipping_address.city} ${requestBody.shipping_address.pincode}` : undefined,
        item: result.order_summary.product_name,
        sku: result.order_summary.sku,
        category: product?.category || 'Athletics',
        imageUrl: product?.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        amount: result.order_summary.total_amount_inr,
        originalPrice: result.order_summary.base_unit_price_inr * result.order_summary.quantity,
        discount: result.order_summary.discount_applied_pct,
        quantity: result.order_summary.quantity,
        status: 'Created',
        channel: 'AP2 Autonomous AI Buyer',
        channelType: 'm2m'
      });
    }

    res.status(result.status.startsWith('REJECTED') ? 400 : 200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Create Direct Razorpay Order for Storefront Checkout
 */
apiRouter.post('/razorpay/create-order', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amountInr, receipt, notes, customer } = req.body;

    if (!amountInr || amountInr <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Valid amountInr is required'
      });
      return;
    }

    const trace = auditEngine.startTrace(
      'in_app_chat',
      req.user?.name || req.user?.username || 'Customer',
      'Direct Storefront Purchase',
      notes?.sku,
      notes?.productName
    );
    const traceId = trace.traceId;

    const orderResult = await razorpayService.createOrder({
      traceId,
      amountInr: parseFloat(amountInr),
      receipt: receipt || `rcpt_${Date.now().toString(36)}`,
      notes: {
        customerName: req.user?.name || req.user?.username || 'Customer',
        ...notes
      },
      customer: customer || {
        name: req.user?.name || req.user?.username,
        email: req.user?.email,
        contact: req.user?.phone
      }
    });

    res.json({
      status: 'success',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amountPaisa,
        currency: orderResult.currency,
        keyId: orderResult.keyId,
        traceId,
        merchantName: orderResult.merchantName
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create Razorpay order' });
  }
});

/**
 * Verify In-App Razorpay Payment Signature
 */
apiRouter.post('/razorpay/verify-payment', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, trace_id, sku, quantity, customer_name, customer_address, product_name, amount_inr } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({
      status: 'error',
      message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
    });
    return;
  }

  const isValid = razorpayService.verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (trace_id) {
    if (isValid) {
      auditEngine.addStep(
        trace_id,
        'RAZORPAY_EXECUTION',
        'Payment Signature Cryptographically Verified',
        `Signature check PASSED for Order: ${razorpay_order_id}, Payment ID: ${razorpay_payment_id}. In-App payment succeeded with 0 redirects.`,
        'pass',
        { paymentId: razorpay_payment_id }
      );
      auditEngine.updateRazorpay(trace_id, {
        paymentId: razorpay_payment_id,
        status: 'captured'
      });
      auditEngine.finishTrace(trace_id, 'PAYMENT_CAPTURED');
    } else {
      auditEngine.addStep(
        trace_id,
        'RAZORPAY_EXECUTION',
        'Payment Signature Verification Failed',
        `HMAC SHA256 mismatch detected for ${razorpay_order_id}. Rejecting payment settlement.`,
        'fail'
      );
      auditEngine.finishTrace(trace_id, 'BOUNDED_REJECTED');
    }
  }

  if (isValid) {
    // Record or update order in MongoDB
    try {
      const trace = trace_id ? auditEngine.getTrace(trace_id) : null;
      const product = sku ? catalogService.getProductBySku(sku) : null;
      const qty = quantity ? parseInt(quantity, 10) : (trace?.quantity || 1);
      const effectiveAmount = amount_inr || (trace?.pricing?.finalPriceInr) || (product ? product.priceInr : 1899);
      const effectiveItem = product_name || (product?.name) || (trace?.productName) || 'ShopStore Performance Gear';
      const effectiveSku = sku || (product?.sku) || (trace?.sku) || 'PROD-001';

      const userId = req.user?.userId || (customer_name ? `cust_${customer_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'cust_active');
      const username = req.user?.username || customer_name || 'shopper';
      const custName = req.user?.name || customer_name || 'Verified Customer';
      const custAddress = customer_address || req.user?.address || '101 Residency Road, Central District, Bengaluru 560025';

      await orderService.saveOrder({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        traceId: trace_id,
        userId,
        username,
        customerName: custName,
        customerEmail: req.user?.email,
        customerAddress: custAddress,
        item: effectiveItem,
        sku: effectiveSku,
        category: product?.category || 'Apparel',
        imageUrl: product?.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        amount: effectiveAmount,
        originalPrice: product ? product.priceInr * qty : effectiveAmount,
        discount: trace?.pricing?.approvedDiscountPct || 0,
        quantity: qty,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat'
      });
    } catch (dbErr: any) {
      console.warn(`[Order Recording Warning] ${dbErr.message}`);
    }

    res.json({
      status: 'success',
      verified: true,
      message: 'Payment verified and captured successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });
  } else {
    res.status(400).json({
      status: 'error',
      verified: false,
      message: 'Invalid payment signature'
    });
  }
});

/**
 * Razorpay Webhook Endpoint
 */
apiRouter.post('/razorpay/webhook', (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  const isValid = webhookService.verifySignature(rawBody, signature);
  if (!isValid && !config.mockRazorpayMode) {
    res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
    return;
  }

  const result = webhookService.processWebhook(req.body);
  res.json(result);
});
