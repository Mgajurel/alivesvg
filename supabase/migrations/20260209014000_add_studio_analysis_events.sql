-- Analysis telemetry for deterministic/agentic planner runs.

CREATE TABLE IF NOT EXISTS studio_analysis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  icon_id UUID REFERENCES icons(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  engine TEXT NOT NULL CHECK (engine IN ('agentic', 'deterministic')),
  model TEXT,
  prompt_version TEXT,
  planner_version INTEGER,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  fallback_reason TEXT,
  classification JSONB,
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_analysis_events_user_created
  ON studio_analysis_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_analysis_events_icon_created
  ON studio_analysis_events(icon_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_analysis_events_engine_created
  ON studio_analysis_events(engine, created_at DESC);

