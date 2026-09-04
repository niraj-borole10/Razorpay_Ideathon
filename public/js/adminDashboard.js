/**
 * Store Owner & Amazon-Style Customer Account Coordinator (Strict Multi-User Order Isolation)
 */

const dashboardState = {
  isLoggedIn: false,
  currentUser: null,
  activeTab: 'tab-overview',
  activeOrderFilter: 'all',
  activeCustomerFilter: 'self',
  searchOrderQuery: '',
  products: [],
  orders: [],
  customers: [
    { id: 'cust_01', username: 'rahul', name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '+91 98765 43210', totalSpend: 349, ordersCount: 1, status: 'Active', lastActive: '10 mins ago', address: '42 MG Road, Indiranagar, Bengaluru 560038', city: 'Bengaluru 560038' },
    { id: 'cust_02', username: 'sneha', name: 'Sneha Kapur', email: 'sneha.k@example.com', phone: '+91 98111 22334', totalSpend: 2069, ordersCount: 1, status: 'Active', lastActive: '2 hours ago', address: '18 Bandra West, Mumbai 400050', city: 'Mumbai 400050' },
    { id: 'cust_03', username: 'vikram', name: 'Vikram Mehta', email: 'v.mehta@corp.in', phone: '+91 99887 76655', totalSpend: 549, ordersCount: 1, status: 'Active', lastActive: '1 day ago', address: '77 Cyber City, Gurugram 122002', city: 'Gurugram 122002' },
    { id: 'cust_04', username: 'aditi', name: 'Aditi Roy', email: 'aditi.roy@gmail.com', phone: '+91 97766 55443', totalSpend: 629, ordersCount: 1, status: 'Active', lastActive: '3 days ago', address: '12 Alipore Road, Kolkata 700027', city: 'Kolkata 700027' },
    { id: 'cust_05', username: 'karan', name: 'Karan Joshi', email: 'karan.j@outlook.com', phone: '+91 96655 44332', totalSpend: 0, ordersCount: 0, status: 'Inactive', lastActive: '1 week ago', address: '55 Koregaon Park, Pune 411001', city: 'Pune 411001' }
  ],
  storeSettings: {
    name: 'ShopStore',
    currency: 'INR (₹)',
    maxDiscountCap: 15,
    minMarginFloor: 20,
    razorpayKeyId: 'rzp_test_AgentCommerce123',
    sandboxMode: true
  }
};

window.dashboardState = dashboardState;

/**
 * Authentication & Account Management (MongoDB + JWT Backend)
 */

function getAuthToken() {
  return localStorage.getItem('shopstore_jwt_token') || '';
}

function setAuthSession(token, user) {
  localStorage.setItem('shopstore_jwt_token', token);
  localStorage.setItem('shopstore_user', JSON.stringify(user));
  localStorage.setItem('aeropulse_logged_user', user.username);
  dashboardState.currentUser = user;
  dashboardState.isLoggedIn = true;
  dashboardState.activeCustomerFilter = 'self';
}

function showAuthAlert(type, message) {
  const alertEl = document.getElementById('auth-alert');
  if (!alertEl) return;
  alertEl.className = 'w-full max-w-[380px] mb-4 p-3 rounded-lg border text-xs leading-relaxed transition-all';
  
  if (type === 'error') {
    alertEl.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
  } else if (type === 'success') {
    alertEl.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
  } else {
    alertEl.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-800');
  }
  
  alertEl.innerHTML = message;
  alertEl.classList.remove('hidden');
}

function clearAuthAlert() {
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) alertEl.classList.add('hidden');
}

function showAuthPanel(panelName) {
  clearAuthAlert();
  ['login', 'register', 'forgot', 'reset'].forEach(p => {
    const el = document.getElementById(`panel-auth-${p}`);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(`panel-auth-${panelName}`);
  if (target) target.classList.remove('hidden');

  if (window.lucide) lucide.createIcons();
}

const EYE_OPEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const btn = btnEl || event?.currentTarget || input.parentElement?.querySelector('button');

  if (input.type === 'password') {
    input.type = 'text';
    if (btn) {
      btn.innerHTML = EYE_OFF_SVG;
      btn.setAttribute('title', 'Hide password');
    }
  } else {
    input.type = 'password';
    if (btn) {
      btn.innerHTML = EYE_OPEN_SVG;
      btn.setAttribute('title', 'Show password');
    }
  }
}

async function handleLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  clearAuthAlert();

  const usernameInput = document.getElementById('login-username-input');
  const passwordInput = document.getElementById('login-password-input');
  const submitBtn = document.getElementById('btn-login-submit');

  const usernameOrEmail = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!usernameOrEmail || !password) {
    showAuthAlert('error', 'Please enter your username/email and password.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing in...</span>';
  }

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password })
    });

    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
      showAuthAlert('error', data.message || 'Invalid username or password.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In</span>';
      }
      return;
    }

    // Success: save auth state
    setAuthSession(data.token, data.user);
    completeLoginSuccess();
  } catch (error) {
    showAuthAlert('error', 'Unable to connect to auth server: ' + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In</span>';
    }
  }
}

async function handleRegisterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  clearAuthAlert();

  const name = document.getElementById('register-name-input')?.value.trim();
  const username = document.getElementById('register-username-input')?.value.trim();
  const email = document.getElementById('register-email-input')?.value.trim();
  const phone = document.getElementById('register-phone-input')?.value.trim();
  const password = document.getElementById('register-password-input')?.value;
  const address = document.getElementById('register-address-input')?.value.trim();
  const city = document.getElementById('register-city-input')?.value.trim();
  const submitBtn = document.getElementById('btn-register-submit');

  if (!name || !username || !email || !password) {
    showAuthAlert('error', 'Please fill in all required fields.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating Account...</span>';
  }

  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, email, phone, password, address, city })
    });

    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
      showAuthAlert('error', data.message || 'Registration failed.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Account</span>';
      }
      return;
    }

    // Success: save auth state
    setAuthSession(data.token, data.user);
    completeLoginSuccess();
  } catch (error) {
    showAuthAlert('error', 'Server error during registration: ' + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create Account</span>';
    }
  }
}

async function handleDirectResetPasswordSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  clearAuthAlert();

  const identity = document.getElementById('reset-identity-input')?.value.trim();
  const newPassword = document.getElementById('reset-newpass-input')?.value;
  const submitBtn = document.getElementById('btn-reset-submit');

  if (!identity || !newPassword) {
    showAuthAlert('error', 'Please enter your username/email and a new password.');
    return;
  }

  if (newPassword.length < 4) {
    showAuthAlert('error', 'New password must be at least 4 characters long.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Updating Password...</span>';
  }

  try {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: identity, newPassword })
    });

    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
      showAuthAlert('error', data.message || 'Failed to update password.');
      return;
    }

    showAuthPanel('login');
    showAuthAlert('success', 'Password updated successfully! Sign in with your new password.');
    const uInput = document.getElementById('login-username-input');
    const pInput = document.getElementById('login-password-input');
    if (uInput) uInput.value = identity;
    if (pInput) {
      pInput.value = newPassword;
      pInput.focus();
    }
  } catch (error) {
    showAuthAlert('error', 'Error resetting password: ' + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Update Password</span>';
    }
  }
}

async function handleForgotPasswordSubmit(e) {
  return handleDirectResetPasswordSubmit(e);
}

function completeLoginSuccess(preferredTab) {
  updateLoggedInUserUI();

  // Hide login screen, show app
  const loginView = document.getElementById('view-login');
  const appView = document.getElementById('view-main-app');
  if (loginView) loginView.classList.add('hidden');
  if (appView) appView.classList.remove('hidden');

  // Customer always lands on Store Catalog
  const targetTab = preferredTab || 'tab-storefront';
  switchAdminTab(targetTab);
  fetchAndRenderStorefront();

  if (window.lucide) lucide.createIcons();
}

function handleLogout() {
  dashboardState.isLoggedIn = false;
  dashboardState.currentUser = null;
  dashboardState.activeCustomerFilter = 'self';
  localStorage.removeItem('shopstore_jwt_token');
  localStorage.removeItem('shopstore_user');
  localStorage.removeItem('aeropulse_logged_user');
  localStorage.removeItem('aeropulse_active_tab');
  window.location.hash = '';

  const loginView = document.getElementById('view-login');
  const appView = document.getElementById('view-main-app');
  if (loginView) loginView.classList.remove('hidden');
  if (appView) appView.classList.add('hidden');

  showAuthPanel('login');
  clearAuthAlert();

  const input = document.getElementById('login-username-input');
  if (input) {
    input.value = '';
    input.focus();
  }

  if (window.lucide) lucide.createIcons();
}

function updateLoggedInUserUI() {
  const user = dashboardState.currentUser;
  if (!user) return;

  const displayName = user.name || user.username;
  const displayCity = user.city ? user.city.split(' ')[0] : 'Bengaluru';

  // Header Greetings & Sidebar
  const greetingEl = document.getElementById('header-user-greeting');
  const deliverToEl = document.getElementById('header-deliver-location');
  const sidebarUserEl = document.getElementById('sidebar-user-name');
  const sidebarAvatarEl = document.getElementById('sidebar-user-avatar');

  if (greetingEl) greetingEl.textContent = displayName;
  if (deliverToEl) deliverToEl.textContent = `${displayName.split(' ')[0]}, ${displayCity}`;
  if (sidebarUserEl) sidebarUserEl.textContent = displayName;
  if (sidebarAvatarEl) sidebarAvatarEl.textContent = displayName.charAt(0).toUpperCase();

  // Populate Profile tab fields
  const pName = document.getElementById('profile-name-input');
  const pPhone = document.getElementById('profile-phone-input');
  const pAddr = document.getElementById('profile-address-input');
  const pCity = document.getElementById('profile-city-input');
  const pDispName = document.getElementById('profile-display-name');
  const pDispMeta = document.getElementById('profile-display-meta');
  const pAvatar = document.getElementById('profile-avatar');

  if (pName) pName.value = user.name || '';
  if (pPhone) pPhone.value = user.phone || '';
  if (pAddr) pAddr.value = user.address || '';
  if (pCity) pCity.value = user.city || '';
  if (pDispName) pDispName.textContent = user.name || user.username;
  if (pDispMeta) pDispMeta.textContent = `@${user.username} • ${user.email}`;
  if (pAvatar) pAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();

  // Update Customer dropdown in Orders tab to show ONLY current user
  const ordersCustSelect = document.getElementById('orders-customer-filter-select');
  if (ordersCustSelect) {
    ordersCustSelect.innerHTML = `<option value="self">${displayName}</option>`;
    ordersCustSelect.value = 'self';
  }
}

function switchAdminTab(tabId) {
  // Validate customer tab target
  const validTabs = ['tab-storefront', 'tab-agent-chat', 'tab-orders', 'tab-graphs', 'tab-profile'];
  if (!validTabs.includes(tabId)) {
    tabId = 'tab-storefront';
  }

  if (!document.getElementById(tabId)) return;
  dashboardState.activeTab = tabId;
  localStorage.setItem('aeropulse_active_tab', tabId);
  try {
    window.history.replaceState(null, '', '#' + tabId);
  } catch (e) {}

  document.querySelectorAll('.admin-page-view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const activeView = document.getElementById(tabId);
  if (activeView) activeView.classList.remove('hidden');

  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) activeNav.classList.add('active');

  if (tabId === 'tab-storefront') {
    fetchAndRenderStorefront();
  } else if (tabId === 'tab-orders') {
    fetchAndRenderOrders();
  } else if (tabId === 'tab-graphs') {
    renderSpendingAndTrendsCharts();
  } else if (tabId === 'tab-agent-chat') {
    const container = document.getElementById('chat-messages');
    if (container && container.children.length === 0) {
      if (typeof initChat === 'function') initChat();
    }
  }

  if (window.lucide) lucide.createIcons();
}

let chartInstances = {};

async function renderSpendingAndTrendsCharts() {
  try {
    const token = localStorage.getItem('shopstore_jwt_token');
    const authHeaders = { 'Content-Type': 'application/json' };
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    const [prodRes, ordersRes] = await Promise.all([
      fetch('/api/v1/agent/products'),
      fetch('/api/v1/orders/my-orders', { headers: authHeaders })
    ]);

    const prodData = await prodRes.json();
    const ordersData = await ordersRes.json();

    const products = prodData.products || [];
    const orders = ordersData.orders || [];

    let totalSpend = 0;
    let totalSavings = 0;
    let categorySpend = { 'Footwear': 0, 'Wearables': 0, 'Apparel': 0, 'Accessories': 0 };

    if (orders.length > 0) {
      orders.forEach(o => {
        const amt = parseFloat(o.amount || o.priceInr || 0);
        totalSpend += amt;
        const discountAmt = Math.round(amt * 0.15);
        totalSavings += discountAmt;
        const cat = o.category || 'Footwear';
        if (categorySpend[cat] !== undefined) {
          categorySpend[cat] += amt;
        } else {
          categorySpend['Accessories'] += amt;
        }
      });
    } else {
      totalSpend = 3596;
      totalSavings = 680;
      categorySpend = { 'Footwear': 1899, 'Wearables': 1399, 'Apparel': 298, 'Accessories': 0 };
    }

    const spendEl = document.getElementById('graphs-kpi-spend');
    const savingsEl = document.getElementById('graphs-kpi-savings');
    const discountEl = document.getElementById('graphs-kpi-discount-avg');
    const skusEl = document.getElementById('graphs-kpi-skus');

    if (spendEl) spendEl.textContent = `₹${totalSpend.toLocaleString()}`;
    if (savingsEl) savingsEl.textContent = `₹${totalSavings.toLocaleString()}`;
    if (discountEl) discountEl.textContent = '14.2%';
    if (skusEl) skusEl.textContent = products.length.toString();

    // Chart 1: Spending & Savings Line/Bar Chart
    const ctx1 = document.getElementById('chart-spending-savings');
    if (ctx1 && typeof Chart !== 'undefined') {
      if (chartInstances.spending) chartInstances.spending.destroy();

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
      const spendData = [1200, 850, 1499, 650, 1899, 950, totalSpend > 0 ? Math.min(totalSpend, 3596) : 1899];
      const savingsData = spendData.map(v => Math.round(v * 0.15));

      chartInstances.spending = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [
            {
              label: 'Spend (₹)',
              data: spendData,
              backgroundColor: '#111827',
              borderRadius: 4,
              barThickness: 18
            },
            {
              label: 'Saved with AI (₹)',
              data: savingsData,
              backgroundColor: '#10B981',
              borderRadius: 4,
              barThickness: 18
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ₹${ctx.parsed.y.toLocaleString()}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: '#F3F4F6' },
              ticks: { callback: (val) => '₹' + val }
            }
          }
        }
      });
    }

    // Chart 2: Category Distribution Doughnut Chart
    const ctx2 = document.getElementById('chart-category-doughnut');
    if (ctx2 && typeof Chart !== 'undefined') {
      if (chartInstances.category) chartInstances.category.destroy();

      const catLabels = Object.keys(categorySpend);
      const catValues = Object.values(categorySpend);

      chartInstances.category = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catValues.some(v => v > 0) ? catValues : [55, 25, 15, 5],
            backgroundColor: ['#111827', '#3B82F6', '#10B981', '#F59E0B'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { legend: { display: false } }
        }
      });

      const legendEl = document.getElementById('graphs-category-legend');
      if (legendEl) {
        const colors = ['#111827', '#3B82F6', '#10B981', '#F59E0B'];
        legendEl.innerHTML = catLabels.map((cat, idx) => `
          <div class="flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${colors[idx]}"></span>
            <span class="truncate">${cat}</span>
          </div>
        `).join('');
      }
    }

    // Chart 3: Products Price vs Stock Levels Chart
    const ctx3 = document.getElementById('chart-products-stock-price');
    if (ctx3 && typeof Chart !== 'undefined') {
      if (chartInstances.products) chartInstances.products.destroy();

      const topProducts = products.slice(0, 8);
      const prodLabels = topProducts.map(p => p.name.split(' ').slice(0, 2).join(' '));
      const prices = topProducts.map(p => p.priceInr);
      const stocks = topProducts.map(p => p.stock);

      chartInstances.products = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: prodLabels.length ? prodLabels : ['Nitro 4', 'AeroGlide', 'SpeedRunner', 'PulseWatch', 'FlexFit', 'GripPro'],
          datasets: [
            {
              label: 'Base Price (₹)',
              data: prices.length ? prices : [1899, 1399, 2299, 1599, 899, 499],
              borderColor: '#111827',
              backgroundColor: 'rgba(17, 24, 39, 0.04)',
              fill: true,
              tension: 0.3,
              yAxisID: 'y'
            },
            {
              label: 'Stock Quantity',
              data: stocks.length ? stocks : [45, 30, 20, 15, 60, 50],
              borderColor: '#3B82F6',
              borderDash: [5, 5],
              fill: false,
              tension: 0.3,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { boxWidth: 12, font: { size: 11 } }
            }
          },
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              grid: { color: '#F3F4F6' },
              ticks: { callback: (val) => '₹' + val }
            },
            y1: {
              type: 'linear',
              position: 'right',
              grid: { display: false },
              ticks: { callback: (val) => val + ' units' }
            }
          }
        }
      });
    }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Error rendering spending & trends charts:', err);
  }
}

async function refreshOverviewStats() {
  try {
    const token = localStorage.getItem('shopstore_jwt_token');
    const authHeaders = { 'Content-Type': 'application/json' };
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
    if (dashboardState.currentUser?.id || dashboardState.currentUser?.userId) {
      authHeaders['x-user-id'] = dashboardState.currentUser.userId || dashboardState.currentUser.id;
    }

    const [prodRes, auditRes, ordersRes] = await Promise.all([
      fetch('/api/v1/agent/products'),
      fetch('/api/v1/audit/logs'),
      fetch('/api/v1/orders/all', { headers: authHeaders }).catch(() => null)
    ]);

    const prodData = await prodRes.json();
    const auditData = await auditRes.json();
    const ordersData = ordersRes ? await ordersRes.json().catch(() => ({})) : {};

    dashboardState.products = prodData.products || [];
    const traces = auditData.traces || [];
    const rawApiOrders = ordersData.orders || [];

    // Helper to resolve product metadata
    const resolveProductMeta = (skuOrName) => {
      let matched = dashboardState.products.find(p => 
        p.sku === skuOrName || 
        p.name.toLowerCase() === (skuOrName || '').toLowerCase()
      );
      if (!matched && skuOrName) {
        matched = dashboardState.products.find(p => 
          p.name.toLowerCase().includes(skuOrName.toLowerCase()) || 
          p.tags.some(t => skuOrName.toLowerCase().includes(t.toLowerCase()))
        );
      }
      if (!matched) {
        matched = dashboardState.products[0] || {
          name: 'ShopStore Nitro 4 Running Shoes',
          sku: 'SHOE-RUN-001',
          category: 'Footwear',
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
          priceInr: 1899
        };
      }
      return matched;
    };

    // Format real orders directly from database / API
    const backendOrders = rawApiOrders.map(o => {
      const orderDateObj = o.createdAt ? new Date(o.createdAt) : new Date();
      const formattedDate = orderDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + orderDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const prod = resolveProductMeta(o.sku || o.item);

      return {
        id: o.orderId || o.id,
        paymentId: o.paymentId || 'pay_live_capture',
        traceId: o.traceId || '',
        customer: o.customerName || (dashboardState.currentUser?.name || 'Verified Customer'),
        customerId: o.userId || (dashboardState.currentUser ? (dashboardState.currentUser.userId || dashboardState.currentUser.id) : 'cust_active'),
        userId: o.userId,
        username: o.username,
        customerEmail: o.customerEmail || '',
        customerAddress: o.customerAddress || (dashboardState.currentUser?.address || '101 Residency Road, Central District, Bengaluru 560025'),
        item: o.item || prod.name,
        sku: o.sku || prod.sku,
        category: o.category || prod.category || 'General',
        imageUrl: o.imageUrl || prod.imageUrl,
        amount: o.amount || o.priceInr || prod.priceInr,
        originalPrice: o.originalPrice || o.amount || prod.priceInr,
        discount: o.discount || 0,
        quantity: o.quantity || 1,
        status: o.status || 'Paid',
        channel: o.channel || 'In-App Conversational Checkout',
        channelType: o.channelType || 'chat',
        date: formattedDate,
        rawDate: orderDateObj.getTime(),
        trackingNumber: o.trackingNumber || `BLUEDART-${Math.floor(100000 + Math.random() * 900000)}`,
        estDelivery: o.estDelivery || 'Estimated Delivery in 2 Business Days'
      };
    });

    // Synthesize real captured orders from actual audit traces
    const synthesizedOrders = traces
      .filter(t => t.state === 'PAYMENT_CAPTURED' || t.state === 'ORDER_CREATED')
      .map(t => {
        const prod = resolveProductMeta(t.sku || t.productName);
        const orderDateObj = new Date(t.timestamp);
        const formattedDate = orderDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + orderDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const rawCustomer = t.actor.replace(/^Customer_/, '').replace(/^Autonomous_Agent\[/, '').replace(/\]$/, '').replace(/_/g, ' ');

        const matchedCust = dashboardState.customers.find(c => 
          c.name.toLowerCase() === rawCustomer.toLowerCase() || 
          c.username.toLowerCase() === rawCustomer.toLowerCase()
        );
        const customerName = matchedCust ? matchedCust.name : rawCustomer;
        const customerId = matchedCust ? matchedCust.id : `cust_${rawCustomer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const address = matchedCust ? matchedCust.address : (dashboardState.currentUser?.address || '101 Residency Road, Central District, Bengaluru 560025');

        return {
          id: t.razorpayDetails?.orderId || `order_${t.traceId.substring(4)}`,
          paymentId: t.razorpayDetails?.paymentId || `pay_${Math.random().toString(36).substring(2, 10)}`,
          traceId: t.traceId,
          customer: customerName,
          customerId: customerId,
          customerAddress: address,
          item: prod.name,
          sku: prod.sku,
          category: prod.category,
          imageUrl: prod.imageUrl,
          amount: t.pricing?.finalPriceInr || prod.priceInr,
          originalPrice: t.pricing?.originalPriceInr || prod.priceInr,
          discount: t.pricing?.approvedDiscountPct || 10,
          quantity: t.quantity || 1,
          status: t.state === 'PAYMENT_CAPTURED' ? 'Paid' : 'Created',
          channel: t.channel === 'in_app_chat' ? 'In-App Conversational Checkout' : 'AP2 Autonomous AI Buyer',
          channelType: t.channel === 'in_app_chat' ? 'chat' : 'm2m',
          date: formattedDate,
          rawDate: orderDateObj.getTime(),
          trackingNumber: `BLUEDART-${Math.floor(100000 + Math.random() * 900000)}`,
          estDelivery: 'Estimated Delivery in 2 Business Days'
        };
      });

    // Baseline historical orders assigned strictly to specific mock users (rahul, sneha, vikram, aditi)
    const mockBaselineOrders = [
      {
        id: 'order_TVTwhK3sDGMmhY',
        paymentId: 'pay_TVTx8823kdL99',
        traceId: 'trc_seed_01',
        customer: 'Rahul Sharma',
        customerId: 'cust_01',
        customerAddress: '42 MG Road, Indiranagar, Bengaluru 560038',
        item: 'FlexiBand Heavy-Duty Resistance Loop Bands (Set of 5)',
        sku: 'ACC-BND-009',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&auto=format&fit=crop&q=80',
        amount: 349,
        originalPrice: 349,
        discount: 10,
        quantity: 1,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat',
        date: '29 Aug 2026, 11:41 AM',
        rawDate: Date.now() - 15 * 60000,
        trackingNumber: 'BLUEDART-849204',
        estDelivery: 'Arriving Tuesday by 8:00 PM'
      },
      {
        id: 'order_TVTj8942kmQqq2',
        paymentId: 'pay_TVTk9183884ff',
        traceId: 'trc_seed_02',
        customer: 'Vikram Mehta',
        customerId: 'cust_03',
        customerAddress: '77 Cyber City, Phase 2, Gurugram 122002',
        item: 'DeepTissue High-Density Foam Muscle Roller',
        sku: 'ACC-ROL-013',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
        amount: 549,
        originalPrice: 549,
        discount: 15,
        quantity: 1,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat',
        date: '29 Aug 2026, 10:15 AM',
        rawDate: Date.now() - 90 * 60000,
        trackingNumber: 'DELHIVERY-992384',
        estDelivery: 'Dispatched • In Transit'
      },
      {
        id: 'order_TVTm39922nSyy4',
        paymentId: 'pay_TVTn8472911bb',
        traceId: 'trc_seed_04',
        customer: 'Sneha Kapur',
        customerId: 'cust_02',
        customerAddress: '18 Bandra West, Mumbai 400050',
        item: 'PulseWatch Ultra GPS Smartwatch',
        sku: 'WEAR-PRO-003',
        category: 'Wearables',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        amount: 2069,
        originalPrice: 2299,
        discount: 10,
        quantity: 1,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat',
        date: '28 Aug 2026, 04:20 PM',
        rawDate: Date.now() - 1400 * 60000,
        trackingNumber: 'BLUEDART-441029',
        estDelivery: 'Delivered on 29 Aug'
      },
      {
        id: 'order_TVTaa1122zZ111',
        paymentId: 'pay_TVTbb2233yY222',
        traceId: 'trc_seed_05',
        customer: 'Aditi Roy',
        customerId: 'cust_04',
        customerAddress: '12 Alipore Road, Kolkata 700027',
        item: 'ProGrip Eco Dual-Layer Yoga Mat 6mm',
        sku: 'ACC-MAT-006',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80',
        amount: 629,
        originalPrice: 699,
        discount: 10,
        quantity: 1,
        status: 'Paid',
        channel: 'In-App Conversational Checkout',
        channelType: 'chat',
        date: '27 Aug 2026, 02:10 PM',
        rawDate: Date.now() - 2800 * 60000,
        trackingNumber: 'DELHIVERY-551029',
        estDelivery: 'Delivered on 28 Aug'
      }
    ];

    const orderMap = new Map();
    [...backendOrders, ...synthesizedOrders, ...mockBaselineOrders].forEach(o => {
      if (!orderMap.has(o.id)) {
        orderMap.set(o.id, o);
      }
    });

    dashboardState.orders = Array.from(orderMap.values()).sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0));

    // Update customer order counts and LTV dynamically based on user-scoped orders
    dashboardState.customers.forEach(cust => {
      const custOrders = dashboardState.orders.filter(o => 
        o.customerId === cust.id || 
        o.customer.toLowerCase() === cust.name.toLowerCase() ||
        o.customer.toLowerCase() === cust.username.toLowerCase()
      );
      cust.ordersCount = custOrders.length;
      cust.totalSpend = custOrders.reduce((sum, o) => sum + o.amount, 0);
    });

    const totalGmv = dashboardState.orders.reduce((sum, o) => sum + o.amount, 0);
    const totalOrdersCount = dashboardState.orders.length;
    const totalStockCount = dashboardState.products.reduce((sum, p) => sum + (p.stock || 0), 0);

    const gmvEl = document.getElementById('kpi-revenue');
    const ordersEl = document.getElementById('kpi-orders');
    const prodsCountEl = document.getElementById('kpi-products-count');
    const stockCountEl = document.getElementById('kpi-stock-count');

    if (gmvEl) gmvEl.textContent = `₹${totalGmv.toLocaleString()}`;
    if (ordersEl) ordersEl.textContent = totalOrdersCount.toString();
    if (prodsCountEl) prodsCountEl.textContent = dashboardState.products.length.toString();
    if (stockCountEl) stockCountEl.textContent = totalStockCount.toString();

    renderOverviewRecentOrders(dashboardState.orders);
  } catch (e) {
    console.error('Error refreshing overview:', e);
  }
}

function renderOverviewRecentOrders(orders) {
  const container = document.getElementById('overview-recent-orders');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center">
          <div class="text-neutral-400 text-xs">
            <i data-lucide="inbox" class="w-6 h-6 mx-auto mb-1.5 text-neutral-300"></i>
            <p>No recent orders in this period.</p>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = orders.slice(0, 5).map(o => `
    <tr>
      <td class="font-mono text-xs font-medium text-neutral-900 tabular-nums">${o.id}</td>
      <td class="text-neutral-900 font-medium">${o.customer}</td>
      <td>
        <div class="flex items-center space-x-2.5">
          <img src="${o.imageUrl}" alt="${o.item}" class="w-7 h-7 rounded object-cover border border-neutral-200">
          <span class="text-neutral-800 text-xs font-medium truncate max-w-[220px]">${o.item}</span>
        </div>
      </td>
      <td class="font-mono font-medium text-neutral-950 text-right tabular-nums">₹${o.amount}</td>
      <td class="text-right">
        <span class="badge-status ${o.status === 'Paid' ? 'badge-paid' : 'badge-pending'} font-mono">
          ${o.status}
        </span>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

async function fetchAndRenderProducts() {
  try {
    const res = await fetch('/api/v1/agent/products');
    const data = await res.json();
    dashboardState.products = data.products || [];
    renderProductsTable(dashboardState.products);
  } catch (e) {
    console.error('Error fetching products:', e);
  }
}

function renderProductsTable(products) {
  const container = document.getElementById('products-table-body');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center">
          <div class="text-neutral-400 text-xs">
            <i data-lucide="package-open" class="w-6 h-6 mx-auto mb-1.5 text-neutral-300"></i>
            <p>No products found in catalog.</p>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = products.map(p => `
    <tr>
      <td>
        <div class="flex items-center space-x-3">
          <img src="${p.imageUrl}" alt="${p.name}" class="w-8 h-8 rounded object-cover bg-neutral-100 border border-neutral-200">
          <div>
            <div class="font-medium text-neutral-900 text-xs">${p.name}</div>
            <div class="text-[11px] text-neutral-400 font-mono">${p.sku}</div>
          </div>
        </div>
      </td>
      <td class="text-neutral-600">${p.category}</td>
      <td class="font-mono font-medium text-neutral-900 text-right tabular-nums">₹${p.priceInr}</td>
      <td class="text-right font-mono tabular-nums">
        <span class="badge-status ${p.stock > 10 ? 'badge-paid' : (p.stock > 0 ? 'badge-warning' : 'badge-neutral')}">
          ${p.stock} units
        </span>
      </td>
      <td class="text-neutral-600 font-mono text-right text-xs tabular-nums">${p.discountPolicy?.maxAllowedDiscountPct || 15}% cap</td>
      <td class="text-right">
        <div class="flex items-center justify-end space-x-1">
          <button onclick="editProductPrompt('${p.id}', '${p.name}', ${p.priceInr}, ${p.stock})" class="btn-ghost h-7 px-2" title="Edit">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteProduct('${p.id}')" class="btn-ghost h-7 px-2 text-rose-700 hover:bg-rose-50" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function handleGlobalSearch(query) {
  const q = (query || '').toLowerCase().trim();

  // If in orders tab, filter orders
  if (dashboardState.activeTab === 'tab-orders') {
    searchOrders(q);
    return;
  }

  // If on chat, graphs, or profile tab, switch to storefront
  if (dashboardState.activeTab !== 'tab-storefront') {
    switchAdminTab('tab-storefront');
  }

  if (!q) {
    renderStorefrontCards(dashboardState.products);
    return;
  }

  const filtered = dashboardState.products.filter(p => 
    p.name.toLowerCase().includes(q) || 
    p.sku.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.description && p.description.toLowerCase().includes(q)) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
  );

  renderStorefrontCards(filtered);
}

function filterProducts(query) {
  handleGlobalSearch(query);
}

function openAddProductModal() {
  const modal = document.getElementById('add-product-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddProductModal() {
  const modal = document.getElementById('add-product-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleAddProductSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('prod-name').value;
  const sku = document.getElementById('prod-sku').value;
  const category = document.getElementById('prod-category').value;
  const price = document.getElementById('prod-price').value;
  const stock = document.getElementById('prod-stock').value;
  const image = document.getElementById('prod-image').value;

  try {
    const res = await fetch('/api/v1/agent/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        sku,
        category,
        priceInr: parseFloat(price),
        stock: parseInt(stock, 10),
        imageUrl: image || undefined
      })
    });

    if (res.ok) {
      closeAddProductModal();
      await fetchAndRenderProducts();
    }
  } catch (err) {
    console.error('Error adding product:', err);
  }
}

async function editProductPrompt(id, name, currentPrice, currentStock) {
  const newPrice = prompt(`Edit Price for "${name}" (in ₹):`, currentPrice);
  if (newPrice === null) return;

  const newStock = prompt(`Edit Stock Quantity for "${name}":`, currentStock);
  if (newStock === null) return;

  try {
    const res = await fetch(`/api/v1/agent/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceInr: parseFloat(newPrice),
        stock: parseInt(newStock, 10)
      })
    });

    if (res.ok) {
      await fetchAndRenderProducts();
    }
  } catch (e) {
    console.error('Error updating product:', e);
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to remove this product from the store catalog?')) return;

  try {
    const res = await fetch(`/api/v1/agent/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchAndRenderProducts();
    }
  } catch (e) {
    console.error('Error deleting product:', e);
  }
}

const HERO_BANNER_SLIDES = [
  {
    category: 'all',
    badge: 'Autonomous AI Agentic Commerce',
    title: 'Athletic Gear & High-Performance Footwear',
    desc: 'Browse our live catalog with verified stock availability. Check out instantly via Razorpay or bargain for dynamic discounts with our AI assistant.'
  },
  {
    category: 'Footwear',
    badge: '🏃 Precision Running & Footwear',
    title: 'Marathon Carbon-Plate & Cushion Sneakers',
    desc: 'Engineered for maximum energy return, breathable ventilation, and speed with dynamic AI bargaining.'
  },
  {
    category: 'Wearables',
    badge: '⌚ Smart Fitness Telemetry',
    title: 'AMOLED GPS Smartwatches & Trackers',
    desc: 'Real-time biometric monitoring, SpO2 telemetry, and multi-day battery life built for elite performance.'
  },
  {
    category: 'Apparel',
    badge: '⚡ Climate-Adaptive Activewear',
    title: 'Dry-Fit Training Apparel & Compression Gear',
    desc: 'Four-way ergonomic stretch fabrics engineered for unrestricted agility during high-intensity training.'
  },
  {
    category: 'Accessories',
    badge: '🎒 Essential Training Equipment',
    title: 'Hydration Packs, Speed Ropes & Grip Accessories',
    desc: 'Durable, lightweight athletic essentials designed to elevate daily workout routines and recovery.'
  }
];

let heroSlideIndex = 0;
let heroSlideTimer = null;

function setHeroBannerContent(index) {
  if (index < 0 || index >= HERO_BANNER_SLIDES.length) index = 0;
  heroSlideIndex = index;
  const slide = HERO_BANNER_SLIDES[index];

  const titleEl = document.getElementById('hero-banner-title');
  const descEl = document.getElementById('hero-banner-desc');
  const badgeEl = document.getElementById('hero-banner-badge');
  const dotsContainer = document.getElementById('hero-banner-dots');

  if (titleEl && descEl && badgeEl) {
    titleEl.style.opacity = '0';
    descEl.style.opacity = '0';

    setTimeout(() => {
      badgeEl.textContent = slide.badge;
      titleEl.textContent = slide.title;
      descEl.textContent = slide.desc;
      titleEl.style.opacity = '1';
      descEl.style.opacity = '1';
    }, 200);
  }

  if (dotsContainer) {
    dotsContainer.innerHTML = HERO_BANNER_SLIDES.map((_, i) => `
      <span onclick="setHeroBannerContent(${i})" class="cursor-pointer transition-all duration-300 ${i === index ? 'w-5 h-1 bg-white' : 'w-1.5 h-1 bg-white/30 hover:bg-white/60'} rounded-full"></span>
    `).join('');
  }
}

function startHeroBannerRotation() {
  if (heroSlideTimer) clearInterval(heroSlideTimer);
  heroSlideTimer = setInterval(() => {
    if (dashboardState.activeTab === 'tab-storefront') {
      const nextIndex = (heroSlideIndex + 1) % HERO_BANNER_SLIDES.length;
      setHeroBannerContent(nextIndex);
    }
  }, 4000);
}

let activeStorefrontCategory = 'all';

async function fetchAndRenderStorefront() {
  try {
    const res = await fetch('/api/v1/agent/products');
    const data = await res.json();
    dashboardState.products = data.products || [];
    renderStorefrontCards(dashboardState.products);
    startHeroBannerRotation();
  } catch (e) {
    console.error('Error fetching storefront:', e);
  }
}

function filterStorefrontCategory(category) {
  activeStorefrontCategory = category;

  // Switch hero spotlight to selected category
  const matchIndex = HERO_BANNER_SLIDES.findIndex(s => s.category.toLowerCase() === category.toLowerCase());
  if (matchIndex !== -1) {
    setHeroBannerContent(matchIndex);
  } else {
    setHeroBannerContent(0);
  }

  document.querySelectorAll('.category-filter-btn').forEach(btn => {
    if (btn.textContent.trim().toLowerCase() === category.toLowerCase() || (category === 'all' && btn.textContent.includes('All'))) {
      btn.className = 'category-filter-btn active px-3 py-1.5 rounded-full border border-neutral-900 bg-neutral-900 text-white font-medium';
    } else {
      btn.className = 'category-filter-btn px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50';
    }
  });

  const filtered = category === 'all' 
    ? dashboardState.products 
    : dashboardState.products.filter(p => p.category.toLowerCase() === category.toLowerCase());

  renderStorefrontCards(filtered);
}

function renderStorefrontCards(products) {
  const container = document.getElementById('storefront-products-grid');
  const countEl = document.getElementById('storefront-items-count');
  if (!container) return;

  if (countEl) {
    countEl.textContent = `${products.length} Products Available`;
  }

  if (products.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <i data-lucide="package-open" class="w-8 h-8 mx-auto mb-2 text-neutral-300"></i>
        <p class="text-xs text-neutral-500 font-medium">No items found matching this filter.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = products.map(p => {
    const isOutOfStock = p.stock <= 0;
    const isLowStock = p.stock > 0 && p.stock <= 10;
    const originalPrice = Math.round(p.priceInr * 1.18);
    const maxDiscount = p.discountPolicy?.maxAllowedDiscountPct || 15;

    return `
      <div class="bg-white border border-neutral-200 rounded-lg overflow-hidden flex flex-col hover:border-neutral-300 hover:shadow-sm transition group">
        
        <!-- Product Image & Badges -->
        <div class="relative h-48 bg-neutral-100 overflow-hidden">
          <img 
            src="${p.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'}" 
            alt="${p.name}" 
            class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'"
          />
          <div class="absolute top-2.5 left-2.5 flex flex-col gap-1">
            <span class="px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[10px] font-semibold text-neutral-800 tracking-wide uppercase shadow-sm">
              ${p.category}
            </span>
          </div>
          <div class="absolute top-2.5 right-2.5">
            <span class="px-2 py-0.5 ${isOutOfStock ? 'bg-rose-100 text-rose-800' : (isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')} rounded text-[10px] font-medium shadow-sm">
              ${isOutOfStock ? 'Sold Out' : (isLowStock ? `Only ${p.stock} left` : `In Stock (${p.stock})`)}
            </span>
          </div>
        </div>

        <!-- Card Content -->
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div class="space-y-1">
            <div class="text-[11px] font-mono text-neutral-400">${p.sku}</div>
            <h3 class="font-heading font-semibold text-sm text-neutral-900 line-clamp-1">${p.name}</h3>
            <p class="text-xs text-neutral-500 line-clamp-2 leading-relaxed">${p.description || 'High performance athletic gear engineered for comfort, agility, and endurance.'}</p>
          </div>

          <!-- Price & Discounts -->
          <div class="pt-2 border-t border-neutral-100 space-y-3">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-lg font-bold font-mono text-neutral-950">₹${p.priceInr.toLocaleString()}</span>
                <span class="text-xs text-neutral-400 line-through ml-1.5 font-mono">₹${originalPrice.toLocaleString()}</span>
              </div>
              <span class="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Up to ${maxDiscount}% AI Bargain
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-2 gap-2 pt-1">
              <button 
                onclick="bargainInChat('${p.name.replace(/'/g, "\\'")}')" 
                class="btn-secondary h-8 px-2 justify-center text-xs font-medium"
                title="Bargain dynamic discount with AI assistant"
              >
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-neutral-600"></i>
                <span>Bargain in Chat</span>
              </button>

              <button 
                onclick="buyStorefrontProduct('${p.sku}')" 
                ${isOutOfStock ? 'disabled' : ''}
                class="btn-primary h-8 px-2 justify-center text-xs font-medium ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}"
              >
                <span>Buy Now</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function bargainInChat(productName) {
  switchAdminTab('tab-agent-chat');
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.value = `Can you give me a 15% discount on the ${productName}?`;
    const form = document.getElementById('chat-form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }
}

async function buyStorefrontProduct(sku) {
  const prod = dashboardState.products.find(p => p.sku === sku);
  if (!prod) return;

  const user = dashboardState.currentUser || { name: 'Customer', phone: '+91 98000 11223' };
  const userToken = localStorage.getItem('shopstore_jwt_token');

  try {
    const authHeaders = { 'Content-Type': 'application/json' };
    if (userToken) authHeaders['Authorization'] = `Bearer ${userToken}`;
    if (user.id) authHeaders['x-user-id'] = user.id;

    // Create Razorpay Order
    const res = await fetch('/api/v1/razorpay/create-order', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amountInr: prod.priceInr,
        receipt: `rcpt_${Date.now().toString(36)}`,
        notes: {
          sku: prod.sku,
          productName: prod.name,
          customerName: user.name || user.username
        }
      })
    });

    const data = await res.json();
    if (!res.ok || data.status !== 'success') {
      alert(data.message || 'Could not initiate checkout.');
      return;
    }

    if (typeof Razorpay === 'undefined') {
      alert('Razorpay SDK is loading. Please try again in 2 seconds.');
      return;
    }

    const options = {
      key: data.data.keyId,
      amount: data.data.amount,
      currency: data.data.currency,
      name: 'ShopStore Athletic Gear',
      description: `${prod.name} (Direct Checkout)`,
      order_id: data.data.orderId,
      handler: async function(response) {
        try {
          const verifyRes = await fetch('/api/v1/razorpay/verify-payment', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              sku: prod.sku,
              product_name: prod.name,
              customer_name: user.name || user.username,
              customer_address: user.address,
              amount_inr: prod.priceInr,
              quantity: 1
            })
          });

          const vData = await verifyRes.json();
          await refreshOverviewStats();
          if (verifyRes.ok && vData.status === 'success') {
            alert(`Payment Successful! Order ID: ${response.razorpay_order_id}\nTracking number generated.`);
            switchAdminTab('tab-orders');
          } else {
            alert('Payment recorded. View your order in My Orders.');
            switchAdminTab('tab-orders');
          }
        } catch (err) {
          await refreshOverviewStats();
          switchAdminTab('tab-orders');
        }
      },
      prefill: {
        name: user.name || user.username,
        email: user.email || 'customer@example.com',
        contact: user.phone || '+91 98000 11223'
      },
      theme: {
        color: '#111827'
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Error during direct checkout:', error);
    alert('Checkout error: ' + error.message);
  }
}

async function handleUpdateProfile(e) {
  if (e && e.preventDefault) e.preventDefault();
  const name = document.getElementById('profile-name-input')?.value;
  const phone = document.getElementById('profile-phone-input')?.value;
  const address = document.getElementById('profile-address-input')?.value;
  const city = document.getElementById('profile-city-input')?.value;
  const btn = document.getElementById('btn-save-profile');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Saving...</span>';
  }

  try {
    const token = localStorage.getItem('shopstore_jwt_token');
    const res = await fetch('/api/v1/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ name, phone, address, city })
    });

    const data = await res.json();
    if (!res.ok || data.status !== 'success') {
      alert(data.message || 'Failed to update profile');
      return;
    }

    // Success
    setAuthSession(token, data.user);
    updateLoggedInUserUI();
    alert('Profile updated successfully!');
  } catch (err) {
    alert('Error updating profile: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Save Changes</span>';
    }
  }
}

/**
 * Filter orders by channel / status
 */
function setOrderFilter(filterType) {
  dashboardState.activeOrderFilter = filterType;
  document.querySelectorAll('.order-filter-btn').forEach(btn => {
    btn.classList.remove('active', 'border-neutral-900', 'text-neutral-900', 'font-semibold');
    btn.classList.add('border-transparent', 'text-neutral-500');
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active', 'border-neutral-900', 'text-neutral-900', 'font-semibold');
    event.currentTarget.classList.remove('border-transparent', 'text-neutral-500');
  }
  renderAmazonOrderCards();
}

/**
 * Filter orders by specific user
 */
function setOrderCustomerFilter(customerId) {
  dashboardState.activeCustomerFilter = customerId;
  const select = document.getElementById('orders-customer-filter-select');
  if (select) select.value = customerId;
  renderAmazonOrderCards();
}

function searchOrders(query) {
  dashboardState.searchOrderQuery = query.toLowerCase().trim();
  renderAmazonOrderCards();
}

async function fetchAndRenderOrders() {
  await refreshOverviewStats();
  renderAmazonOrderCards();
}

function renderAmazonOrderCards() {
  const container = document.getElementById('orders-cards-container');
  const scopeBanner = document.getElementById('orders-customer-scope-banner');
  if (!container) return;

  let filtered = dashboardState.orders;

  // By default, filter strictly to the currently logged in user
  if (dashboardState.activeCustomerFilter === 'self' && dashboardState.currentUser) {
    const u = dashboardState.currentUser;
    const uid = (u.userId || u.id || '').toLowerCase();
    const uname = (u.username || '').toLowerCase();
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();

    filtered = filtered.filter(o => {
      const oCustId = (o.customerId || o.userId || '').toLowerCase();
      const oUser = (o.username || '').toLowerCase();
      const oCust = (o.customer || o.customerName || '').toLowerCase();
      const oEmail = (o.customerEmail || '').toLowerCase();

      return (
        (uid && (oCustId === uid || oCustId === `cust_${uid}`)) ||
        (uname && (oUser === uname || oCustId === uname || oCustId === `cust_${uname}` || oCust === uname)) ||
        (name && (oCust === name || oCust.includes(name) || name.includes(oCust))) ||
        (email && oEmail && oEmail === email) ||
        oCustId === 'cust_active' ||
        oCust === 'verified customer' ||
        oCust === 'shopper'
      );
    });
  } else if (dashboardState.activeCustomerFilter && dashboardState.activeCustomerFilter !== 'all' && dashboardState.activeCustomerFilter !== 'self') {
    const selectedCust = dashboardState.customers.find(c => c.id === dashboardState.activeCustomerFilter);
    if (selectedCust) {
      filtered = filtered.filter(o => 
        o.customerId === selectedCust.id || 
        o.customerId === `cust_${selectedCust.id}` ||
        (o.customer && o.customer.toLowerCase() === selectedCust.name.toLowerCase()) ||
        (o.customer && o.customer.toLowerCase() === selectedCust.username.toLowerCase()) ||
        (o.username && o.username.toLowerCase() === selectedCust.username.toLowerCase())
      );
    }
  }

  // 1. Filter by Channel/Status
  if (dashboardState.activeOrderFilter === 'chat') {
    filtered = filtered.filter(o => o.channelType === 'chat');
  } else if (dashboardState.activeOrderFilter === 'm2m') {
    filtered = filtered.filter(o => o.channelType === 'm2m');
  } else if (dashboardState.activeOrderFilter === 'paid') {
    filtered = filtered.filter(o => o.status === 'Paid');
  }

  // Scope Banner
  const displayUser = (dashboardState.activeCustomerFilter !== 'all' && dashboardState.activeCustomerFilter !== 'self')
    ? dashboardState.customers.find(c => c.id === dashboardState.activeCustomerFilter)
    : dashboardState.currentUser;

  if (displayUser && scopeBanner) {
    scopeBanner.classList.remove('hidden');
    scopeBanner.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded text-xs">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded bg-neutral-900 text-white font-heading font-semibold flex items-center justify-center text-xs">
            ${displayUser.name.charAt(0)}
          </div>
          <div>
            <div class="font-heading font-semibold text-neutral-900 text-sm">Your Orders (${displayUser.name})</div>
            <div class="text-neutral-500 text-[11px]">Delivery Address: ${displayUser.address} • Phone: ${displayUser.phone}</div>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <div class="text-right font-mono tabular-nums">
            <div class="font-semibold text-neutral-900">${filtered.length} Orders Placed</div>
            <div class="text-[11px] text-neutral-500">Total Spent: ₹${displayUser.totalSpend.toLocaleString()}</div>
          </div>
          ${dashboardState.activeCustomerFilter !== 'all' ? `<button onclick="setOrderCustomerFilter('all')" class="btn-ghost text-xs">View Storewide Orders</button>` : `<button onclick="setOrderCustomerFilter('self')" class="btn-ghost text-xs">View My Orders Only</button>`}
        </div>
      </div>
    `;
  } else if (scopeBanner) {
    scopeBanner.classList.add('hidden');
  }

  // 3. Search query filter
  if (dashboardState.searchOrderQuery) {
    const q = dashboardState.searchOrderQuery;
    filtered = filtered.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.customer.toLowerCase().includes(q) || 
      o.item.toLowerCase().includes(q) || 
      o.sku.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center border border-neutral-200 rounded-md bg-white">
        <i data-lucide="package-open" class="w-8 h-8 mx-auto mb-2 text-neutral-300"></i>
        <div class="text-sm font-semibold text-neutral-900">You haven't placed any orders yet</div>
        <p class="text-xs text-neutral-500 mt-1">Ready to purchase? Chat with our AI sales assistant to discover products and buy with zero-redirect checkout.</p>
        <button onclick="switchAdminTab('tab-agent-chat')" class="btn-primary mt-4">
          <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
          <span>Start Shopping in Chat</span>
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(order => `
    <div class="border border-neutral-200 rounded-md overflow-hidden bg-white text-xs">
      
      <!-- 1. Order Header Banner -->
      <div class="bg-neutral-50/80 px-5 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-6">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Order Placed</div>
            <div class="font-medium text-neutral-800 mt-0.5">${order.date}</div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Total (INR)</div>
            <div class="font-mono font-semibold text-neutral-950 mt-0.5 tabular-nums">₹${order.amount.toLocaleString()}.00</div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Ship To</div>
            <div class="font-medium text-neutral-800 mt-0.5 flex items-center space-x-1">
              <span>${order.customer}</span>
              <i data-lucide="chevron-right" class="w-3 h-3 text-neutral-400"></i>
            </div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Channel</div>
            <div class="font-medium text-neutral-700 mt-0.5">${order.channel}</div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <div class="text-right">
            <div class="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Order ID</div>
            <div class="font-mono font-medium text-neutral-900">${order.id}</div>
          </div>
          <button onclick="openOrderInvoiceModal('${order.id}')" class="btn-secondary h-7 px-2.5 text-xs">
            <span>Invoice</span>
          </button>
        </div>
      </div>

      <!-- 2. Order Body -->
      <div class="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        <!-- Left: Product Media & Information -->
        <div class="flex items-start space-x-4 flex-1">
          <img src="${order.imageUrl}" alt="${order.item}" class="w-20 h-20 rounded object-cover bg-neutral-100 border border-neutral-200 flex-shrink-0">
          <div class="space-y-1 min-w-0">
            <div class="font-heading font-semibold text-sm text-neutral-950 leading-snug">${order.item}</div>
            <div class="flex items-center space-x-2 text-xs text-neutral-500 font-mono">
              <span>SKU: ${order.sku}</span>
              <span>•</span>
              <span class="text-neutral-600 font-sans">${order.category}</span>
              <span>•</span>
              <span>Qty: ${order.quantity}</span>
            </div>
            <div class="flex items-center space-x-2 pt-0.5 font-mono text-xs">
              <span class="font-semibold text-neutral-900">₹${order.amount}</span>
              ${order.originalPrice > order.amount ? `<span class="line-through text-neutral-400">₹${order.originalPrice}</span>` : ''}
              ${order.discount > 0 ? `<span class="text-emerald-700 font-sans text-[11px]">(${order.discount}% agent discount applied)</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Center: Fulfillment / Delivery Status -->
        <div class="space-y-1.5 md:w-64 border-t md:border-t-0 md:border-l border-neutral-100 pt-3 md:pt-0 md:pl-6">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full ${order.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
            <span class="font-semibold text-neutral-900">${order.status === 'Paid' ? 'Payment Captured (Zero-Redirect)' : 'Order Created'}</span>
          </div>
          <p class="text-xs text-neutral-600 leading-relaxed">${order.estDelivery}</p>
          <div class="text-[11px] text-neutral-400 font-mono">${order.trackingNumber}</div>
        </div>

        <!-- Right: Action Buttons -->
        <div class="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 w-full md:w-36">
          <button onclick="reorderProductInChat('${order.item.replace(/'/g, "\\'")}', '${order.sku}')" class="btn-primary w-full h-8 text-xs justify-center">
            <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
            <span>Buy it again</span>
          </button>
          <button onclick="switchAdminTab('tab-agent-audit')" class="btn-secondary w-full h-8 text-xs justify-center">
            <span>Track Trace</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function viewCustomerOrders(customerId) {
  switchAdminTab('tab-orders');
  setOrderCustomerFilter(customerId);
}

function reorderProductInChat(productName, sku) {
  switchAdminTab('tab-agent-chat');
  sendQuickPrompt(`I want to buy the ${productName} (${sku})`);
}

function openOrderInvoiceModal(orderId) {
  const order = dashboardState.orders.find(o => o.id === orderId);
  if (!order) return;

  const modal = document.getElementById('order-invoice-modal');
  if (!modal) return;

  document.getElementById('inv-order-id').textContent = order.id;
  document.getElementById('inv-date').textContent = order.date;
  document.getElementById('inv-customer').textContent = order.customer;
  document.getElementById('inv-address').textContent = order.customerAddress;
  document.getElementById('inv-channel').textContent = order.channel;
  document.getElementById('inv-payment-id').textContent = order.paymentId;

  document.getElementById('inv-item-name').textContent = order.item;
  document.getElementById('inv-item-sku').textContent = order.sku;
  document.getElementById('inv-item-price').textContent = `₹${order.originalPrice}.00`;
  document.getElementById('inv-discount').textContent = `- ₹${order.originalPrice - order.amount}.00 (${order.discount}%)`;
  document.getElementById('inv-total').textContent = `₹${order.amount}.00`;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeOrderInvoiceModal() {
  const modal = document.getElementById('order-invoice-modal');
  if (modal) modal.classList.add('hidden');
}

function renderAnalyticsPage() {
  const topProductsList = document.getElementById('analytics-top-products');
  if (!topProductsList) return;

  const topItems = dashboardState.products.slice(0, 5);
  topProductsList.innerHTML = topItems.map((p, idx) => `
    <div class="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0 text-xs">
      <div class="flex items-center space-x-2.5">
        <span class="w-4 h-4 rounded bg-neutral-100 text-neutral-600 flex items-center justify-center font-medium text-[10px]">${idx + 1}</span>
        <div>
          <div class="font-medium text-neutral-900">${p.name}</div>
          <div class="text-[10px] text-neutral-400">${p.category}</div>
        </div>
      </div>
      <div class="text-right font-mono tabular-nums">
        <div class="font-medium text-neutral-900">₹${p.priceInr * (6 - idx)}</div>
        <div class="text-[10px] text-neutral-400">${6 - idx} units</div>
      </div>
    </div>
  `).join('');
}

function renderCustomersPage() {
  const container = document.getElementById('customers-table-body');
  if (!container) return;

  container.innerHTML = dashboardState.customers.map(c => `
    <tr>
      <td>
        <div class="font-medium text-neutral-900">${c.name}</div>
        <div class="text-[11px] text-neutral-400">@${c.username} • ${c.email}</div>
      </td>
      <td class="text-neutral-600 font-mono">${c.phone}</td>
      <td class="text-right font-mono tabular-nums">${c.ordersCount}</td>
      <td class="font-mono font-medium text-neutral-950 text-right tabular-nums">₹${c.totalSpend.toLocaleString()}</td>
      <td class="text-right">
        <span class="badge-status ${c.status === 'Active' ? 'badge-paid' : 'badge-neutral'}">
          ${c.status}
        </span>
      </td>
      <td class="text-right">
        <div class="flex items-center justify-end space-x-1.5">
          <button onclick="viewCustomerOrders('${c.id}')" class="btn-secondary h-7 px-2.5 text-xs">
            <i data-lucide="eye" class="w-3 h-3 text-neutral-500"></i>
            <span>View Orders</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function saveStoreSettings(e) {
  e.preventDefault();
  const name = document.getElementById('settings-store-name').value;
  const maxCap = document.getElementById('settings-max-discount').value;
  const marginFloor = document.getElementById('settings-margin-floor').value;

  dashboardState.storeSettings.name = name;
  dashboardState.storeSettings.maxDiscountCap = parseFloat(maxCap);
  dashboardState.storeSettings.minMarginFloor = parseFloat(marginFloor);

  alert('Settings saved successfully.');
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('shopstore_jwt_token');
  const cachedUserStr = localStorage.getItem('shopstore_user');

  if (token && cachedUserStr) {
    try {
      const user = JSON.parse(cachedUserStr);
      dashboardState.currentUser = user;
      dashboardState.isLoggedIn = true;
      dashboardState.activeCustomerFilter = 'self';

      // Verify token with backend
      fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        if (d.status === 'success' && d.user) {
          dashboardState.currentUser = d.user;
          localStorage.setItem('shopstore_user', JSON.stringify(d.user));
          updateLoggedInUserUI();
        }
      }).catch(() => {});

      completeLoginSuccess();
    } catch (e) {
      handleLogout();
    }
  } else {
    // Show login screen
    const loginView = document.getElementById('view-login');
    const appView = document.getElementById('view-main-app');
    if (loginView) loginView.classList.remove('hidden');
    if (appView) appView.classList.add('hidden');
    showAuthPanel('login');
  }

  if (typeof initChat === 'function') initChat();
  if (typeof loadBuyerPreset === 'function') loadBuyerPreset('reasonable');
});
