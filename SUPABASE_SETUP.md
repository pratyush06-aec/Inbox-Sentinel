# Supabase Setup for Inbox Sentinel

## Step 1: Create a Supabase project

1. Sign in to Supabase.
2. Create a new project.
3. Choose a password and database region.

## Step 2: Apply the schema

Use the `db/schema.sql` file in this repository to create the required tables.

In the Supabase SQL editor or via psql:

```sql
-- Copy `db/schema.sql` contents and run them in your Supabase database.
```

## Step 3: Set up API keys

1. In the Supabase dashboard, open `Settings > API`.
2. Copy the `anon` public API key.
3. Use this public anon key in the extension popup.

## Step 4: Configure row-level security (recommended)

For a secure production-ready setup, enable RLS and define policies:

### Enable RLS

```sql
alter table users enable row level security;
alter table emails enable row level security;
alter table notifications enable row level security;
alter table sync_state enable row level security;
```

### Basic read policy for emails

```sql
create policy "Select emails for user" on emails
  for select using (auth.uid() = user_id);
```

### Basic insert policy for emails

```sql
create policy "Insert emails" on emails
  for insert with check (auth.uid() = user_id);
```

### Notes

- The current extension prototype stores `user_id` as `NULL` by default.
- For a production version, extend the extension to store and use actual user IDs.
- Do not expose Supabase `service_role` keys in the extension.
