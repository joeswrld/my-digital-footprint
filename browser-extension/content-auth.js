// FixSense Content Script - Auth Sync Module
// This script ONLY runs on the FixSense dashboard domain to capture auth state

(function() {
  'use strict';
  
  // Only run on FixSense domains
  const ALLOWED_ORIGINS = [
    'localhost',
    '127.0.0.1',
    'lovable.app',
    'lovable.dev',
    'fixsense.com.ng',
    'fixsense.app'
  ];
  
  const hostname = window.location.hostname;
  const isFixSenseDomain = ALLOWED_ORIGINS.some(origin => hostname.includes(origin));
  
  if (!isFixSenseDomain) {
    return; // Don't run on non-FixSense domains
  }
  
  console.log('[FixSense Auth Sync] Running on FixSense domain:', hostname);
  
  // Listen for auth state messages from the dashboard
  window.addEventListener('message', async (event) => {
    // Verify origin is the same (FixSense dashboard)
    if (event.origin !== window.location.origin) return;
    
    const message = event.data;
    
    if (message?.type === 'FIXSENSE_AUTH_STATE') {
      console.log('[FixSense Auth Sync] Received auth state:', message.payload.isAuthenticated);
      
      // Forward to background script
      try {
        await chrome.runtime.sendMessage({
          type: 'AUTH_STATE_UPDATE',
          payload: message.payload
        });
      } catch (error) {
        console.log('[FixSense Auth Sync] Extension not available or error:', error.message);
      }
    }
  });
  
  // Request initial auth state from the dashboard
  // This handles the case where the extension loads after the dashboard
  setTimeout(() => {
    window.postMessage({ type: 'FIXSENSE_REQUEST_AUTH_STATE' }, window.location.origin);
  }, 500);
  
  // Periodically check auth state (handles token refresh)
  setInterval(() => {
    window.postMessage({ type: 'FIXSENSE_REQUEST_AUTH_STATE' }, window.location.origin);
  }, 5 * 60 * 1000); // Every 5 minutes
  
  // Inject a small indicator that the extension is connected
  function showExtensionConnected() {
    // Check if already shown
    if (document.getElementById('fixsense-extension-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'fixsense-extension-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        z-index: 9999;
        animation: slideUp 0.3s ease-out;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      " onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Extension Connected
      </div>
      <style>
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        #fixsense-extension-indicator > div:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
        }
      </style>
    `;
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      indicator.style.animation = 'slideUp 0.3s ease-out reverse forwards';
      setTimeout(() => indicator.remove(), 300);
    }, 5000);
  }
  
  // Show indicator once auth is confirmed
  chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
    if (response?.isAuthenticated) {
      showExtensionConnected();
    }
  });
})();
