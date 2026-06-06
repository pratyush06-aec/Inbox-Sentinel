const connectBtn = document.getElementById('connect');
const refreshBtn = document.getElementById('refresh');
const saveConfigBtn = document.getElementById('save-config');
const statusEl = document.getElementById('status');
const emailsEl = document.getElementById('emails');
const supabaseUrlInput = document.getElementById('supabase-url');
const supabaseKeyInput = document.getElementById('supabase-key');
const filterButtons = document.querySelectorAll('.filters button');
const tabButtons = document.querySelectorAll('.tabs button');
const filtersContainer = document.querySelector('.filters');

let emailCache = [];
let activeFilter = 'All';
let activeTab = 'inbox';

connectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'auth:connect' }, (resp) => {
    if (resp && resp.success) {
      statusEl.textContent = 'Connected';
      connectBtn.textContent = 'Connected';
      fetchEmails();
    } else {
      console.error('auth connect failed', resp);
      statusEl.textContent =
        'Connect failed: ' + (resp?.error || 'Unknown error');
      if (resp?.stack) {
        statusEl.textContent += '\n' + resp.stack;
      }
    }
  });
});

refreshBtn.addEventListener('click', () => {
  fetchEmails();
});

saveConfigBtn.addEventListener('click', () => {
  const url = supabaseUrlInput.value.trim();
  const key = supabaseKeyInput.value.trim();
  if (!url || !key) {
    statusEl.textContent = 'Supabase config is required';
    return;
  }
  chrome.runtime.sendMessage({ type: 'config:supabase', config: { url, key } }, (resp) => {
    if (resp && resp.success) {
      statusEl.textContent = 'Supabase saved';
    } else {
      statusEl.textContent = 'Supabase save failed';
      console.error('supabase save failed', resp && resp.error);
    }
  });
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    renderEmails(emailCache);
  });
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    tabButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    activeTab = button.dataset.tab;
    filtersContainer.style.display = activeTab === 'inbox' ? 'flex' : 'none';
    fetchEmails();
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  statusEl.textContent = 'Checking...';
  chrome.runtime.sendMessage({ type: 'auth:getStatus' }, (resp) => {
    if (resp && resp.success && resp.token) {
      statusEl.textContent = 'Connected';
      connectBtn.textContent = 'Connected';
      fetchEmails();
    } else {
      statusEl.textContent = 'Not connected';
    }
  });

  chrome.storage.local.get('supabase_config', async (items) => {
    const cfg = items && items.supabase_config;
    if (cfg) {
      supabaseUrlInput.value = cfg.url || '';
      supabaseKeyInput.value = cfg.key || '';
    } else {
      const runtimeConfig = await loadRuntimeConfig();
      if (runtimeConfig) {
        supabaseUrlInput.value = runtimeConfig.SUPABASE_URL || runtimeConfig.supabaseUrl || '';
        supabaseKeyInput.value = runtimeConfig.SUPABASE_ANON_KEY || runtimeConfig.supabaseAnonKey || '';
      }
    }
  });
});

async function loadRuntimeConfig() {
  try {
    const url = chrome.runtime.getURL('runtime-config.json');
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return resp.json();
  } catch (err) {
    return null;
  }
}

function fetchEmails() {
  if (activeTab === 'important') {
    return fetchImportantEmails();
  }

  statusEl.textContent = 'Fetching...';
  chrome.runtime.sendMessage({ type: 'gmail:fetch', maxResults: 25 }, (resp) => {
    if (resp && resp.success && Array.isArray(resp.emails)) {
      emailCache = resp.emails;
      statusEl.textContent = `Loaded ${resp.emails.length} emails`;
      renderEmails(emailCache);
    } else {
      statusEl.textContent = 'Fetch failed';
      console.error('gmail fetch failed', resp && resp.error);
    }
  });
}

function fetchImportantEmails() {
  statusEl.textContent = 'Loading important emails...';
  chrome.runtime.sendMessage({ type: 'supabase:getImportant' }, (resp) => {
    if (resp && resp.success && Array.isArray(resp.emails)) {
      emailCache = resp.emails;
      statusEl.textContent = `Loaded ${resp.emails.length} important emails`;
      renderEmails(emailCache);
    } else {
      statusEl.textContent = 'Important fetch failed';
      console.error('important fetch failed', resp && resp.error);
    }
  });
}

function renderEmails(emails) {
  emailsEl.innerHTML = '';
  let filtered = emails;
  if (activeTab === 'inbox') {
    filtered = emails.filter((e) => activeFilter === 'All' || e.category === activeFilter);
  }

  if (filtered.length === 0) {
    emailsEl.innerHTML = '<li>No emails found for this view.</li>';
    return;
  }

  for (const e of filtered) {
    const li = document.createElement('li');
    li.dataset.category = e.category;

    const meta = document.createElement('div');
    meta.className = 'email-meta';
    meta.innerHTML = `<div class="email-category">${e.category}</div>
                      <div class="email-subject">${e.subject}</div>
                      <div class="email-sender">${e.sender}</div>
                      <div class="email-snippet">${e.snippet}</div>`;

    const actionContainer = document.createElement('div');
    actionContainer.className = 'email-action';
    const button = document.createElement('button');
    if (activeTab === 'important') {
      button.textContent = 'Important';
      button.disabled = true;
    } else {
      button.textContent = e.is_important ? 'Important' : 'Mark Important';
      button.disabled = e.is_important;
      if (!e.is_important) {
        button.addEventListener('click', () => markImportant(e.gmail_message_id, true, button));
      }
    }
    actionContainer.appendChild(button);

    li.appendChild(meta);
    li.appendChild(actionContainer);
    emailsEl.appendChild(li);
  }
}

function markImportant(messageId, important, button) {
  chrome.runtime.sendMessage({ type: 'email:markImportant', gmail_message_id: messageId, is_important: important }, (resp) => {
    if (resp && resp.success) {
      button.textContent = important ? 'Important' : 'Marked';
      button.disabled = true;
      statusEl.textContent = 'Email marked important';
    } else {
      console.error('markImportant failed', resp && resp.error);
      statusEl.textContent = 'Mark important failed';
    }
  });
}
