import Auth from './auth.js';
import Gmail from './gmail.js';
import Supabase from '../services/supabase.js';
import Notifications from './notifications.js';

const SYNC_KEY = 'inbox_sentinel_seen_ids';

const Sync = {
  _timer: null,

  async start(intervalSec = 60) {
    console.log('Sync.start()', intervalSec);
    if (this._timer) return;
    // run immediately then schedule
    await this.runOnce();
    this._timer = setInterval(() => this.runOnce(), intervalSec * 1000);
  },

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  async runOnce() {
    try {
      const token = await Auth.getToken();
      if (!token || !token.access_token) return;

      // fetch messages
      const emails = await Gmail.listCategoryMessages(token.access_token, 50);
      const profile = await Gmail.getProfile(token.access_token);
      const userEmail = profile && profile.emailAddress;

      let userId = null;
      let loadedConfig = null;
      const configState = await new Promise((res) => chrome.storage.local.get(['supabase_config', 'supabase_user'], (i) => res(i)));
      const supCfg = configState && configState.supabase_config;
      const savedUser = configState && configState.supabase_user;

      if (savedUser && savedUser.id) {
        userId = savedUser.id;
      }

      if (supCfg && supCfg.url && supCfg.key) {
        Supabase.init({ url: supCfg.url, key: supCfg.key });
        loadedConfig = supCfg;
      } else {
        try {
          const runtimeCfg = await Supabase.loadRuntimeConfig();
          loadedConfig = runtimeCfg;
        } catch (err) {
          // ignore if runtime config not available in development
        }
      }

      const items = await new Promise((res) => chrome.storage.local.get(SYNC_KEY, (i) => res(i)));
      const seen = new Set((items[SYNC_KEY] && items[SYNC_KEY].ids) || []);
      const newIds = [];
      for (const e of emails) {
        if (!seen.has(e.gmail_message_id)) {
          Notifications.notifyNewEmail(e);
          newIds.push(e.gmail_message_id);

          try {
            if (loadedConfig) {
              if (!userId && userEmail) {
                const result = await Supabase.upsertUser({ email: userEmail });
                if (Array.isArray(result) && result.length > 0) {
                  userId = result[0].id;
                } else if (result && result.id) {
                  userId = result.id;
                }
                if (userId) {
                  chrome.storage.local.set({ supabase_user: { id: userId, email: userEmail } });
                }
              }
              const emailPayload = {
                gmail_message_id: e.gmail_message_id,
                sender: e.sender,
                subject: e.subject,
                snippet: e.snippet,
                category: e.category,
                received_at: e.received_at
              };
              if (userId) {
                emailPayload.user_id = userId;
              }
              await Supabase.insertEmail(emailPayload);
            }
          } catch (err) {
            console.warn('Supabase insert failed', err);
          }
        }
      }

      if (newIds.length > 0) {
        const updated = Array.from(new Set([...Array.from(seen), ...newIds]));
        chrome.storage.local.set({ [SYNC_KEY]: { ids: updated } });
      }
    } catch (err) {
      console.error('Sync.runOnce error', err);
    }
  }
};

export default Sync;
