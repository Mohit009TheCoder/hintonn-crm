-- ==============================================================================
-- Hintonn AI — Real Estate CRM Database Schema for Supabase / PostgreSQL
-- ==============================================================================
-- Run this SQL in your Supabase project's SQL Editor (Dashboard -> SQL Editor)
--
-- Features:
--   - 20 relational & entity tables with primary keys and constraints
--   - JSONB columns for rich dynamic objects (timelines, logs, preferences)
--   - Optimized B-Tree indexes for fast queries
--   - Public / authenticated access policies configured
-- ==============================================================================

-- 1. Stages
CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_idx INTEGER DEFAULT 0
);

-- 2. Team Representatives
CREATE TABLE IF NOT EXISTS team (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  leads_count INTEGER DEFAULT 0
);

-- 3. Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  company_id TEXT DEFAULT 'ashray-group',
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{}'::jsonb,
  avatar TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Projects & Inventory
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  loc TEXT,
  configs JSONB DEFAULT '[]'::jsonb,
  price_min NUMERIC,
  price_max NUMERIC,
  total_units INTEGER,
  available INTEGER,
  possession TEXT,
  units JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Contacts / Leads
CREATE TABLE IF NOT EXISTS contacts (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  project_id BIGINT,
  config TEXT,
  value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'new',
  created_minutes_ago NUMERIC,
  reminder_hours_ago NUMERIC,
  rep TEXT,
  score INTEGER DEFAULT 50,
  tags JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  deal_prob INTEGER DEFAULT 0,
  expected_close TEXT,
  loss_reason TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  commission JSONB DEFAULT '{}'::jsonb,
  wa_log JSONB DEFAULT '[]'::jsonb,
  next_reminder_hour NUMERIC,
  last_reminder_hour NUMERIC,
  reminder_count INTEGER DEFAULT 0,
  days_since INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Voice Calls
CREATE TABLE IF NOT EXISTS calls (
  id BIGINT PRIMARY KEY,
  contact_id BIGINT,
  lead_id BIGINT,
  duration TEXT,
  duration_secs INTEGER,
  notes TEXT,
  rep TEXT,
  outcome TEXT,
  time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Channel Partners
CREATE TABLE IF NOT EXISTS partners (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  type TEXT,
  rating NUMERIC DEFAULT 5,
  deals_closed INTEGER DEFAULT 0,
  total_rev NUMERIC DEFAULT 0,
  commission_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Follow-up Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  due TEXT,
  priority TEXT DEFAULT 'Medium',
  assignee TEXT,
  contact_id BIGINT,
  lead_id BIGINT,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Site Visits
CREATE TABLE IF NOT EXISTS site_visits (
  id BIGINT PRIMARY KEY,
  contact_id BIGINT,
  lead_id BIGINT,
  project_id BIGINT,
  date TEXT,
  time TEXT,
  status TEXT DEFAULT 'Scheduled',
  rep TEXT,
  notes TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. WhatsApp Broadcast Campaigns
CREATE TABLE IF NOT EXISTS broadcasts (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT,
  sent_at TEXT,
  delivered INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  responded INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. WhatsApp Cadence Sequences
CREATE TABLE IF NOT EXISTS sequences (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_event TEXT,
  active_leads INTEGER DEFAULT 0,
  steps JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Digital Brochures
CREATE TABLE IF NOT EXISTS brochures (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  project_id BIGINT,
  file_url TEXT,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. System Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT,
  time TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Lead Acquisition Sources
CREATE TABLE IF NOT EXISTS lead_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost_per_lead NUMERIC DEFAULT 0,
  roi TEXT,
  leads_count INTEGER DEFAULT 0
);

-- 15. Nurture Sequences
CREATE TABLE IF NOT EXISTS nurture_sequences (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_stage TEXT,
  active_leads INTEGER DEFAULT 0,
  steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Nurture Activity Log
CREATE TABLE IF NOT EXISTS nurture_log (
  id BIGINT PRIMARY KEY,
  contact_id BIGINT,
  sequence_id BIGINT,
  step TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT
);

-- 17. SLA Violation Alerts
CREATE TABLE IF NOT EXISTS sla_alerts (
  id BIGINT PRIMARY KEY,
  lead_id BIGINT,
  lead_name TEXT,
  message TEXT,
  alerted_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

-- 18. Lead Activity Feed
CREATE TABLE IF NOT EXISTS lead_activities (
  id BIGINT PRIMARY KEY,
  lead_id BIGINT,
  type TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Payment Milestones
CREATE TABLE IF NOT EXISTS payment_milestones (
  id BIGINT PRIMARY KEY,
  contact_id BIGINT,
  project_id BIGINT,
  milestone_name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'Pending',
  paid_at TIMESTAMPTZ
);

-- 20. Application Settings & Singletons (settings, simulation)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Indexes for High Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage);
CREATE INDEX IF NOT EXISTS idx_contacts_rep ON contacts(rep);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_project_id ON contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_site_visits_status ON site_visits(status);
CREATE INDEX IF NOT EXISTS idx_calls_contact_id ON calls(contact_id);

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================
-- Enable RLS on all tables
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE brochures ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for Service Role (Backend API) & Anon/Authenticated
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
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access for service role and public" ON %I;', tbl);
    EXECUTE format('CREATE POLICY "Allow full access for service role and public" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;
