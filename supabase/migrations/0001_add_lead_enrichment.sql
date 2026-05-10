-- Migration 0001: Add all enrichment fields needed by the concierge bot and dashboard
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS session_id          TEXT,
  ADD COLUMN IF NOT EXISTS interested_property TEXT,
  ADD COLUMN IF NOT EXISTS viewing_property    TEXT,
  ADD COLUMN IF NOT EXISTS interest_level      TEXT DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS channel             TEXT DEFAULT 'webchat',
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS lead_score          INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS purpose             TEXT,
  ADD COLUMN IF NOT EXISTS preferred_location  TEXT,
  ADD COLUMN IF NOT EXISTS objections          TEXT,
  ADD COLUMN IF NOT EXISTS last_message        TEXT,
  ADD COLUMN IF NOT EXISTS client_name         TEXT,
  ADD COLUMN IF NOT EXISTS viewing_booked      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_updated        TIMESTAMPTZ DEFAULT NOW();

-- 2. Add escalated to status enum (safe - IF NOT EXISTS)
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'escalated';

-- 3. Index on session_id for fast lookups
CREATE INDEX IF NOT EXISTS leads_session_id_idx ON leads(session_id);

-- 4. Make first_name and last_name nullable (bot may not have last name)
ALTER TABLE leads
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name  DROP NOT NULL;
