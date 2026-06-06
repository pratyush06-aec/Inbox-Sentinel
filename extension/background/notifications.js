// Notification handling and optional Supabase recording
import Supabase from '../services/supabase.js';

const Notifications = {
  notifyNewEmail(email) {
    const title = `New ${email.category} Email`;
    const options = {
      body: `${email.sender} — ${email.subject}`,
      silent: false,
      data: { gmail_message_id: email.gmail_message_id }
    };

    self.registration.showNotification(title, options);

    // Try to record notification to Supabase if configured
    chrome.storage.local.get('supabase_config', async (items) => {
      try {
        const cfg = items && items.supabase_config;
        if (!cfg || !cfg.url || !cfg.key) return;
        Supabase.init({ url: cfg.url, key: cfg.key });
        // Note: We don't have user_id/email mapping here; callers may update later.
        await Supabase.insertNotification({
          email_id: null,
          seen: false
        });
      } catch (err) {
        console.warn('Failed to record notification', err);
      }
    });
  }
};

export default Notifications;
