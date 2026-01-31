// FixSense Background Service Worker
// Handles signup detection, syncing, auth state, and automation orchestration

const FIXSENSE_API_URL = 'https://gsvkwedgiwwvnroghbzr.supabase.co/functions/v1';

// =====================
// AUTH STATE
// =====================
let authState = {
  isAuthenticated: false,
  accessToken: null,
  userId: null,
  email: null,
  expiresAt: null,
  lastUpdated: null
};

// =====================
// AUTOMATION LEVELS
// =====================
const AUTOMATION_LEVELS = {
  SILENT: 1,    // Background scanning, no user interaction
  ASSISTED: 2,  // Navigate + autofill, user clicks approve
  GUIDED: 3     // Show step-by-step instructions
};

// Keywords that indicate a signup/registration flow
const SIGNUP_KEYWORDS = [
  'signup', 'sign-up', 'sign_up',
  'register', 'registration',
  'create-account', 'create_account', 'createaccount',
  'join', 'get-started', 'getstarted',
  'onboarding', 'welcome'
];

// Known deletion URLs for popular services
const DELETION_URLS = {
  'facebook.com': 'https://www.facebook.com/help/delete_account',
  'instagram.com': 'https://www.instagram.com/accounts/remove/request/permanent/',
  'twitter.com': 'https://twitter.com/settings/deactivate',
  'linkedin.com': 'https://www.linkedin.com/psettings/close-account',
  'reddit.com': 'https://www.reddit.com/settings/account',
  'discord.com': 'https://discord.com/app',
  'spotify.com': 'https://www.spotify.com/account/overview/',
  'amazon.com': 'https://www.amazon.com/privacy/data-deletion',
  'netflix.com': 'https://www.netflix.com/cancelplan',
  'dropbox.com': 'https://www.dropbox.com/account/delete'
};

// Guided steps for services without direct deletion
const GUIDED_STEPS_DATABASE = {
  'default': [
    {
      title: 'Navigate to Account Settings',
      description: 'Look for "Settings", "Account", or your profile icon in the navigation menu.',
      selector: null
    },
    {
      title: 'Find Privacy or Security Settings',
      description: 'Look for options like "Privacy", "Security", or "Data".',
      selector: null
    },
    {
      title: 'Locate Account Deletion',
      description: 'Search for "Delete Account", "Close Account", or "Deactivate".',
      selector: null
    },
    {
      title: 'Confirm Deletion',
      description: 'Follow the prompts to confirm your account deletion request.',
      selector: null
    }
  ],
  'amazon.com': [
    {
      title: 'Go to Account Settings',
      description: 'Click on "Account & Lists" in the top navigation.',
      selector: '#nav-link-accountList'
    },
    {
      title: 'Navigate to Data & Privacy',
      description: 'Scroll down and click on "Manage Your Data and Privacy".',
      selector: null
    },
    {
      title: 'Request Account Closure',
      description: 'Click "Request the closure of your account and the deletion of your personal data".',
      selector: null
    },
    {
      title: 'Complete Verification',
      description: 'You may receive an email to verify your identity. Check your inbox.',
      selector: null
    }
  ]
};

// Store detected signups temporarily
let pendingSignups = [];
let activeActions = [];

// =====================
// AUTH MESSAGE HANDLERS
// =====================

function handleAuthStateUpdate(payload) {
  const previousState = authState.isAuthenticated;
  
  authState = {
    isAuthenticated: payload.isAuthenticated,
    accessToken: payload.accessToken,
    userId: payload.userId,
    email: payload.email,
    expiresAt: payload.expiresAt,
    lastUpdated: Date.now()
  };
  
  // Store in chrome.storage for persistence
  chrome.storage.local.set({ 
    authState,
    // Keep authToken for backward compatibility
    authToken: payload.accessToken
  });
  
  console.log('[FixSense] Auth state updated:', {
    isAuthenticated: authState.isAuthenticated,
    email: authState.email
  });
  
  // If we just logged in, sync any pending signups
  if (!previousState && authState.isAuthenticated) {
    console.log('[FixSense] User logged in, syncing pending signups...');
    syncPendingSignups();
  }
  
  // If we logged out, clear sensitive data
  if (previousState && !authState.isAuthenticated) {
    console.log('[FixSense] User logged out, clearing sensitive data');
    authState.accessToken = null;
    authState.userId = null;
    chrome.storage.local.remove(['authToken']);
  }
}

function isTokenExpired() {
  if (!authState.expiresAt) return true;
  // Add 60 second buffer
  return Date.now() / 1000 > authState.expiresAt - 60;
}

async function syncPendingSignups() {
  if (!authState.isAuthenticated || !authState.accessToken) return;
  
  const confirmedSignups = pendingSignups.filter(s => s.confirmed);
  
  for (const signup of confirmedSignups) {
    await syncSignupToFixSense(signup);
  }
}

// =====================
// MESSAGE LISTENERS
// =====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    // Auth state from dashboard via content script
    case 'AUTH_STATE_UPDATE':
      handleAuthStateUpdate(message.payload);
      sendResponse({ success: true });
      break;
    
    // Get current auth status
    case 'GET_AUTH_STATUS':
      sendResponse({
        isAuthenticated: authState.isAuthenticated,
        email: authState.email,
        isExpired: isTokenExpired()
      });
      break;
    
    case 'SIGNUP_CONFIRMED':
      handleConfirmedSignup(message.data);
      sendResponse({ success: true });
      break;
      
    case 'GET_AUTH_TOKEN':
      sendResponse({ 
        token: authState.accessToken,
        isAuthenticated: authState.isAuthenticated 
      });
      break;
      
    case 'SET_AUTH_TOKEN':
      // Legacy support - update auth state
      handleAuthStateUpdate({
        isAuthenticated: !!message.token,
        accessToken: message.token,
        userId: null,
        email: null,
        expiresAt: null
      });
      sendResponse({ success: true });
      break;
      
    case 'GET_PENDING_SIGNUPS':
      sendResponse({ signups: pendingSignups });
      break;
      
    case 'SYNC_SIGNUP':
      syncSignupToFixSense(message.signup);
      sendResponse({ success: true });
      break;
      
    // Automation level handlers
    case 'INITIATE_ACTION':
      if (!authState.isAuthenticated) {
        sendResponse({ success: false, error: 'Not authenticated' });
      } else {
        handleActionInitiation(message.action, sender.tab?.id);
        sendResponse({ success: true });
      }
      break;
      
    case 'GET_AUTOMATION_LEVEL':
      const level = getAutomationLevel(message.domain);
      sendResponse({ level, deletionUrl: DELETION_URLS[message.domain] });
      break;
      
    case 'GUIDED_STEPS_STATUS':
      updateActionStatus(message.actionId, message.status);
      sendResponse({ success: true });
      break;
      
    // Logout
    case 'LOGOUT':
      handleAuthStateUpdate({
        isAuthenticated: false,
        accessToken: null,
        userId: null,
        email: null,
        expiresAt: null
      });
      sendResponse({ success: true });
      break;
  }
  
  return true; // Keep channel open for async responses
});

// =====================
// NAVIGATION LISTENERS
// =====================

chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Only process if authenticated
  if (!authState.isAuthenticated) {
    return;
  }
  
  if (details.frameId !== 0) return;
  
  const url = new URL(details.url);
  const pathLower = url.pathname.toLowerCase();
  
  // Check for signup pages
  const isSignupPage = SIGNUP_KEYWORDS.some(keyword => pathLower.includes(keyword));
  
  if (isSignupPage) {
    console.log('[FixSense] Potential signup detected:', url.hostname);
    
    const signup = {
      domain: url.hostname.replace('www.', ''),
      url: details.url,
      detectedAt: new Date().toISOString(),
      confirmed: false
    };
    
    const existing = pendingSignups.find(s => s.domain === signup.domain);
    if (!existing) {
      pendingSignups.push(signup);
      await chrome.storage.local.set({ pendingSignups });
      
      chrome.tabs.sendMessage(details.tabId, {
        type: 'SIGNUP_DETECTED',
        domain: signup.domain
      }).catch(() => {});
    }
  }
  
  // Check if user navigated to a deletion page we're tracking
  const activeAction = activeActions.find(a => 
    url.hostname.includes(a.domain.replace('www.', ''))
  );
  
  if (activeAction) {
    chrome.tabs.sendMessage(details.tabId, {
      type: 'CHECK_DELETION_PAGE'
    }).then(response => {
      if (response?.isDeletionPage) {
        initiateAssistedMode(details.tabId, activeAction);
      }
    }).catch(() => {});
  }
});

// =====================
// ACTION HANDLERS
// =====================

async function handleActionInitiation(action, tabId) {
  if (!authState.isAuthenticated) {
    console.log('[FixSense] Action blocked - not authenticated');
    return;
  }
  
  const { domain, actionType, accountId } = action;
  const level = getAutomationLevel(domain);
  
  activeActions.push({
    ...action,
    level,
    startedAt: new Date().toISOString()
  });
  
  switch (level) {
    case AUTOMATION_LEVELS.ASSISTED:
      await initiateAssistedAction(action, tabId);
      break;
      
    case AUTOMATION_LEVELS.GUIDED:
      await initiateGuidedAction(action, tabId);
      break;
      
    default:
      // Level 1 actions are handled server-side
      console.log('[FixSense] Silent action - handled by server');
  }
}

async function initiateAssistedAction(action, tabId) {
  const deletionUrl = DELETION_URLS[action.domain];
  
  if (deletionUrl) {
    // Open deletion page in new tab
    const newTab = await chrome.tabs.create({ url: deletionUrl });
    
    // Wait for page to load, then send message
    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
      if (updatedTabId === newTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        
        chrome.tabs.sendMessage(newTab.id, {
          type: 'INITIATE_DELETION',
          action,
          serviceDomain: action.domain,
          deletionUrl,
          formData: {
            reason: 'privacy',
            feedback: 'Cleaning up unused accounts via FixSense'
          }
        });
      }
    });
  }
}

async function initiateGuidedAction(action, tabId) {
  const steps = GUIDED_STEPS_DATABASE[action.domain] || GUIDED_STEPS_DATABASE.default;
  
  // Open the service's main page
  const serviceUrl = `https://www.${action.domain}`;
  const newTab = await chrome.tabs.create({ url: serviceUrl });
  
  chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
    if (updatedTabId === newTab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      
      chrome.tabs.sendMessage(newTab.id, {
        type: 'SHOW_GUIDED_STEPS',
        steps,
        serviceName: action.serviceName || action.domain,
        action
      });
    }
  });
}

function initiateAssistedMode(tabId, action) {
  chrome.tabs.sendMessage(tabId, {
    type: 'INITIATE_DELETION',
    action,
    serviceDomain: action.domain,
    deletionUrl: DELETION_URLS[action.domain],
    formData: {
      reason: 'privacy',
      feedback: 'Cleaning up unused accounts via FixSense'
    }
  });
}

// =====================
// SYNC FUNCTIONS
// =====================

async function handleConfirmedSignup(data) {
  const { domain, serviceName } = data;
  
  const signup = pendingSignups.find(s => s.domain === domain);
  if (signup) {
    signup.confirmed = true;
    signup.serviceName = serviceName;
    await chrome.storage.local.set({ pendingSignups });
    
    await syncSignupToFixSense(signup);
  }
}

async function syncSignupToFixSense(signup) {
  try {
    if (!authState.isAuthenticated || !authState.accessToken) {
      console.log('[FixSense] Not logged in, storing for later sync');
      return;
    }
    
    if (isTokenExpired()) {
      console.log('[FixSense] Token expired, waiting for refresh');
      return;
    }
    
    const response = await fetch(`${FIXSENSE_API_URL}/extension-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authState.accessToken}`
      },
      body: JSON.stringify({
        domain: signup.domain,
        serviceName: signup.serviceName || extractServiceName(signup.domain),
        detectedAt: signup.detectedAt,
        source: 'extension'
      })
    });
    
    if (response.ok) {
      pendingSignups = pendingSignups.filter(s => s.domain !== signup.domain);
      await chrome.storage.local.set({ pendingSignups });
      console.log('[FixSense] Synced signup:', signup.domain);
    } else if (response.status === 401) {
      // Token invalid, clear auth state
      console.log('[FixSense] Auth token rejected, clearing state');
      handleAuthStateUpdate({
        isAuthenticated: false,
        accessToken: null,
        userId: null,
        email: null,
        expiresAt: null
      });
    }
  } catch (error) {
    console.error('[FixSense] Sync failed:', error);
  }
}

async function updateActionStatus(actionId, status) {
  try {
    if (!authState.isAuthenticated || !authState.accessToken) return;
    
    // Update action status on server
    await fetch(`${FIXSENSE_API_URL}/extension-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authState.accessToken}`
      },
      body: JSON.stringify({
        type: 'action_update',
        actionId,
        status: status === 'completed' ? 'completed' : 'in_progress'
      })
    });
    
    // Remove from active actions
    activeActions = activeActions.filter(a => a.id !== actionId);
  } catch (error) {
    console.error('[FixSense] Action status update failed:', error);
  }
}

// =====================
// HELPER FUNCTIONS
// =====================

function getAutomationLevel(domain) {
  const cleanDomain = domain.replace('www.', '');
  
  // Services with known deletion APIs/pages get assisted level
  if (DELETION_URLS[cleanDomain]) {
    return AUTOMATION_LEVELS.ASSISTED;
  }
  
  // Everything else gets guided level
  return AUTOMATION_LEVELS.GUIDED;
}

function extractServiceName(domain) {
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
  }
  return domain;
}

// =====================
// INITIALIZATION
// =====================

// Initialize extension when service worker starts
async function initialize() {
  try {
    console.log('[FixSense] Initializing service worker...');
    
    // Load auth state from storage
    const storedAuth = await chrome.storage.local.get(['authState', 'authToken', 'pendingSignups']);
    
    if (storedAuth.authState) {
      authState = storedAuth.authState;
      console.log('[FixSense] Restored auth state:', {
        isAuthenticated: authState.isAuthenticated,
        email: authState.email
      });
    } else if (storedAuth.authToken) {
      // Legacy migration
      authState.isAuthenticated = true;
      authState.accessToken = storedAuth.authToken;
    }
    
    // Load pending signups from storage
    if (storedAuth.pendingSignups) {
      pendingSignups = storedAuth.pendingSignups;
      console.log('[FixSense] Loaded', pendingSignups.length, 'pending signups');
    }
    
    // Set up alarm for periodic sync (Level 1 - Silent automation)
    if (chrome.alarms) {
      await chrome.alarms.clear('periodicSync');
      await chrome.alarms.create('periodicSync', { periodInMinutes: 60 });
      console.log('[FixSense] Periodic sync alarm created');
    }
    
    console.log('[FixSense] Initialization complete');
  } catch (error) {
    console.error('[FixSense] Initialization error:', error);
  }
}

// Handle alarm events
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'periodicSync') {
      console.log('[FixSense] Running periodic sync');
      
      if (authState.isAuthenticated && !isTokenExpired()) {
        for (const signup of pendingSignups.filter(s => s.confirmed)) {
          await syncSignupToFixSense(signup);
        }
      }
    }
  });
}

// Run initialization
initialize();
