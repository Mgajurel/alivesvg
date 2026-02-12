-- AliveSVG studio pipeline schema (M1 foundation)
-- Adds icon sets, icons, icon versions, studio jobs, and job items.

DO $$
BEGIN
  CREATE TYPE icon_source_type AS ENUM ('single', 'zip', 'library');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE icon_set_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE icon_status AS ENUM ('uploaded', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE icon_version_source AS ENUM ('system', 'ai', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE studio_job_type AS ENUM ('zip_ingest', 'animation_generate', 'export_bundle');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE studio_job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS icon_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type icon_source_type NOT NULL DEFAULT 'single',
  source_file_name TEXT,
  source_hash TEXT NOT NULL,
  total_icons INTEGER,
  status icon_set_status NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS icons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_set_id UUID NOT NULL REFERENCES icon_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_svg TEXT,
  source_hash TEXT NOT NULL,
  status icon_status NOT NULL DEFAULT 'uploaded',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS icon_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_id UUID NOT NULL REFERENCES icons(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  source icon_version_source NOT NULL DEFAULT 'system',
  animation_payload JSONB,
  custom_css TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  icon_set_id UUID REFERENCES icon_sets(id) ON DELETE SET NULL,
  job_type studio_job_type NOT NULL,
  status studio_job_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS studio_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES studio_jobs(id) ON DELETE CASCADE,
  icon_id UUID REFERENCES icons(id) ON DELETE SET NULL,
  status studio_job_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_icon_sets_user_source_hash
  ON icon_sets(user_id, source_hash, source_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_icons_set_source_hash
  ON icons(icon_set_id, source_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_icon_versions_icon_version
  ON icon_versions(icon_id, version_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_icon_versions_one_active
  ON icon_versions(icon_id)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_jobs_user_type_idempotency
  ON studio_jobs(user_id, job_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_icon_sets_user_created_at
  ON icon_sets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_icons_set_created_at
  ON icons(icon_set_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_jobs_user_created_at
  ON studio_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_job_items_job_status
  ON studio_job_items(job_id, status);
