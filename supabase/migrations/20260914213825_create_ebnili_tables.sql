/*
# Create Ebnili core tables

## Overview
Ebnili is an AI web app builder platform. This migration creates the core
tables for storing generated projects, their version history, subscription
plans, and Orange Cash payment transactions.

## New Tables

### projects
- id (uuid, primary key)
- name (text, not null) — project name
- prompt (text, not null) — the original AI prompt that generated it
- code (text, not null) — generated HTML/CSS/JS code
- template_type (text, default 'blank') — e-commerce, landing-page, dashboard, or blank
- created_at (timestamptz)
- updated_at (timestamptz)

### project_versions
- id (uuid, primary key)
- project_id (uuid, FK to projects, cascade delete)
- version_label (text, not null) — e.g. "v1", "v2"
- prompt (text, not null) — the prompt that produced this version
- code (text, not null) — the code snapshot
- created_at (timestamptz)

### subscriptions
- id (uuid, primary key)
- tier (text, not null) — 'starter' or 'pro'
- status (text, not null, default 'inactive') — 'active' or 'inactive'
- sender_mobile (text) — the user's Orange Cash wallet number
- activated_at (timestamptz)
- created_at (timestamptz)

### transactions
- id (uuid, primary key)
- subscription_id (uuid, FK to subscriptions, cascade delete)
- sender_mobile (text, not null) — user's mobile number
- receipt_code (text, not null) — Orange Cash transaction reference/receipt
- amount (numeric, not null) — payment amount
- status (text, not null, default 'pending') — 'pending', 'verified', 'rejected'
- tier (text, not null) — which tier this payment is for
- created_at (timestamptz)
- reviewed_at (timestamptz)

## Security
- RLS enabled on all tables.
- This is a single-tenant app with no sign-in screen, so all policies
  use TO anon, authenticated with USING (true) — the data is intentionally
  shared/public within this builder instance.
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prompt text NOT NULL,
  code text NOT NULL DEFAULT '',
  template_type text NOT NULL DEFAULT 'blank',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

-- Project versions table
CREATE TABLE IF NOT EXISTS project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  prompt text NOT NULL,
  code text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_versions" ON project_versions;
CREATE POLICY "anon_select_versions" ON project_versions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_versions" ON project_versions;
CREATE POLICY "anon_insert_versions" ON project_versions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_versions" ON project_versions;
CREATE POLICY "anon_update_versions" ON project_versions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_versions" ON project_versions;
CREATE POLICY "anon_delete_versions" ON project_versions FOR DELETE
  TO anon, authenticated USING (true);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'inactive',
  sender_mobile text,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
CREATE POLICY "anon_select_subscriptions" ON subscriptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
CREATE POLICY "anon_insert_subscriptions" ON subscriptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
CREATE POLICY "anon_update_subscriptions" ON subscriptions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;
CREATE POLICY "anon_delete_subscriptions" ON subscriptions FOR DELETE
  TO anon, authenticated USING (true);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  sender_mobile text NOT NULL,
  receipt_code text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  tier text NOT NULL DEFAULT 'starter',
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('user','admin','owner')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Device fingerprints (anti multi-account)
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  ip_address text,
  user_agent text,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  UNIQUE(fingerprint)
);

ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fingerprints_select" ON device_fingerprints FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "fingerprints_insert" ON device_fingerprints FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "fingerprints_update" ON device_fingerprints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fingerprints_fingerprint ON device_fingerprints(fingerprint);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_insert" ON activity_log FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percent numeric(5,2) NOT NULL,
  max_uses integer DEFAULT 100,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_select" ON promo_codes FOR SELECT TO anon, authenticated USING (is_active = true);

-- Activity log function
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO activity_log (user_id, action, details)
  VALUES (p_user_id, p_action, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
