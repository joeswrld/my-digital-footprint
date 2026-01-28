// FixSense Content Script
// Runs on all pages to detect signup confirmations

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

let detectedDomain = null;

// Listen for signup detection from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SIGNUP_DETECTED') {
    detectedDomain = message.domain;
    observeForConfirmation();
    sendResponse({ received: true });
  }
});

function observeForConfirmation() {
  // Watch for page content changes
  const observer = new MutationObserver(() => {
    checkForSignupConfirmation();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Also check immediately
  checkForSignupConfirmation();
  
  // Stop observing after 30 seconds
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
  showNotification(serviceName);
}

function extractServiceName() {
  // Try to get from page title
  const title = document.title;
  
  // Common patterns: "Welcome to ServiceName" or "ServiceName - Welcome"
  const welcomeMatch = title.match(/welcome\s+to\s+([^|-]+)/i);
  if (welcomeMatch) {
    return welcomeMatch[1].trim();
  }
  
  // Try meta tags
  const ogSiteName = document.querySelector('meta[property="og:site_name"]');
  if (ogSiteName) {
    return ogSiteName.getAttribute('content');
  }
  
  // Fallback to domain name
  const hostname = window.location.hostname.replace('www.', '');
  const parts = hostname.split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

function showNotification(serviceName) {
  // Create a small notification
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
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <div>
        <div style="font-weight: 600; font-size: 14px;">FixSense detected signup</div>
        <div style="font-size: 12px; opacity: 0.9;">${serviceName} added to your dashboard</div>
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
  
  // Remove after 5 seconds
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
    
    // Signup forms typically have email, password, and often confirm password
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
