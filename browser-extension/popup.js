// FixSense Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  await loadPendingSignups();
  setupEventListeners();
});

async function checkAuthStatus() {
  const connectionStatus = document.getElementById('connection-status');
  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');
  
  const result = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  
  if (result.token) {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.add('connected');
    connectionStatus.classList.remove('disconnected');
    loggedOutView.style.display = 'none';
    loggedInView.style.display = 'block';
  } else {
    connectionStatus.textContent = 'Not connected';
    connectionStatus.classList.add('disconnected');
    connectionStatus.classList.remove('connected');
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
  }
}

async function loadPendingSignups() {
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
      <button class="sync-btn" data-action="sync">Sync</button>
    </div>
  `).join('');
}

function setupEventListeners() {
  // Sync individual signup
  document.getElementById('pending-list').addEventListener('click', async (e) => {
    if (e.target.dataset.action === 'sync') {
      const item = e.target.closest('.pending-item');
      const domain = item.dataset.domain;
      
      e.target.textContent = 'Syncing...';
      e.target.disabled = true;
      
      await chrome.runtime.sendMessage({
        type: 'SYNC_SIGNUP',
        signup: { domain }
      });
      
      await loadPendingSignups();
    }
  });
  
  // Sync all
  document.getElementById('sync-all-btn').addEventListener('click', async () => {
    const btn = document.getElementById('sync-all-btn');
    btn.textContent = 'Syncing...';
    btn.disabled = true;
    
    const result = await chrome.runtime.sendMessage({ type: 'GET_PENDING_SIGNUPS' });
    const signups = result.signups || [];
    
    for (const signup of signups) {
      await chrome.runtime.sendMessage({
        type: 'SYNC_SIGNUP',
        signup
      });
    }
    
    await loadPendingSignups();
    btn.textContent = 'Sync All';
    btn.disabled = false;
  });
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
