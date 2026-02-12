-- Per-version evaluation feedback for deterministic/AI ranking loops.

DO $$
BEGIN
  CREATE TYPE icon_version_outcome AS ENUM ('accepted', 'rejected', 'edited');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS icon_version_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_version_id UUID NOT NULL REFERENCES icon_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outcome icon_version_outcome NOT NULL,
  benchmark_key TEXT NOT NULL DEFAULT 'studio-feedback-v1',
  score NUMERIC(5,4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_icon_version_evaluations_unique_user_version
  ON icon_version_evaluations(icon_version_id, user_id);

CREATE INDEX IF NOT EXISTS idx_icon_version_evaluations_user_created
  ON icon_version_evaluations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_icon_version_evaluations_outcome
  ON icon_version_evaluations(outcome);
