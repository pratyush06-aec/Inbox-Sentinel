// Background service worker for Inbox Sentinel (MV3)
// This file wires up message listeners and acts as the central entrypoint.

import Auth from './auth.js';
import Gmail from './gmail.js';
import Supabase from '../services/supabase.js';
import Sync from './sync.js';

console.log('Inbox Sentinel service worker starting');

self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  self.skipWaiting();
  chrome.alarms.create('sync', { when: Date.now() + 1000, periodInMinutes: 1 });
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync') {
    Sync.runOnce().catch((err) => console.error('Sync alarm error', err));
  }
});

// Handle runtime messages from popup and other extension contexts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'auth:connect') {
    Auth.signIn()
      .then((record) => sendResponse({ success: true, record }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    // indicate we will send response asynchronously
    return true;
  }
  if (message && message.type === 'auth:getStatus') {
    Auth.getToken()
      .then((token) => sendResponse({ success: true, token }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message && message.type === 'gmail:fetch') {
    Auth.getToken()
      .then((token) => {
        if (!token || !token.access_token) throw new Error('not_authenticated');
        return Gmail.listCategoryMessages(token.access_token, message.maxResults || 20);
      })
      .then((emails) => sendResponse({ success: true, emails }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (message && message.type === 'config:supabase') {
    const cfg = message.config;
    chrome.storage.local.set({ supabase_config: cfg }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message && message.type === 'supabase:getImportant') {
    chrome.storage.local.get(['supabase_config', 'supabase_user'], async (items) => {
      const cfg = items && items.supabase_config;
      let user = items && items.supabase_user;
      try {
        if (cfg && cfg.url && cfg.key) {
          Supabase.init({ url: cfg.url, key: cfg.key });
        } else {
          await Supabase.loadRuntimeConfig();
        }

        if (!user || !user.id) {
          sendResponse({ success: false, error: 'user_not_found' });
          return;
        }

        const emails = await Supabase.getImportantEmails(user.id);
        sendResponse({ success: true, emails });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  if (message && message.type === 'email:markImportant') {
    const { gmail_message_id, is_important } = message;
    chrome.storage.local.get('supabase_config', (items) => {
      const cfg = items && items.supabase_config;
      if (cfg && cfg.url && cfg.key) {
        try {
          Supabase.init({ url: cfg.url, key: cfg.key });
          Supabase.markImportantByGmailId(gmail_message_id, is_important)
            .then((r) => sendResponse({ success: true, result: r }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      } else {
        sendResponse({ success: false, error: 'supabase_not_configured' });
      }
    });
    return true;
  }

  return false;
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = chrome.runtime.getURL('popup/popup.html');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
