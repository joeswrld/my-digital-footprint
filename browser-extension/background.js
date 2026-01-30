// FixSense Background Service Worker
// Handles signup detection, syncing, and automation orchestration

const FIXSENSE_API_URL = 'https://gsvkwedgiwwvnroghbzr.supabase.co/functions/v1';

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
// MESSAGE LISTENERS
// =====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SIGNUP_CONFIRMED':
      handleConfirmedSignup(message.data);
      sendResponse({ success: true });
      break;
      
    case 'GET_AUTH_TOKEN':
      chrome.storage.local.get(['authToken'], (result) => {
        sendResponse({ token: result.authToken });
      });
      return true;
      
    case 'SET_AUTH_TOKEN':
      chrome.storage.local.set({ authToken: message.token }, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'GET_PENDING_SIGNUPS':
      sendResponse({ signups: pendingSignups });
      break;
      
    case 'SYNC_SIGNUP':
      syncSignupToFixSense(message.signup);
      sendResponse({ success: true });
      break;
      
    // Automation level handlers
    case 'INITIATE_ACTION':
      handleActionInitiation(message.action, sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'GET_AUTOMATION_LEVEL':
      const level = getAutomationLevel(message.domain);
      sendResponse({ level, deletionUrl: DELETION_URLS[message.domain] });
      break;
      
    case 'GUIDED_STEPS_STATUS':
      updateActionStatus(message.actionId, message.status);
      sendResponse({ success: true });
      break;
  }
});

// =====================
// NAVIGATION LISTENERS
// =====================

chrome.webNavigation.onCompleted.addListener(async (details) => {
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
      pendingSignups = pendingSignups.filter(s => s.domain !== signup.domain);
      await chrome.storage.local.set({ pendingSignups });
      console.log('[FixSense] Synced signup:', signup.domain);
    }
  } catch (error) {
    console.error('[FixSense] Sync failed:', error);
  }
}

async function updateActionStatus(actionId, status) {
  try {
    const { authToken } = await chrome.storage.local.get(['authToken']);
    
    if (!authToken) return;
    
    // Update action status on server
    await fetch(`${FIXSENSE_API_URL}/extension-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
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
    
    // Load pending signups from storage
    const result = await chrome.storage.local.get(['pendingSignups']);
    if (result.pendingSignups) {
      pendingSignups = result.pendingSignups;
      console.log('[FixSense] Loaded', pendingSignups.length, 'pending signups');
    }
    
    // Set up alarm for periodic sync (Level 1 - Silent automation)
    // Check if chrome.alarms is available
    if (chrome.alarms) {
      // Clear any existing alarm first
      await chrome.alarms.clear('periodicSync');
      // Create new alarm
      await chrome.alarms.create('periodicSync', { periodInMinutes: 60 });
      console.log('[FixSense] Periodic sync alarm created');
    } else {
      console.warn('[FixSense] chrome.alarms API not available');
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
      
      for (const signup of pendingSignups.filter(s => s.confirmed)) {
        await syncSignupToFixSense(signup);
      }
    }
  });
}

// Run initialization
initialize();