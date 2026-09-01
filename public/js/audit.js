/**
 * Trust, Safety & Audit Dashboard Handler (Fintech Clean Theme)
 */

async function refreshAuditLogs() {
  try {
    const [logsRes, statsRes] = await Promise.all([
      fetch('/api/v1/audit/logs'),
      fetch('/api/v1/audit/stats')
    ]);

    const logsData = await logsRes.json();
    renderAuditTimeline(logsData.traces || []);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
  }
}

function renderAuditTimeline(traces) {
  const container = document.getElementById('audit-timeline-container');
  if (!container) return;

  if (traces.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-neutral-400 text-xs">
        <i data-lucide="shield" class="w-6 h-6 mx-auto mb-1.5 text-neutral-300"></i>
        <p>No decision traces recorded yet.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = traces.map(trace => {
    const isFallback = trace.state === 'FAILED_FALLBACK_TRIGGERED' || trace.channel === 'fallback_recovery';
    const isBounded = trace.guardrails?.policyBreachPrevented;

    let stateBadge = `<span class="badge-status badge-pending font-mono">${trace.state}</span>`;
    if (trace.state === 'PAYMENT_CAPTURED') {
      stateBadge = `<span class="badge-status badge-paid font-mono">CAPTURED</span>`;
    } else if (isFallback) {
      stateBadge = `<span class="badge-status badge-warning font-mono">FALLBACK</span>`;
    } else if (trace.state === 'BOUNDED_REJECTED') {
      stateBadge = `<span class="badge-status bg-rose-50 text-rose-700 font-mono">REJECTED</span>`;
    }

    const formattedTime = new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
      <div class="bg-white border border-neutral-200 rounded p-4 space-y-3">
        
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
          <div class="flex items-center space-x-2">
            <span class="font-mono text-xs font-medium text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded">${trace.traceId}</span>
            <span class="text-xs font-medium text-neutral-800">${trace.actor}</span>
            <span class="text-[11px] text-neutral-400 font-mono">(${trace.channel})</span>
          </div>
          <div class="flex items-center space-x-2">
            ${isBounded ? '<span class="badge-status badge-warning font-mono">Cap Bounded</span>' : ''}
            ${stateBadge}
            <span class="text-xs text-neutral-400 font-mono tabular-nums">${formattedTime}</span>
          </div>
        </div>

        <!-- Pricing Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs bg-neutral-50 p-2.5 rounded border border-neutral-200">
          <div>
            <span class="text-neutral-400 text-[11px] block font-mono">Intent</span>
            <span class="text-neutral-700 truncate block">${trace.intent}</span>
          </div>
          <div>
            <span class="text-neutral-400 text-[11px] block font-mono">Product</span>
            <span class="text-neutral-700 truncate block">${trace.productName || 'Catalog Item'}</span>
          </div>
          <div>
            <span class="text-neutral-400 text-[11px] block font-mono">Settlement</span>
            <div class="flex items-center space-x-1.5 font-mono tabular-nums">
              <span class="text-neutral-400 line-through text-xs">₹${trace.pricing?.originalPriceInr || 0}</span>
              <span class="text-neutral-900 font-medium">₹${trace.pricing?.finalPriceInr || 0}</span>
              <span class="text-neutral-500 text-[11px]">(${trace.pricing?.approvedDiscountPct || 0}% off)</span>
            </div>
          </div>
        </div>

        <!-- Decision Steps -->
        <div class="space-y-1.5">
          ${(trace.reasoningSteps || []).map(step => `
            <div class="flex items-start space-x-2 text-xs py-1 px-2.5 rounded bg-neutral-50 border border-neutral-200">
              <span class="font-mono text-neutral-400 text-[11px]">#${step.step}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-mono border ${step.status === 'pass' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : (step.status === 'warn' ? 'text-amber-800 bg-amber-50 border-amber-200' : (step.status === 'fail' ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-neutral-700 bg-white border-neutral-200'))}">${step.phase}</span>
              <div class="flex-1 text-neutral-700">
                <strong class="text-neutral-900 font-medium">${step.title}:</strong>
                <span class="text-neutral-600 ml-1 leading-relaxed">${step.detail}</span>
              </div>
            </div>
          `).join('')}
        </div>

        ${trace.razorpayDetails?.orderId || trace.razorpayDetails?.shortUrl ? `
          <div class="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between text-xs font-mono text-neutral-500 tabular-nums">
            <div>
              ${trace.razorpayDetails?.orderId ? `<span>Order: <strong class="text-neutral-900">${trace.razorpayDetails.orderId}</strong></span>` : ''}
              ${trace.razorpayDetails?.paymentId ? ` • <span>Payment: <strong class="text-neutral-900">${trace.razorpayDetails.paymentId}</strong></span>` : ''}
            </div>
            ${trace.razorpayDetails?.shortUrl ? `
              <a href="${trace.razorpayDetails.shortUrl}" target="_blank" class="text-amber-800 hover:underline flex items-center space-x-1">
                <span>Static Fallback: ${trace.razorpayDetails.shortUrl}</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

async function triggerSimulatedFailure(failureType) {
  try {
    const res = await fetch('/api/v1/audit/simulate-failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failure_type: failureType,
        sku: 'SHOE-RUN-001',
        customer_name: 'Aditi Nair',
        customer_phone: '+919876501234'
      })
    });

    const data = await res.json();
    await refreshAuditLogs();
    
    alert(`Graceful Fallback Executed!\n\nIncident: ${data.simulation_result?.failureSummary}\n\nRecovery: ${data.simulation_result?.recoveryAction}\n\nStatic Link: ${data.simulation_result?.fallbackPaymentLink?.url}`);
  } catch (error) {
    console.error('Error triggering failure simulation:', error);
  }
}
