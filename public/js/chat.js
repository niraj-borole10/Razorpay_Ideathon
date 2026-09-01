/**
 * In-App Conversational Shopping & Checkout Handler (Fintech Polish)
 */

let activeCheckoutPayload = null;
let currentSessionId = `sess_${Date.now().toString(36)}`;
let selectedPaymentMethod = 'UPI';
let selectedVariantSku = null;

let chatHistory = [];

function initChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const savedMsgs = sessionStorage.getItem('aeropulse_chat_history');
  if (savedMsgs) {
    try {
      chatHistory = JSON.parse(savedMsgs);
      if (chatHistory && chatHistory.length > 0) {
        container.innerHTML = '';
        chatHistory.forEach(msg => renderChatMessage(msg, false));
        return;
      }
    } catch (e) {}
  }

  const userName = (window.dashboardState && dashboardState.currentUser) ? dashboardState.currentUser.name : 'there';
  container.innerHTML = '';
  chatHistory = [];
  renderChatMessage({
    sender: 'agent',
    text: `Hello ${userName}! I can assist you with finding athletic gear, applying authorized conversational discounts up to 15%, and generating zero-redirect Razorpay checkout orders directly in this session.\n\nWhat would you like to explore today?`,
    timestamp: new Date().toISOString(),
    suggestedActions: [
      'Show All Products',
      'Can you give me a 25% discount on the AeroPulse shoes?',
      'Show me a workout bundle combo',
      'FlexiBand Resistance Bands (₹349)'
    ]
  });
}

function clearChat() {
  currentSessionId = `sess_${Date.now().toString(36)}`;
  selectedVariantSku = null;
  sessionStorage.removeItem('aeropulse_chat_history');
  chatHistory = [];
  initChat();
  const miniTrace = document.getElementById('mini-trace-view');
  if (miniTrace) {
    miniTrace.innerHTML = `
      <div class="text-neutral-400 p-4 text-center border border-dashed border-neutral-200 rounded-md text-xs">
        <i data-lucide="shield" class="w-5 h-5 mx-auto mb-1 text-neutral-300"></i>
        <span>Session reset. Send a message to inspect live agent step execution.</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

function sendQuickPrompt(promptText) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = promptText;
    handleChatSubmit(new Event('submit'));
  }
}

async function handleChatSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const input = document.getElementById('chat-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // Render user message
  renderChatMessage({
    sender: 'user',
    text,
    timestamp: new Date().toISOString()
  });

  input.value = '';

  const typingId = showTypingIndicator();

  try {
    const currentCustomerName = (window.dashboardState && dashboardState.currentUser) 
      ? dashboardState.currentUser.name 
      : ((window.dashboardState && dashboardState.activeCustomer) ? dashboardState.activeCustomer.name : 'Shopper');    
    const token = localStorage.getItem('shopstore_jwt_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/v1/agent/conversational/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session_id: currentSessionId,
        message: text,
        customer_name: currentCustomerName
      })
    });

    removeTypingIndicator(typingId);

    const data = await res.json();
    if (data.status === 'success' && data.data?.message) {
      renderChatMessage(data.data.message);

      if (data.data.auditLog) {
        renderMiniTrace(data.data.auditLog);
      }

      if (typeof refreshAuditLogs === 'function') refreshAuditLogs();
      if (typeof refreshOverviewStats === 'function') refreshOverviewStats();
    }
  } catch (error) {
    removeTypingIndicator(typingId);
    console.error('Chat error:', error);
    renderChatMessage({
      sender: 'agent',
      text: 'An error occurred while connecting to the merchant agent. Please retry.',
      timestamp: new Date().toISOString()
    });
  }
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const id = `typing_${Date.now()}`;
  const el = document.createElement('div');
  el.id = id;
  el.className = 'flex items-center space-x-2 text-neutral-400 text-xs py-1.5 px-3 bg-neutral-100 rounded w-fit';
  el.innerHTML = `
    <span class="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
    <span class="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
    <span class="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
    <span class="ml-1 text-neutral-500 font-mono text-[11px]">Evaluating policy guardrails...</span>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function verifyAndFinalizePayment(orderId, paymentId, signature, traceId) {
  const typingId = showTypingIndicator();
  const token = localStorage.getItem('shopstore_jwt_token');
  const currentUser = (window.dashboardState && dashboardState.currentUser) ? dashboardState.currentUser : null;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const prodName = activeCheckoutPayload?.productName || 'ShopStore Gear';
    const amount = activeCheckoutPayload?.amountInr || 1899;
    const sku = activeCheckoutPayload?.sku || 'SHOE-RUN-001';

    // 1. Post to Razorpay verify payment endpoint to persist to MongoDB
    await fetch('/api/v1/razorpay/verify-payment', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        trace_id: traceId,
        sku: sku,
        product_name: prodName,
        amount_inr: amount,
        customer_name: currentUser?.name || 'Shopper',
        customer_address: currentUser?.address || '101 Residency Road, Central District, Bengaluru 560025'
      })
    }).catch(e => console.warn('Payment verify warning:', e));

    // 2. Also simulate webhook event
    const res = await fetch('/api/v1/agent/webhook/razorpay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: activeCheckoutPayload ? activeCheckoutPayload.amountPaisa : 189900,
              currency: 'INR',
              status: 'captured',
              method: selectedPaymentMethod.toLowerCase()
            }
          }
        }
      })
    });

    removeTypingIndicator(typingId);

    renderChatMessage({
      sender: 'agent',
      text: `🎉 **Payment Captured & Order Confirmed!** \n\nThank you for purchasing **${prodName}** for **₹${amount}**. \n\n• **Razorpay Payment ID**: \`${paymentId}\` \n• **Order Reference**: \`${orderId}\` \n• **Payment Method**: ${selectedPaymentMethod} \n\nYour zero-redirect transaction has settled in MongoDB. You can track this order live under **Your Orders**.`,
      timestamp: new Date().toISOString(),
      suggestedActions: ['Track in Your Orders', 'Shop More Products']
    });

    if (typeof refreshOverviewStats === 'function') refreshOverviewStats();
    if (typeof fetchAndRenderOrders === 'function') fetchAndRenderOrders();
    if (typeof refreshAuditLogs === 'function') refreshAuditLogs();
  } catch (err) {
    removeTypingIndicator(typingId);
    console.error('Payment settlement error:', err);
  }
}

function selectVariant(sku, btnElement) {
  selectedVariantSku = sku;
  const parent = btnElement.closest('.variant-container');
  if (parent) {
    parent.querySelectorAll('.variant-pill').forEach(b => {
      b.classList.remove('bg-neutral-900', 'text-white', 'border-neutral-900');
      b.classList.add('bg-white', 'text-neutral-700', 'border-neutral-200');
    });
    btnElement.classList.remove('bg-white', 'text-neutral-700', 'border-neutral-200');
    btnElement.classList.add('bg-neutral-900', 'text-white', 'border-neutral-900');
  }
}

function renderChatMessage(msg, shouldSave = true) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  if (shouldSave) {
    chatHistory.push(msg);
    try {
      sessionStorage.setItem('aeropulse_chat_history', JSON.stringify(chatHistory));
    } catch (e) {}
  }

  const isUser = msg.sender === 'user';
  const msgEl = document.createElement('div');
  msgEl.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;

  let formattedText = msg.text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-neutral-900">$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  // Format 1: Multi-Product Catalog Grid
  let comparisonHtml = '';
  if (msg.comparisonList && msg.comparisonList.length > 0) {
    comparisonHtml = `
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        ${msg.comparisonList.map(item => `
          <div class="bg-white border border-neutral-200 rounded p-3 flex flex-col justify-between hover:border-neutral-300 transition">
            <div class="flex space-x-3 items-center">
              <img src="${item.imageUrl}" alt="${item.name}" class="w-12 h-12 rounded object-cover bg-neutral-100 border border-neutral-200">
              <div class="min-w-0 flex-1">
                <div class="text-xs font-medium text-neutral-900 truncate">${item.name}</div>
                <div class="flex items-center space-x-1.5 mt-0.5 font-mono text-xs tabular-nums">
                  <span class="font-semibold text-neutral-900">₹${item.discountedPriceInr}</span>
                  <span class="text-[10px] line-through text-neutral-400">₹${item.priceInr}</span>
                  <span class="text-[10px] text-neutral-500 font-sans">(${item.discountPct}% off)</span>
                </div>
              </div>
            </div>
            <button onclick="sendQuickPrompt('I want to buy the ${item.name.replace(/'/g, "\\'")} (${item.sku})')" class="mt-2.5 w-full btn-secondary h-7 text-xs flex items-center justify-center space-x-1">
              <span>Select</span>
              <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Format 2: Bargain Meter & Policy Bounding Gauge
  let bargainMeterHtml = '';
  if (msg.bargainMeter) {
    const bm = msg.bargainMeter;
    const savings = bm.originalPrice - bm.approvedPrice;
    bargainMeterHtml = `
      <div class="mt-3 bg-neutral-50 border border-neutral-200 rounded p-3 space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-medium text-neutral-800 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${bm.policyBounded ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
            <span>${bm.policyBounded ? 'Bounded by Merchant Cap (15% Max)' : 'Price Offer Approved'}</span>
          </span>
          <span class="text-[11px] font-mono text-neutral-500 tabular-nums">Savings: ₹${savings}</span>
        </div>
        <div class="w-full bg-neutral-200 rounded-full h-1 overflow-hidden flex">
          <div class="bg-neutral-900 h-1" style="width: ${bm.approvedDiscountPct * 4}%"></div>
          ${bm.policyBounded ? `<div class="bg-amber-500 h-1" style="width: 25%"></div>` : ''}
        </div>
        <div class="flex justify-between text-[11px] text-neutral-500 font-mono tabular-nums">
          <span>Base: ₹${bm.originalPrice}</span>
          <span class="font-medium text-neutral-900">Approved: ₹${bm.approvedPrice} (${bm.approvedDiscountPct}% off)</span>
        </div>
      </div>
    `;
  }

  // Format 3: Single Product Card
  let cardHtml = '';
  if (msg.productCard) {
    const p = msg.productCard;
    const savings = Math.max(0, p.originalPrice - p.discountedPrice);
    
    let variantsHtml = '';
    if (p.variants && p.variants.length > 0) {
      variantsHtml = `
        <div class="mt-2.5 pt-2 border-t border-neutral-100 variant-container">
          <div class="text-[11px] font-medium text-neutral-500 mb-1.5">Variant:</div>
          <div class="flex flex-wrap gap-1.5">
            ${p.variants.map((v, i) => `
              <button onclick="selectVariant('${v.sku}', this)" class="variant-pill ${i === 0 ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200'} text-[11px] font-mono px-2 py-0.5 rounded border hover:border-neutral-400 transition">
                ${v.label}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    cardHtml = `
      <div class="mt-3 bg-neutral-50 border border-neutral-200 rounded p-3 space-y-2">
        <div class="flex space-x-3 items-center">
          <img src="${p.imageUrl}" alt="${p.name}" class="w-14 h-14 rounded object-cover bg-white border border-neutral-200">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-xs text-neutral-900 truncate">${p.name}</div>
            <div class="flex items-center space-x-2 mt-1 font-mono text-xs tabular-nums">
              <span class="font-semibold text-neutral-900">₹${p.discountedPrice}</span>
              ${savings > 0 ? `<span class="text-[11px] line-through text-neutral-400">₹${p.originalPrice}</span>` : ''}
              ${p.discountPct > 0 ? `<span class="text-[10px] text-neutral-600 bg-neutral-200 px-1 py-0.2 rounded font-sans font-medium">${p.discountPct}% off</span>` : ''}
            </div>
            <div class="text-[10px] text-neutral-500 mt-1 flex items-center space-x-1.5">
              <span class="font-mono">${p.sku}</span>
              <span>•</span>
              <span class="text-emerald-700">In Stock</span>
            </div>
          </div>
        </div>
        ${variantsHtml}
      </div>
    `;
  }

  // Format 4: Upsell Card
  let upsellHtml = '';
  if (msg.upsellCard) {
    const u = msg.upsellCard;
    upsellHtml = `
      <div class="mt-3 bg-neutral-50 border border-neutral-200 rounded p-3 space-y-2.5">
        <div class="flex items-center justify-between text-xs">
          <span class="font-medium text-neutral-900">${u.title}</span>
          <span class="text-[11px] font-mono text-neutral-600">Save ₹${u.savingsInr} Combo</span>
        </div>
        <div class="flex items-center space-x-3 bg-white p-2 rounded border border-neutral-200">
          <img src="${u.imageUrl}" alt="${u.name}" class="w-10 h-10 rounded object-cover bg-neutral-100 border border-neutral-200">
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-neutral-800 truncate">${u.name}</div>
            <div class="text-xs font-mono font-semibold text-neutral-900 mt-0.5 tabular-nums">₹${u.bundlePriceInr}</div>
          </div>
        </div>
        <button onclick="sendQuickPrompt('I want to buy the bundle combo for ₹${u.bundlePriceInr}')" class="btn-primary w-full h-8 text-xs">
          Add Bundle & Checkout (₹${u.bundlePriceInr})
        </button>
      </div>
    `;
  }

  // Format 5: Zero-Redirect Razorpay Checkout Order
  let checkoutButtonHtml = '';
  if (msg.checkoutPayload) {
    const payload = msg.checkoutPayload;
    activeCheckoutPayload = payload;
    checkoutButtonHtml = `
      <div class="mt-3 pt-3 border-t border-neutral-100 space-y-2">
        <div class="flex items-center justify-between text-xs font-mono bg-neutral-50 p-2 rounded border border-neutral-200 tabular-nums">
          <span class="text-neutral-500">Order Ref:</span>
          <span class="text-neutral-900 font-medium">${payload.orderId}</span>
        </div>
        <button onclick="triggerInAppCheckout()" class="btn-primary w-full">
          <i data-lucide="lock" class="w-3.5 h-3.5"></i>
          <span>Authorize ₹${payload.amountInr} via Razorpay</span>
        </button>
      </div>
    `;
  }

  // Action Chips
  let chipsHtml = '';
  if (msg.suggestedActions && msg.suggestedActions.length > 0) {
    chipsHtml = `
      <div class="mt-2.5 flex flex-wrap gap-1.5">
        ${msg.suggestedActions.map(action => `
          <button onclick="sendQuickPrompt('${action.replace(/'/g, "\\'")}')" class="btn-ghost h-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] border border-neutral-200">
            ${action}
          </button>
        `).join('')}
      </div>
    `;
  }

  msgEl.innerHTML = `
    <div class="max-w-[85%] ${isUser ? 'bg-[#111827] text-white rounded px-3.5 py-2.5' : 'bg-white border border-neutral-200 text-neutral-800 rounded p-3.5'}">
      <div class="text-xs leading-relaxed ${isUser ? 'text-white' : 'text-neutral-700'}">${formattedText}</div>
      ${comparisonHtml}
      ${bargainMeterHtml}
      ${cardHtml}
      ${upsellHtml}
      ${checkoutButtonHtml}
      ${chipsHtml}
    </div>
  `;

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;

  if (window.lucide) lucide.createIcons();
}

function renderMiniTrace(trace) {
  const container = document.getElementById('mini-trace-view');
  if (!container || !trace) return;

  container.innerHTML = `
    <div class="bg-neutral-50 p-2.5 rounded border border-neutral-200 mb-2 font-mono text-[11px] flex justify-between tabular-nums">
      <span class="text-neutral-900 font-medium">${trace.traceId}</span>
      <span class="text-neutral-600 font-medium">${trace.state}</span>
    </div>
    <div class="space-y-1.5">
      ${(trace.reasoningSteps || []).map(step => `
        <div class="p-2 rounded bg-white border border-neutral-200 text-[11px]">
          <div class="flex items-center space-x-1.5 font-medium text-neutral-900">
            <span class="w-1.5 h-1.5 rounded-full ${step.status === 'pass' ? 'bg-emerald-500' : (step.status === 'warn' ? 'bg-amber-500' : 'bg-neutral-500')}"></span>
            <span>${step.title}</span>
          </div>
          <p class="text-neutral-500 text-[11px] mt-0.5 leading-relaxed">${step.detail}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function triggerInAppCheckout() {
  if (!activeCheckoutPayload) {
    alert('No active checkout session found.');
    return;
  }

  const payload = activeCheckoutPayload;

  if (typeof Razorpay !== 'undefined' && payload.keyId && !payload.keyId.includes('AgentCommerce123')) {
    try {
      const options = {
        key: payload.keyId,
        amount: payload.amountPaisa,
        currency: payload.currency || 'INR',
        name: payload.merchantName || 'ShopStore',
        description: `In-App Checkout: ${payload.productName}`,
        order_id: payload.orderId,
        handler: async function (response) {
          await verifyAndFinalizePayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, payload.traceId);
        },
        prefill: {
          name: (window.dashboardState && dashboardState.currentUser) ? dashboardState.currentUser.name : 'Rahul Sharma',
          email: (window.dashboardState && dashboardState.currentUser) ? dashboardState.currentUser.email : 'rahul.sharma@example.com',
          contact: (window.dashboardState && dashboardState.currentUser) ? dashboardState.currentUser.phone : '9876543210'
        },
        theme: {
          color: '#111827'
        }
      };

      const rzpInstance = new Razorpay(options);
      rzpInstance.open();
      return;
    } catch (e) {
      console.warn('Checkout error, opening simulator modal:', e);
    }
  }

  openSimulatorModal(payload);
}

function openSimulatorModal(payload) {
  const modal = document.getElementById('rzp-sim-modal');
  if (!modal) return;

  document.getElementById('modal-order-id').textContent = payload.orderId;
  document.getElementById('modal-product-name').textContent = payload.productName;
  document.getElementById('modal-amount').textContent = `₹${payload.amountInr}.00`;

  modal.classList.remove('hidden');
}

function closeSimulatorModal() {
  const modal = document.getElementById('rzp-sim-modal');
  if (modal) modal.classList.add('hidden');
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  document.querySelectorAll('.pay-method-btn').forEach(btn => {
    btn.classList.remove('active', 'border-neutral-900', 'bg-neutral-900', 'text-white');
    btn.classList.add('border-neutral-200', 'bg-white', 'text-neutral-700');
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active', 'border-neutral-900', 'bg-neutral-900', 'text-white');
    event.currentTarget.classList.remove('border-neutral-200', 'bg-white', 'text-neutral-700');
  }
}

async function completeSimulatedPayment(success) {
  closeSimulatorModal();

  if (!activeCheckoutPayload) return;
  const payload = activeCheckoutPayload;

  if (success) {
    const fakePaymentId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const fakeSignature = `sig_${Date.now().toString(36)}`;
    await verifyAndFinalizePayment(payload.orderId, fakePaymentId, fakeSignature, payload.traceId);
  } else {
    renderChatMessage({
      sender: 'agent',
      text: `Payment authorization cancelled for **${payload.productName}**. Would you like to adjust the order or try a different payment method?`,
      timestamp: new Date().toISOString(),
      suggestedActions: ['Bargain 25% (Bounded)', 'Show All Products', 'Test Failure & Fallback']
    });
  }
}

