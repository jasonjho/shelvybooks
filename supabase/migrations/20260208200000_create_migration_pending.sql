-- Temporary table to track migrated users who need to set a new password.
-- Drop this table once all users have completed migration.
CREATE TABLE public.migration_pending (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE migration_pending ENABLE ROW LEVEL SECURITY;

-- Anon can check by email (needed during login before auth)
CREATE POLICY "Anyone can check migration status"
  ON migration_pending FOR SELECT USING (true);

-- Authenticated users can delete their own row (cleanup after password set)
CREATE POLICY "Users can delete their own migration row"
  ON migration_pending FOR DELETE USING (auth.uid() = user_id);
