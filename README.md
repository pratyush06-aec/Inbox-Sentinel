# Inbox Sentinel

Manifest V3 Chromium extension scaffold for Inbox Sentinel. This repository contains the extension scaffold, background service worker, Gmail OAuth flow, Supabase helpers, polling sync, notifications, and a review popup UI.

## Getting started

1. Create a Google OAuth client and set `extension/manifest.json` `oauth2.client_id`.
2. Create a Supabase project and apply `db/schema.sql` to your database.
3. In the extension popup, enter your Supabase URL and anon key, then save settings.
4. Load `extension/` as an unpacked extension in Chromium-based browsers.

## Supabase schema

Use `db/schema.sql` to create the required tables: `users`, `emails`, `notifications`, and `sync_state`.

## Packaging and testing

- Run `npm install` to install development dependencies.
- Run `npm test` to execute the Supabase unit tests.
- Run `npm run package` to create `dist/inbox-sentinel.zip`.

## What works now

- Google OAuth sign-in and token storage in `chrome.storage.local`
- Gmail read access for Promotions, Social, and Updates categories
- Supabase REST helper for persisting email metadata
- Periodic sync via `chrome.alarms`
- Browser notifications for new emails
- Popup dashboard with refresh, Supabase settings, and mark-important actions

## Notes

- Do not store Supabase service_role keys in the extension.
- This first version stores only email metadata, not the full email body or attachments.
