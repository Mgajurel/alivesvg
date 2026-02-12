-- Usage metering for AI generations, batch jobs, and exports.

DO $$
BEGIN
  CREATE TYPE studio_meter_event_type AS ENUM (
    'ai_generation',
    'deterministic_generation',
    'zip_ingest_job',
    'export_bundle'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS studio_metering_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type studio_meter_event_type NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_metering_events_user_event_created
  ON studio_metering_events(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_metering_events_user_created
  ON studio_metering_events(user_id, created_at DESC);

