// FixSense Popup Script
// Handles extension popup UI and auth state display

const FIXSENSE_DASHBOARD_URL = 'https://id-preview--2f697cd2-a600-461c-b2da-a0a6a32536ac.lovable.app';

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  await loadPendingSignups();
  setupEventListeners();
});

async function checkAuthStatus() {
  const connectionStatus = document.getElementById('connection-status');
  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');
  const userEmail = document.getElementById('user-email');
  const lockedMessage = document.getElementById('locked-message');
  
  try {
    const result = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    
    if (result.isAuthenticated && !result.isExpired) {
      // Connected state
      connectionStatus.textContent = 'Connected';
      connectionStatus.classList.add('connected');
      connectionStatus.classList.remove('disconnected', 'locked');
      loggedOutView.style.display = 'none';
      loggedInView.style.display = 'block';
      
      if (userEmail && result.email) {
        userEmail.textContent = result.email;
        userEmail.style.display = 'block';
      }
    } else if (result.isExpired) {
      // Token expired - show refresh message
      connectionStatus.textContent = 'Session Expired';
      connectionStatus.classList.add('disconnected');
      connectionStatus.classList.remove('connected', 'locked');
      loggedOutView.style.display = 'block';
      loggedInView.style.display = 'none';
      
      if (lockedMessage) {
        lockedMessage.innerHTML = `
          <p>Your session has expired. Please visit the FixSense dashboard to reconnect.</p>
          <p style="font-size: 11px; margin-top: 8px; opacity: 0.7;">
            The extension will automatically sync when you're logged in.
          </p>
        `;
      }
    } else {
      // Not connected - locked state
      connectionStatus.textContent = 'Not Connected';
      connectionStatus.classList.add('disconnected');
      connectionStatus.classList.remove('connected', 'locked');
      loggedOutView.style.display = 'block';
      loggedInView.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    connectionStatus.textContent = 'Error';
    connectionStatus.classList.add('disconnected');
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
  }
}

async function loadPendingSignups() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'GET_PENDING_SIGNUPS' });
    const signups = result.signups || [];
    
    document.getElementById('pending-count').textContent = signups.length;
    
    const pendingList = document.getElementById('pending-list');
    
    if (signups.length === 0) {
      pendingList.innerHTML = '<div class="empty-state">No pending signups detected</div>';
      return;
    }
    
    pendingList.innerHTML = signups.map(signup => `
      <div class="pending-item" data-domain="${signup.domain}">
        <div>
          <div class="pending-domain">${signup.serviceName || signup.domain}</div>
          <div class="pending-time">${formatTime(signup.detectedAt)}</div>
        </div>
        <div class="pending-status ${signup.confirmed ? 'confirmed' : 'pending'}">
          ${signup.confirmed ? '✓ Detected' : '⏳ Pending'}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load pending signups:', error);
  }
}

function setupEventListeners() {
  // Open dashboard
  const dashboardBtn = document.getElementById('dashboard-btn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${FIXSENSE_DASHBOARD_URL}/dashboard` });
    });
  }
  
  // Sign in button
  const signInBtn = document.getElementById('signin-btn');
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${FIXSENSE_DASHBOARD_URL}/auth` });
    });
  }
  
  // Sync all button
  const syncAllBtn = document.getElementById('sync-all-btn');
  if (syncAllBtn) {
    syncAllBtn.addEventListener('click', async () => {
      syncAllBtn.textContent = 'Syncing...';
      syncAllBtn.disabled = true;
      
      try {
        const result = await chrome.runtime.sendMessage({ type: 'GET_PENDING_SIGNUPS' });
        const signups = result.signups || [];
        
        for (const signup of signups.filter(s => s.confirmed)) {
          await chrome.runtime.sendMessage({
            type: 'SYNC_SIGNUP',
            signup
          });
        }
        
        await loadPendingSignups();
      } catch (error) {
        console.error('Sync failed:', error);
      }
      
      syncAllBtn.textContent = 'Sync All';
      syncAllBtn.disabled = false;
    });
  }
  
  // Disconnect button
  const disconnectBtn = document.getElementById('disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'LOGOUT' });
      await checkAuthStatus();
    });
  }
  
  // Refresh status
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.textContent = '↻';
      refreshBtn.style.animation = 'spin 0.5s linear';
      await checkAuthStatus();
      await loadPendingSignups();
      refreshBtn.style.animation = '';
    });
  }
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
