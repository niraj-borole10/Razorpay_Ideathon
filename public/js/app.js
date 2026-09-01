/**
 * Main Application Coordinator
 */

function switchTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  // Deactivate all nav buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('text-slate-400');
  });

  // Show active tab
  const activeContent = document.getElementById(tabId);
  if (activeContent) {
    activeContent.classList.remove('hidden');
  }

  // Activate nav button
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.classList.remove('text-slate-400');
  }

  // Lazy refresh data based on tab
  if (tabId === 'tab-audit' && typeof refreshAuditLogs === 'function') {
    refreshAuditLogs();
  } else if (tabId === 'tab-catalog' && typeof loadCatalogData === 'function') {
    loadCatalogData();
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Initial Boot on Page Load
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initChat === 'function') {
    initChat();
  }
  if (typeof loadBuyerPreset === 'function') {
    loadBuyerPreset('reasonable');
  }
  if (typeof loadCatalogData === 'function') {
    loadCatalogData();
  }
  if (typeof refreshAuditLogs === 'function') {
    refreshAuditLogs();
  }
});
