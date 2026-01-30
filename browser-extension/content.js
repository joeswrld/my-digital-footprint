// FixSense Content Script
// Runs on all pages to detect signup confirmations and assist with account deletion

// =====================
// AUTOMATION LEVELS
// =====================
// Level 1 - Silent: Background detection only (no user interaction)
// Level 2 - Assisted: Navigate + autofill, user clicks approve
// Level 3 - Guided: Show step-by-step instructions

const AUTOMATION_LEVELS = {
  SILENT: 1,
  ASSISTED: 2,
  GUIDED: 3
};

// Patterns that indicate successful signup
const SUCCESS_PATTERNS = [
  /welcome/i,
  /thanks?\s+for\s+(signing|registering|joining)/i,
  /account\s+created/i,
  /registration\s+(complete|successful)/i,
  /verify\s+your\s+email/i,
  /check\s+your\s+(inbox|email)/i,
  /confirmation\s+email/i
];

// Form field patterns that indicate signup forms
const SIGNUP_FORM_PATTERNS = {
  password: /password|pwd/i,
  confirmPassword: /confirm|repeat|retype/i,
  email: /email|e-mail/i,
  name: /name|full.?name|first.?name/i
};

// Known deletion page patterns
const DELETION_PAGE_PATTERNS = [
  /delete.*account/i,
  /close.*account/i,
  /deactivate.*account/i,
  /remove.*account/i,
  /cancel.*membership/i,
  /unsubscribe/i
];

// Known deletion form selectors for popular services
const DELETION_FORM_SELECTORS = {
  'facebook.com': {
    deleteButton: '[data-testid="delete-account-button"]',
    confirmInput: 'input[name="password"]',
    level: AUTOMATION_LEVELS.ASSISTED
  },
  'twitter.com': {
    deleteButton: '[data-testid="confirmationSheetConfirm"]',
    level: AUTOMATION_LEVELS.ASSISTED
  },
  'linkedin.com': {
    deleteLink: 'a[href*="close-account"]',
    level: AUTOMATION_LEVELS.ASSISTED
  },
  // Fallback for unknown services
  default: {
    level: AUTOMATION_LEVELS.GUIDED
  }
};

let detectedDomain = null;
let currentAction = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SIGNUP_DETECTED') {
    detectedDomain = message.domain;
    observeForConfirmation();
    sendResponse({ received: true });
  }
  
  // Level 2: Assisted automation - navigate to deletion page
  if (message.type === 'INITIATE_DELETION') {
    currentAction = message.action;
    handleAssistedDeletion(message);
    sendResponse({ received: true });
  }
  
  // Level 3: Show guided steps overlay
  if (message.type === 'SHOW_GUIDED_STEPS') {
    showGuidedStepsOverlay(message.steps, message.serviceName);
    sendResponse({ received: true });
  }
  
  // Check if we're on a deletion page
  if (message.type === 'CHECK_DELETION_PAGE') {
    const isDeletionPage = checkIfDeletionPage();
    sendResponse({ isDeletionPage, url: window.location.href });
  }
  
  return true;
});

// =====================
// LEVEL 1: SILENT DETECTION
// =====================

function observeForConfirmation() {
  const observer = new MutationObserver(() => {
    checkForSignupConfirmation();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  checkForSignupConfirmation();
  setTimeout(() => observer.disconnect(), 30000);
}

function checkForSignupConfirmation() {
  const pageText = document.body.innerText;
  
  for (const pattern of SUCCESS_PATTERNS) {
    if (pattern.test(pageText)) {
      confirmSignup();
      return;
    }
  }
}

function confirmSignup() {
  if (!detectedDomain) return;
  
  const serviceName = extractServiceName();
  
  chrome.runtime.sendMessage({
    type: 'SIGNUP_CONFIRMED',
    data: {
      domain: detectedDomain,
      serviceName
    }
  });
  
  detectedDomain = null;
  showNotification(serviceName, 'detected');
}

// =====================
// LEVEL 2: ASSISTED AUTOMATION
// =====================

function handleAssistedDeletion(message) {
  const { serviceDomain, deletionUrl, formData } = message;
  const hostname = window.location.hostname.replace('www.', '');
  
  // Check if we're on the right domain
  if (!hostname.includes(serviceDomain.replace('www.', ''))) {
    console.log('[FixSense] Wrong domain, navigation needed');
    return;
  }
  
  // Check if we're on a deletion page
  if (!checkIfDeletionPage()) {
    console.log('[FixSense] Not on deletion page');
    showNavigationHelper(deletionUrl);
    return;
  }
  
  // Get selectors for this service
  const selectors = DELETION_FORM_SELECTORS[hostname] || DELETION_FORM_SELECTORS.default;
  
  // Autofill form if possible
  if (formData && selectors.level === AUTOMATION_LEVELS.ASSISTED) {
    autofillDeletionForm(formData, selectors);
    showApprovalOverlay(serviceDomain);
  }
}

function autofillDeletionForm(formData, selectors) {
  // Find and fill reason dropdown if present
  const reasonSelect = document.querySelector('select[name*="reason"], select[id*="reason"]');
  if (reasonSelect && formData.reason) {
    const option = Array.from(reasonSelect.options).find(opt => 
      opt.text.toLowerCase().includes(formData.reason.toLowerCase())
    );
    if (option) {
      reasonSelect.value = option.value;
      reasonSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  
  // Fill feedback textarea if present
  const feedbackInput = document.querySelector('textarea[name*="feedback"], textarea[id*="feedback"], textarea[name*="reason"]');
  if (feedbackInput && formData.feedback) {
    feedbackInput.value = formData.feedback;
    feedbackInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  console.log('[FixSense] Form autofilled, waiting for user approval');
}

function showApprovalOverlay(serviceName) {
  const overlay = document.createElement('div');
  overlay.id = 'fixsense-approval-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 320px;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <div style="font-weight: 600; font-size: 16px;">FixSense Assisted Deletion</div>
      </div>
      <p style="font-size: 14px; margin-bottom: 16px; opacity: 0.95;">
        Form has been pre-filled for <strong>${serviceName}</strong>. 
        Review the information and click the delete button when ready.
      </p>
      <div style="display: flex; gap: 8px;">
        <button id="fixsense-dismiss" style="
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.3);
          background: transparent;
          color: white;
          font-weight: 500;
          cursor: pointer;
        ">Dismiss</button>
        <button id="fixsense-highlight" style="
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: white;
          color: #6366f1;
          font-weight: 600;
          cursor: pointer;
        ">Highlight Button</button>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('fixsense-dismiss').addEventListener('click', () => {
    overlay.remove();
  });
  
  document.getElementById('fixsense-highlight').addEventListener('click', () => {
    highlightDeleteButton();
  });
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => overlay.remove(), 30000);
}

function highlightDeleteButton() {
  // Find delete/close/deactivate buttons
  const buttons = document.querySelectorAll('button, input[type="submit"], a');
  
  for (const btn of buttons) {
    const text = (btn.textContent || btn.value || '').toLowerCase();
    if (
      text.includes('delete') ||
      text.includes('close account') ||
      text.includes('deactivate') ||
      text.includes('confirm')
    ) {
      btn.style.outline = '3px solid #6366f1';
      btn.style.outlineOffset = '3px';
      btn.style.animation = 'pulse 1s infinite';
      
      // Add pulse animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { outline-color: #6366f1; }
          50% { outline-color: #8b5cf6; }
        }
      `;
      document.head.appendChild(style);
      
      // Scroll into view
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      break;
    }
  }
}

function showNavigationHelper(deletionUrl) {
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">Navigation Required</div>
      <p style="font-size: 13px; margin-bottom: 12px;">
        Please navigate to the account deletion page to continue.
      </p>
      <a href="${deletionUrl}" style="
        display: block;
        padding: 10px 16px;
        background: white;
        color: #d97706;
        text-decoration: none;
        border-radius: 8px;
        text-align: center;
        font-weight: 600;
        font-size: 14px;
      ">Go to Deletion Page →</a>
    </div>
  `;
  
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 15000);
}

// =====================
// LEVEL 3: GUIDED AUTOMATION
// =====================

function showGuidedStepsOverlay(steps, serviceName) {
  let currentStep = 0;
  
  const overlay = document.createElement('div');
  overlay.id = 'fixsense-guided-overlay';
  
  function renderStep() {
    const step = steps[currentStep];
    overlay.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        color: #1f2937;
        padding: 20px;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 350px;
        border: 1px solid #e5e7eb;
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <div style="
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
          ">${currentStep + 1}</div>
          <div style="font-weight: 600; font-size: 15px;">Step ${currentStep + 1} of ${steps.length}</div>
          <div style="margin-left: auto; font-size: 12px; color: #6b7280;">${serviceName}</div>
        </div>
        
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${step.title}</h3>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">${step.description}</p>
        
        ${step.selector ? `
          <button id="fixsense-highlight-step" style="
            width: 100%;
            padding: 10px 16px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            color: #374151;
            font-weight: 500;
            cursor: pointer;
            margin-bottom: 12px;
          ">🎯 Highlight Element</button>
        ` : ''}
        
        <div style="display: flex; gap: 8px;">
          ${currentStep > 0 ? `
            <button id="fixsense-prev" style="
              flex: 1;
              padding: 10px 16px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              background: white;
              color: #374151;
              font-weight: 500;
              cursor: pointer;
            ">← Back</button>
          ` : ''}
          <button id="fixsense-next" style="
            flex: 1;
            padding: 10px 16px;
            border-radius: 8px;
            border: none;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            font-weight: 600;
            cursor: pointer;
          ">${currentStep === steps.length - 1 ? '✓ Complete' : 'Next →'}</button>
        </div>
        
        <button id="fixsense-close" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 18px;
        ">×</button>
      </div>
    `;
    
    // Event listeners
    document.getElementById('fixsense-close')?.addEventListener('click', () => {
      overlay.remove();
      notifyStepCompletion('dismissed');
    });
    
    document.getElementById('fixsense-highlight-step')?.addEventListener('click', () => {
      if (step.selector) {
        const element = document.querySelector(step.selector);
        if (element) {
          element.style.outline = '3px solid #6366f1';
          element.style.outlineOffset = '3px';
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
    
    document.getElementById('fixsense-prev')?.addEventListener('click', () => {
      currentStep--;
      renderStep();
    });
    
    document.getElementById('fixsense-next')?.addEventListener('click', () => {
      if (currentStep === steps.length - 1) {
        overlay.remove();
        notifyStepCompletion('completed');
        showNotification(serviceName, 'guided-complete');
      } else {
        currentStep++;
        renderStep();
      }
    });
  }
  
  document.body.appendChild(overlay);
  renderStep();
}

function notifyStepCompletion(status) {
  if (currentAction) {
    chrome.runtime.sendMessage({
      type: 'GUIDED_STEPS_STATUS',
      actionId: currentAction.id,
      status
    });
    currentAction = null;
  }
}

// =====================
// HELPER FUNCTIONS
// =====================

function checkIfDeletionPage() {
  const url = window.location.href.toLowerCase();
  const pageText = document.body.innerText.toLowerCase();
  
  return DELETION_PAGE_PATTERNS.some(pattern => 
    pattern.test(url) || pattern.test(pageText)
  );
}

function extractServiceName() {
  const title = document.title;
  const welcomeMatch = title.match(/welcome\s+to\s+([^|-]+)/i);
  if (welcomeMatch) {
    return welcomeMatch[1].trim();
  }
  
  const ogSiteName = document.querySelector('meta[property="og:site_name"]');
  if (ogSiteName) {
    return ogSiteName.getAttribute('content');
  }
  
  const hostname = window.location.hostname.replace('www.', '');
  const parts = hostname.split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

function showNotification(serviceName, type) {
  const messages = {
    'detected': `${serviceName} added to your dashboard`,
    'guided-complete': `Deletion steps for ${serviceName} completed!`,
    'assisted-ready': `Form pre-filled for ${serviceName}`
  };
  
  const icons = {
    'detected': `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
    'guided-complete': `<polyline points="20 6 9 17 4 12"/>`,
    'assisted-ready': `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`
  };
  
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${icons[type] || icons['detected']}
      </svg>
      <div>
        <div style="font-weight: 600; font-size: 14px;">FixSense</div>
        <div style="font-size: 12px; opacity: 0.9;">${messages[type] || serviceName}</div>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Detect signup forms for proactive detection
function detectSignupForm() {
  const forms = document.querySelectorAll('form');
  
  for (const form of forms) {
    const inputs = form.querySelectorAll('input');
    let hasEmail = false;
    let hasPassword = false;
    let hasConfirmPassword = false;
    
    for (const input of inputs) {
      const name = input.name?.toLowerCase() || '';
      const type = input.type?.toLowerCase() || '';
      const placeholder = input.placeholder?.toLowerCase() || '';
      const combined = `${name} ${placeholder}`;
      
      if (type === 'email' || SIGNUP_FORM_PATTERNS.email.test(combined)) {
        hasEmail = true;
      }
      if (type === 'password' && !SIGNUP_FORM_PATTERNS.confirmPassword.test(combined)) {
        hasPassword = true;
      }
      if (type === 'password' && SIGNUP_FORM_PATTERNS.confirmPassword.test(combined)) {
        hasConfirmPassword = true;
      }
    }
    
    if (hasEmail && hasPassword && hasConfirmPassword) {
      console.log('[FixSense] Signup form detected on page');
      monitorFormSubmission(form);
    }
  }
}

function monitorFormSubmission(form) {
  form.addEventListener('submit', () => {
    detectedDomain = window.location.hostname.replace('www.', '');
    observeForConfirmation();
  });
}

// Run detection on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectSignupForm);
} else {
  detectSignupForm();
}
