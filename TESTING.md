# Testing Inbox Sentinel

## Unit tests

The repository includes a Jest test suite for the Supabase service.

Run:

```bash
npm install
npm test
```

## Manual end-to-end flow

1. Create a Google OAuth client and update `extension/manifest.json` with the client ID.
2. Load `extension/` as an unpacked extension in Chrome, Edge, Brave, or Opera.
3. Open the extension popup and click `Connect Gmail`.
4. Authorize Gmail read access.
5. Enter your Supabase URL and anon key, then click `Save Settings`.
6. Click `Refresh` to fetch categorized emails.
7. Verify new notification alerts appear when the sync engine detects new emails.
8. Click `Mark Important` on an email.

## Privacy and security checks

- OAuth tokens are stored in `chrome.storage.local`, not Supabase.
- The extension only requests `https://www.googleapis.com/auth/gmail.readonly` plus OpenID scopes.
- The extension stores only metadata: `message id`, sender, subject, snippet, category, and received timestamp.
- The extension does not store full email bodies or attachments.
- Do not embed Supabase `service_role` keys in extension configuration.
