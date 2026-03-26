-- Migration: 001_initial_schema
-- Created: 2024-01-01
-- Description: Initial schema for xps-hubspot scraping system

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Scrape Jobs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url           TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('company', 'contact', 'event', 'custom')),
  priority      INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  max_retries   INTEGER NOT NULL DEFAULT 3,
  timeout_ms    INTEGER NOT NULL DEFAULT 30000,
  metadata      JSONB,
  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_priority
  ON scrape_jobs (status, priority DESC, created_at ASC);

-- ─── Leads ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url          TEXT NOT NULL,
  company_name        TEXT,
  first_name          TEXT,
  last_name           TEXT,
  email               TEXT,
  phone               TEXT,
  address             TEXT,
  linkedin_url        TEXT,
  website_url         TEXT,
  description         TEXT,
  score               INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  fingerprint         TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'validated', 'rejected', 'synced', 'duplicate')),
  validation_notes    TEXT,
  hubspot_contact_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_fingerprint ON leads (fingerprint);
CREATE INDEX IF NOT EXISTS idx_leads_status       ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_email        ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_score        ON leads (score DESC);

-- ─── Scrape Results (raw) ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scrape_results (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  raw_data    JSONB NOT NULL,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_results_job_id ON scrape_results (job_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE scrape_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_results ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; authenticated users can read
CREATE POLICY "service_role_all_scrape_jobs"    ON scrape_jobs    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_leads"          ON leads          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_scrape_results" ON scrape_results FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_leads" ON leads FOR SELECT USING (auth.role() = 'authenticated');

-- ─── Updated At Trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scrape_jobs_updated_at
  BEFORE UPDATE ON scrape_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
