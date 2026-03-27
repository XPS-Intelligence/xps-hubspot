-- ─── Seeds ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seeds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url              TEXT NOT NULL,
  keywords         TEXT[]   DEFAULT '{}',
  key_phrases      TEXT[]   DEFAULT '{}',
  categories       TEXT[]   DEFAULT '{}',
  state            TEXT,
  city             TEXT,
  zip              TEXT,
  industry         TEXT,
  target_intent    TEXT,
  desired_end_result TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seeds_status      ON seeds (status);
CREATE INDEX IF NOT EXISTS idx_seeds_industry    ON seeds (industry);
CREATE INDEX IF NOT EXISTS idx_seeds_created_at  ON seeds (created_at DESC);

-- ─── Prompts ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  category    TEXT,
  template    TEXT NOT NULL,
  variables   JSONB   NOT NULL DEFAULT '[]',
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  version     INT     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompts_category  ON prompts (category);
CREATE INDEX IF NOT EXISTS idx_prompts_is_active ON prompts (is_active);

-- ─── Pipeline Runs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  seed_ids     UUID[]   DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'pending',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  results      JSONB,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status     ON pipeline_runs (status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created_at ON pipeline_runs (created_at DESC);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE seeds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Service role gets full access
CREATE POLICY "service_role_seeds_all"         ON seeds         FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_prompts_all"       ON prompts       FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_pipeline_runs_all" ON pipeline_runs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Authenticated users: read-only
CREATE POLICY "authenticated_seeds_read"         ON seeds         FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_prompts_read"       ON prompts       FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_pipeline_runs_read" ON pipeline_runs FOR SELECT TO authenticated USING (TRUE);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_seeds_updated_at
  BEFORE UPDATE ON seeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
