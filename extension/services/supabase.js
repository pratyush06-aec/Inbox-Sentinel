// Supabase client helpers for Inbox Sentinel
// Security: Never embed a service_role key in the extension. Use anon/public key only.

const Supabase = {
  init(config) {
    if (!config || !config.url || !config.key) {
      throw new Error('Supabase config requires url and key');
    }
    this.url = config.url.replace(/\/+$/g, '');
    this.key = config.key;
  },

  async _request(table, method = 'POST', body = null, opts = {}) {
    const url = `${this.url}/rest/v1/${table}`;
    const headers = {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      Accept: 'application/json'
    };

    if (body) headers['Content-Type'] = 'application/json';
    if (opts.prefer) headers['Prefer'] = opts.prefer;

    const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`Supabase ${method} ${table} failed: ${resp.status} ${text}`);
      err.status = resp.status;
      throw err;
    }

    if (resp.status === 204) return null;
    return resp.json();
  },

  // Insert email metadata. Uses upsert semantics to avoid duplicates when possible.
  async insertEmail(email) {
    // email should be an object matching the emails table columns
    try {
      const res = await this._request('emails', 'POST', [email], {
        prefer: 'resolution=merge-duplicates,return=representation'
      });
      return res;
    } catch (err) {
      throw err;
    }
  },

  async upsertUser(user) {
    // user: { email }
    try {
      const res = await this._request('users', 'POST', [user], {
        prefer: 'resolution=merge-duplicates,return=representation'
      });
      return res;
    } catch (err) {
      throw err;
    }
  },

  async getImportantEmails(userId) {
    if (!userId) {
      throw new Error('User ID required to fetch important emails');
    }
    const url = `${this.url}/rest/v1/emails?user_id=eq.${encodeURIComponent(userId)}&is_important=eq.true&select=*`;
    const headers = {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      Accept: 'application/json'
    };
    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Supabase getImportantEmails failed: ${resp.status} ${text}`);
    }
    return resp.json();
  },

  async loadRuntimeConfig() {
    const url = chrome.runtime.getURL('runtime-config.json');
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error('Runtime configuration not found');
    }
    const config = await resp.json();
    const normalized = {
      url: config.SUPABASE_URL || config.supabaseUrl,
      key: config.SUPABASE_ANON_KEY || config.supabaseAnonKey
    };
    this.init(normalized);
    return normalized;
  },

  async insertNotification(notification) {
    try {
      const res = await this._request('notifications', 'POST', [notification]);
      return res;
    } catch (err) {
      throw err;
    }
  },

  async markImportantByGmailId(gmailMessageId, isImportant = true) {
    // Use RPC-style PATCH with filter
    const url = `${this.url}/rest/v1/emails?gmail_message_id=eq.${encodeURIComponent(gmailMessageId)}`;
    const headers = {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };

    const resp = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ is_important: isImportant }) });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('Supabase markImportant failed: ' + text);
    }
    return resp.json();
  }
};

export default Supabase;
