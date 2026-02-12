-- Ensure private storage bucket exists for uploaded ZIP sources.

DO $$
BEGIN
  INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
  VALUES (
    'studio-uploads',
    'studio-uploads',
    false,
    52428800,
    ARRAY['application/zip', 'application/x-zip-compressed']
  )
  ON CONFLICT (id) DO UPDATE
  SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION
  WHEN undefined_table THEN
    -- In non-Supabase local DB contexts, storage schema may not exist.
    NULL;
END $$;
