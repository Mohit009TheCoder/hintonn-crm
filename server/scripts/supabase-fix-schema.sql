-- ==============================================================================
-- Hintonn CRM — Supabase Schema Fix / Update Script
-- Run this in Supabase Dashboard → SQL Editor
-- This safely adds any missing columns and fixes all table schemas.
-- ==============================================================================

-- ── contacts table: add ALL missing columns ──────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS duplicate_of BIGINT,
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS nurture_paused BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nurture_sequence_id BIGINT,
  ADD COLUMN IF NOT EXISTS nurture_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS sla_alerted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_temp NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS platform_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS form_id TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_nri BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_by TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT;

-- ── site_visits table: add missing columns ───────────────────────────────────
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS visit_type TEXT DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS rating INTEGER,
  ADD COLUMN IF NOT EXISTS follow_up_date TEXT,
  ADD COLUMN IF NOT EXISTS auto_scheduled BOOLEAN DEFAULT FALSE;

-- ── tasks table: add missing columns ─────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;

-- ── calls table: add missing columns ─────────────────────────────────────────
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS sentiment TEXT;

-- ── partners table: add missing columns ──────────────────────────────────────
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS active_listings INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ── projects table: add missing columns ──────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS rera_number TEXT,
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brochure_url TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS matched_lead_count INTEGER DEFAULT 0;

-- ── users table: add missing columns ─────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS leads_assigned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_closed INTEGER DEFAULT 0;

-- ── nurture_sequences table: add missing columns ──────────────────────────────
ALTER TABLE nurture_sequences
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ── notifications table: add missing columns ──────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS link TEXT;

-- ── Re-create permissive policies (run after column changes) ──────────────────
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'stages', 'team', 'users', 'projects', 'contacts', 'calls',
    'partners', 'tasks', 'site_visits', 'broadcasts', 'sequences',
    'brochures', 'notifications', 'lead_sources', 'nurture_sequences',
    'nurture_log', 'sla_alerts', 'lead_activities', 'payment_milestones',
    'app_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access for service role and public" ON %I;', tbl);
    EXECUTE format('CREATE POLICY "Allow full access for service role and public" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;
