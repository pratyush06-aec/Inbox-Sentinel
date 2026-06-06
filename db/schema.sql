-- Supabase / Postgres schema for Inbox Sentinel

-- users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- emails table
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id text UNIQUE NOT NULL,
  sender text,
  subject text,
  snippet text,
  category text,
  received_at timestamptz,
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email_id uuid REFERENCES emails(id) ON DELETE CASCADE,
  seen boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- sync_state table
CREATE TABLE IF NOT EXISTS sync_state (
  user_id uuid PRIMARY KEY,
  last_history_id text,
  updated_at timestamptz DEFAULT now()
);

-- Ensure extension pgcrypto is available for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;
