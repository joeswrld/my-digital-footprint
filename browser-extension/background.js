// FixSense Background Service Worker
// Handles signup detection and syncing with dashboard

const FIXSENSE_API_URL = 'https://gsvkwedgiwwvnroghbzr.supabase.co/functions/v1';

// Keywords that indicate a signup/registration flow
const SIGNUP_KEYWORDS = [
  'signup', 'sign-up', 'sign_up',
  'register', 'registration',
  'create-account', 'create_account', 'createaccount',
  'join', 'get-started', 'getstarted',
  'onboarding', 'welcome'
];

// Store detected signups temporarily
let pendingSignups = [];

// Listen for navigation events
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  
  const url = new URL(details.url);
  const pathLower = url.pathname.toLowerCase();
  
  // Check if URL contains signup keywords
  const isSignupPage = SIGNUP_KEYWORDS.some(keyword => pathLower.includes(keyword));
  
  if (isSignupPage) {
    console.log('[FixSense] Potential signup detected:', url.hostname);
    
    // Store the potential signup
    const signup = {
      domain: url.hostname.replace('www.', ''),
      url: details.url,
      detectedAt: new Date().toISOString(),
      confirmed: false
    };
    
    // Check if we already have this domain pending
    const existing = pendingSignups.find(s => s.domain === signup.domain);
    if (!existing) {
      pendingSignups.push(signup);
      await chrome.storage.local.set({ pendingSignups });
      
      // Notify content script to look for confirmation
      chrome.tabs.sendMessage(details.tabId, {
        type: 'SIGNUP_DETECTED',
        domain: signup.domain
      }).catch(() => {}); // Ignore errors if content script not ready
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SIGNUP_CONFIRMED') {
    handleConfirmedSignup(message.data);
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_AUTH_TOKEN') {
    chrome.storage.local.get(['authToken'], (result) => {
      sendResponse({ token: result.authToken });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'SET_AUTH_TOKEN') {
    chrome.storage.local.set({ authToken: message.token }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'GET_PENDING_SIGNUPS') {
    sendResponse({ signups: pendingSignups });
  }
  
  if (message.type === 'SYNC_SIGNUP') {
    syncSignupToFixSense(message.signup);
    sendResponse({ success: true });
  }
});

async function handleConfirmedSignup(data) {
  const { domain, serviceName } = data;
  
  // Update pending signup as confirmed
  const signup = pendingSignups.find(s => s.domain === domain);
  if (signup) {
    signup.confirmed = true;
    signup.serviceName = serviceName;
    await chrome.storage.local.set({ pendingSignups });
    
    // Try to sync immediately if user is logged in
    await syncSignupToFixSense(signup);
  }
}

async function syncSignupToFixSense(signup) {
  try {
    const { authToken } = await chrome.storage.local.get(['authToken']);
    
    if (!authToken) {
      console.log('[FixSense] Not logged in, storing for later sync');
      return;
    }
    
    const response = await fetch(`${FIXSENSE_API_URL}/extension-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        domain: signup.domain,
        serviceName: signup.serviceName || extractServiceName(signup.domain),
        detectedAt: signup.detectedAt,
        source: 'extension'
      })
    });
    
    if (response.ok) {
      // Remove from pending
      pendingSignups = pendingSignups.filter(s => s.domain !== signup.domain);
      await chrome.storage.local.set({ pendingSignups });
      console.log('[FixSense] Synced signup:', signup.domain);
    }
  } catch (error) {
    console.error('[FixSense] Sync failed:', error);
  }
}

function extractServiceName(domain) {
  // Extract service name from domain
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
  }
  return domain;
}

// Sync pending signups when extension loads
chrome.storage.local.get(['pendingSignups'], (result) => {
  if (result.pendingSignups) {
    pendingSignups = result.pendingSignups;
  }
});
