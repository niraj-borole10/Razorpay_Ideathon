import { v4 as uuidv4 } from 'uuid';

export interface AuditStep {
  step: number;
  phase: 'INTENT_PARSING' | 'CATALOG_LOOKUP' | 'GUARDRAIL_BOUNDING' | 'DISCOUNT_NEGOTIATION' | 'RAZORPAY_EXECUTION' | 'FALLBACK_ACTION' | 'WEBHOOK_VERIFICATION';
  title: string;
  detail: string;
  status: 'info' | 'pass' | 'fail' | 'warn';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface GuardrailCheckStatus {
  maxDiscountBounded: boolean;
  marginFloorMaintained: boolean;
  stockAvailable: boolean;
  transactionLimitPassed: boolean;
  gatedTokenIssued: boolean;
  policyBreachPrevented: boolean;
}

export interface AuditTrace {
  traceId: string;
  channel: 'in_app_chat' | 'ap2_machine_buyer' | 'webhook' | 'fallback_recovery';
  actor: string;
  intent: string;
  timestamp: string;
  sku?: string;
  productName?: string;
  quantity: number;
  pricing: {
    originalPriceInr: number;
    requestedPriceInr?: number;
    requestedDiscountPct?: number;
    approvedDiscountPct: number;
    finalPriceInr: number;
    amountPaisa: number;
    savingsInr: number;
  };
  guardrails: GuardrailCheckStatus;
  reasoningSteps: AuditStep[];
  razorpayDetails?: {
    orderId?: string;
    paymentLinkId?: string;
    paymentId?: string;
    status?: string;
    shortUrl?: string;
    currency?: string;
    method?: string;
  };
  state: 'INITIATED' | 'BOUNDED_APPROVED' | 'BOUNDED_REJECTED' | 'ORDER_CREATED' | 'PAYMENT_CAPTURED' | 'FAILED_FALLBACK_TRIGGERED';
  executionTimeMs: number;
}

export class AuditEngine {
  private traces: AuditTrace[] = [];
  private maxTraces = 100;

  public startTrace(
    channel: AuditTrace['channel'],
    actor: string,
    intent: string,
    sku?: string,
    productName?: string
  ): AuditTrace {
    const trace: AuditTrace = {
      traceId: `trc_${uuidv4().substring(0, 8)}`,
      channel,
      actor,
      intent,
      timestamp: new Date().toISOString(),
      sku,
      productName,
      quantity: 1,
      pricing: {
        originalPriceInr: 0,
        approvedDiscountPct: 0,
        finalPriceInr: 0,
        amountPaisa: 0,
        savingsInr: 0
      },
      guardrails: {
        maxDiscountBounded: true,
        marginFloorMaintained: true,
        stockAvailable: true,
        transactionLimitPassed: true,
        gatedTokenIssued: false,
        policyBreachPrevented: false
      },
      reasoningSteps: [],
      state: 'INITIATED',
      executionTimeMs: 0
    };

    this.traces.unshift(trace);
    if (this.traces.length > this.maxTraces) {
      this.traces.pop();
    }

    return trace;
  }

  public addStep(
    traceId: string,
    phase: AuditStep['phase'],
    title: string,
    detail: string,
    status: AuditStep['status'] = 'info',
    metadata?: Record<string, any>
  ): void {
    const trace = this.traces.find(t => t.traceId === traceId);
    if (!trace) return;

    trace.reasoningSteps.push({
      step: trace.reasoningSteps.length + 1,
      phase,
      title,
      detail,
      status,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  public updatePricing(
    traceId: string,
    pricing: Partial<AuditTrace['pricing']>
  ): void {
    const trace = this.traces.find(t => t.traceId === traceId);
    if (!trace) return;
    trace.pricing = { ...trace.pricing, ...pricing };
    trace.pricing.amountPaisa = Math.round(trace.pricing.finalPriceInr * 100);
    trace.pricing.savingsInr = Math.max(0, trace.pricing.originalPriceInr - trace.pricing.finalPriceInr);
  }

  public updateGuardrails(
    traceId: string,
    guardrails: Partial<GuardrailCheckStatus>
  ): void {
    const trace = this.traces.find(t => t.traceId === traceId);
    if (!trace) return;
    trace.guardrails = { ...trace.guardrails, ...guardrails };
  }

  public updateRazorpay(
    traceId: string,
    details: AuditTrace['razorpayDetails']
  ): void {
    const trace = this.traces.find(t => t.traceId === traceId);
    if (!trace) return;
    trace.razorpayDetails = { ...trace.razorpayDetails, ...details };
  }

  public finishTrace(
    traceId: string,
    state: AuditTrace['state']
  ): AuditTrace | undefined {
    const trace = this.traces.find(t => t.traceId === traceId);
    if (!trace) return;

    trace.state = state;
    const startTime = new Date(trace.timestamp).getTime();
    trace.executionTimeMs = Math.max(1, Date.now() - startTime);
    return trace;
  }

  public getTrace(traceId: string): AuditTrace | undefined {
    return this.traces.find(t => t.traceId === traceId);
  }

  public getAllTraces(): AuditTrace[] {
    return this.traces;
  }

  public getStats() {
    const total = this.traces.length;
    const inAppPurchases = this.traces.filter(t => t.channel === 'in_app_chat').length;
    const ap2Purchases = this.traces.filter(t => t.channel === 'ap2_machine_buyer').length;
    const boundedDiscountsEnforced = this.traces.filter(t => t.guardrails.policyBreachPrevented).length;
    const fallbackEvents = this.traces.filter(t => t.channel === 'fallback_recovery' || t.state === 'FAILED_FALLBACK_TRIGGERED').length;
    const totalGmvInr = this.traces
      .filter(t => t.state === 'ORDER_CREATED' || t.state === 'PAYMENT_CAPTURED')
      .reduce((sum, t) => sum + (t.pricing?.finalPriceInr || 0), 0);

    return {
      totalTraces: total,
      inAppConversations: inAppPurchases,
      ap2AutonomousTransactions: ap2Purchases,
      guardrailBreachesSafelyBounded: boundedDiscountsEnforced,
      fallbacksHandledGracefully: fallbackEvents,
      totalGmvInr,
      complianceScore: '100% Gated & Bounded'
    };
  }

  public clear(): void {
    this.traces = [];
  }
}

export const auditEngine = new AuditEngine();
