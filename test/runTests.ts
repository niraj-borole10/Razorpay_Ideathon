import crypto from 'crypto';
import { catalogService } from '../src/catalog-engine/catalogService';
import { guardrailEnforcer } from '../src/agent-orchestrator/guardrailPolicy';
import { conversationalAgent } from '../src/agent-orchestrator/conversationalAgent';
import { ap2ProtocolHandler } from '../src/agent-orchestrator/ap2ProtocolHandler';
import { razorpayService } from '../src/razorpay-service/razorpayClient';
import { webhookService } from '../src/razorpay-service/webhookHandler';
import { fallbackService } from '../src/razorpay-service/fallbackService';
import { auditEngine } from '../src/audit-dashboard/auditEngine';
import { config } from '../src/config';

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING RAZORPAY AGENTIC COMMERCE TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      process.exitCode = 1;
    }
  }

  // --- Test 1: AP2 Manifest Generation ---
  console.log('\n[1] AP2 / ACP Protocol Catalog Engine');
  const manifest = catalogService.generateAP2Manifest('http://localhost:4000');
  assert(manifest.protocol_version === 'AP2/1.0', 'Manifest specifies AP2/1.0 protocol');
  assert(manifest.products.length > 0, `Catalog contains ${manifest.products.length} machine-readable products`);
  assert(manifest.products[0].agent_negotiation_rules.negotiation_enabled === true, 'Agent negotiation enabled on products');
  assert(manifest.guardrails.max_discount_cap_pct === 15, 'Guardrail policy caps max discount at 15%');

  // --- Test 2: Guardrail Bounding Enforcement ---
  console.log('\n[2] Guardrail Bounding & Safety Policy');
  const trace1 = auditEngine.startTrace('in_app_chat', 'Test_Buyer', 'Test discount bounding');
  const product = catalogService.getProductBySku('SHOE-RUN-001')!;
  
  // Test a 40% discount ask (should be bounded to 15%)
  const boundedResult = guardrailEnforcer.evaluatePriceProposal(trace1.traceId, product, undefined, 40, 1);
  assert(boundedResult.policyBreachAttempted === true, 'Detects 40% ask as policy breach attempt');
  assert(boundedResult.approvedDiscountPct <= 15, `Clamps discount to max allowed 15% (Got: ${boundedResult.approvedDiscountPct}%)`);
  assert(boundedResult.approvedPriceInr >= product.costPriceInr, 'Approved price stays above merchant cost price');

  // --- Test 3: In-App Conversational Shopping Flow ---
  console.log('\n[3] In-App Conversational Shopping Agent');
  const chatResponse = await conversationalAgent.handleMessage(
    'test_session_01',
    'I want running shoes under 3000, can you give me 25% discount?',
    'Vikram Mehta'
  );
  assert(chatResponse.message.productCard?.sku === 'SHOE-RUN-001', 'Agent correctly selects ShopStore running shoes');
  assert(chatResponse.message.productCard?.discountPct === 15, 'Agent bounds user bargain to 15% discount');
  assert(chatResponse.message.suggestedActions!.length > 0, 'Agent returns contextual action chips');

  // Test direct buy intent
  const buyResponse = await conversationalAgent.handleMessage(
    'test_session_01',
    'I want to buy right now',
    'Vikram Mehta'
  );
  assert(buyResponse.message.checkoutPayload !== undefined, 'Agent generates zero-redirect in-app checkout order');
  assert(buyResponse.message.checkoutPayload?.orderId.startsWith('order_'), 'Razorpay order generated with valid prefix');

  // --- Test 4: AP2 Machine-to-Machine Autonomous Buyer ---
  console.log('\n[4] Autonomous AP2 Machine Buyer Endpoint');
  const ap2Result = await ap2ProtocolHandler.handleAgentTransaction({
    protocol_version: 'AP2/1.0',
    buyer_agent_id: 'agent_claude_autonomous_99',
    target_sku: 'SHOE-RUN-001',
    quantity: 2,
    proposed_discount_pct: 10,
    shipping_address: {
      recipient_name: 'Vikram Mehta',
      street: '42 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India'
    }
  });
  assert(ap2Result.status === 'AUTHORIZED', 'AP2 transaction successfully authorized');
  assert(ap2Result.gated_intent_token.startsWith('ap2_tok_'), 'Gated cryptographic intent token issued');
  assert(ap2Result.razorpay_authorization.order_id.startsWith('order_'), 'Razorpay order created for M2M buyer');
  assert(ap2Result.order_summary.discount_applied_pct === 10, '10% discount applied to order summary');

  // --- Test 5: Webhook & Signature Verification ---
  console.log('\n[5] Razorpay Signature & Webhook Verification');
  const orderId = 'order_test_12345';
  const paymentId = 'pay_test_67890';
  const validSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isSigValid = razorpayService.verifyPaymentSignature(orderId, paymentId, validSignature);
  assert(isSigValid === true, 'Payment signature verified successfully');

  const webhookResult = webhookService.processWebhook({
    entity: 'event',
    account_id: 'acc_test_1',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: 254900,
          currency: 'INR',
          status: 'captured',
          method: 'upi_intent',
          notes: {
            trace_id: chatResponse.traceId,
            sku: 'SHOE-RUN-001',
            quantity: '1'
          }
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  });
  assert(webhookResult.success === true, 'Razorpay payment.captured webhook processed and settled');

  // --- Test 6: "The Bar" — Failure Simulation & Graceful Recovery ---
  console.log('\n[6] "The Bar" — Failure Simulation & Graceful Recovery');
  const recoveryResult = await fallbackService.handleGracefulFallback({
    failureType: 'EXPIRED_SESSION',
    sku: 'SHOE-RUN-001',
    customerName: 'Ananya Roy',
    customerPhone: '+919876543210'
  });
  assert(recoveryResult.success === true, 'Fault-tolerance circuit safely triggered');
  assert(typeof recoveryResult.fallbackPaymentLink.url === 'string' && recoveryResult.fallbackPaymentLink.url.includes('rzp'), 'Static Razorpay Payment Link generated as fallback');
  assert(recoveryResult.auditTrace.state === 'FAILED_FALLBACK_TRIGGERED', 'Audit trace logs fallback incident with explainability');

  // --- Summary ---
  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
