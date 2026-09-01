/**
 * Catalog Engine Frontend Handler
 */
async function loadCatalogData() {
  try {
    const manifestRes = await fetch('/api/v1/agent/catalog');
    const manifestData = await manifestRes.json();
    
    const jsonPre = document.getElementById('ap2-catalog-json');
    if (jsonPre && manifestData.manifest) {
      jsonPre.textContent = JSON.stringify(manifestData.manifest, null, 2);
    }

    const prodRes = await fetch('/api/v1/agent/products');
    const prodData = await prodRes.json();
    
    renderCatalogList(prodData.products || []);
  } catch (error) {
    console.error('Error loading catalog:', error);
  }
}

function renderCatalogList(products) {
  const container = document.getElementById('catalog-products-list');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<div class="text-slate-500 text-xs text-center py-8">No products found.</div>`;
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="bg-[#070b14] border border-slate-800 rounded-xl p-3.5 flex space-x-3.5 items-center hover:border-slate-700 transition">
      <img src="${p.imageUrl}" alt="${p.name}" class="w-14 h-14 rounded-lg object-cover bg-slate-900 border border-slate-800">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-xs text-white truncate">${p.name}</h4>
          <span class="text-xs font-mono font-bold text-emerald-400">₹${p.priceInr}</span>
        </div>
        <div class="flex items-center space-x-2 text-[10px] text-slate-400 mt-1 font-mono">
          <span>${p.sku}</span>
          <span>•</span>
          <span>Stock: <strong class="${p.stock > 10 ? 'text-slate-200' : 'text-amber-400'}">${p.stock}</strong></span>
          <span>•</span>
          <span>Max Cap: <strong class="text-blue-400">${p.discountPolicy?.maxAllowedDiscountPct || 15}%</strong></span>
        </div>
        <div class="flex items-center justify-end mt-2 pt-1.5 border-t border-slate-900 text-[11px]">
          <button onclick="prefillChatWithProduct('${p.sku}', '${p.name}')" class="text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1">
            <span>In-App Buy</span>
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

function prefillChatWithProduct(sku, name) {
  switchTab('tab-chat');
  sendQuickPrompt(`I want to check out the ${name} (${sku}), can you give me a discount?`);
}
