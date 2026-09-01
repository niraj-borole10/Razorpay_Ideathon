/**
 * AP2 Autonomous AI Buyer Simulator Frontend Handler
 */

const AP2_PRESETS = {
  reasonable: {
    protocol_version: "AP2/1.0",
    buyer_agent_id: "agent_claude_personal_shopper_01",
    target_sku: "SHOE-RUN-001",
    quantity: 1,
    proposed_discount_pct: 10,
    shipping_address: {
      recipient_name: "Rahul Verma",
      street: "42 Indiranagar 100ft Rd",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      country: "India"
    },
    payment_intent: "razorpay_order",
    agent_metadata: {
      client_platform: "Autonomous_Agentic_Browser",
      negotiation_strategy: "fair_margin_cooperative"
    }
  },
  aggressive: {
    protocol_version: "AP2/1.0",
    buyer_agent_id: "agent_chatgpt_bargain_bot_99",
    target_sku: "SHOE-RUN-001",
    quantity: 1,
    proposed_discount_pct: 40,
    shipping_address: {
      recipient_name: "Sneha Kapur",
      street: "12 Bandra Kurla Complex",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400051",
      country: "India"
    },
    payment_intent: "razorpay_order",
    agent_metadata: {
      client_platform: "Autonomous_Bargain_Hunter",
      notes: "Attempting 40% discount - testing merchant guardrail bounds"
    }
  },
  bulk: {
    protocol_version: "AP2/1.0",
    buyer_agent_id: "agent_procure_corp_ai",
    target_sku: "APP-DRY-005",
    quantity: 5,
    proposed_discount_pct: 15,
    shipping_address: {
      recipient_name: "AeroPulse Marathon Team",
      street: "Sector 62",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201309",
      country: "India"
    },
    payment_intent: "razorpay_order",
    agent_metadata: {
      procurement_type: "team_bulk_purchase"
    }
  }
};

function loadBuyerPreset(type) {
  const payload = AP2_PRESETS[type] || AP2_PRESETS.reasonable;
  const inputEl = document.getElementById('ap2-payload-input');
  if (inputEl) {
    inputEl.value = JSON.stringify(payload, null, 2);
  }
}

async function executeAP2Transaction() {
  const inputEl = document.getElementById('ap2-payload-input');
  const responseEl = document.getElementById('ap2-response-viewer');
  const statusPill = document.getElementById('ap2-status-pill');

  if (!inputEl || !responseEl) return;

  try {
    let payload;
    try {
      payload = JSON.parse(inputEl.value);
    } catch (e) {
      alert('Invalid JSON in request payload editor.');
      return;
    }

    if (statusPill) {
      statusPill.textContent = 'TRANSACTING...';
      statusPill.className = 'text-xs font-mono px-2.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30';
    }

    responseEl.textContent = '// Sending AP2 M2M POST request to /api/v1/agent/transact...';

    const res = await fetch('/api/v1/agent/transact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Protocol-Version': payload.protocol_version || 'AP2/1.0'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    responseEl.textContent = JSON.stringify(data, null, 2);

    if (res.ok && data.status === 'success') {
      const respData = data.data;
      if (statusPill) {
        if (respData.status === 'BOUNDED_AUTHORIZED') {
          statusPill.textContent = 'BOUNDED & AUTHORIZED';
          statusPill.className = 'text-xs font-mono px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30';
        } else {
          statusPill.textContent = 'AUTHORIZED (200 OK)';
          statusPill.className = 'text-xs font-mono px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30';
        }
      }
    } else {
      if (statusPill) {
        statusPill.textContent = 'REJECTED';
        statusPill.className = 'text-xs font-mono px-2.5 py-0.5 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30';
      }
    }

    // Refresh audit logs in background
    if (typeof refreshAuditLogs === 'function') {
      refreshAuditLogs();
    }
  } catch (error) {
    console.error('AP2 execution error:', error);
    responseEl.textContent = `// Error executing transaction:\n${error.message}`;
    if (statusPill) {
      statusPill.textContent = 'ERROR';
      statusPill.className = 'text-xs font-mono px-2.5 py-0.5 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30';
    }
  }
}
