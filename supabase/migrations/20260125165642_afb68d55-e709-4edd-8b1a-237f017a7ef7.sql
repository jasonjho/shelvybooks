-- Fix generate_share_id function to use gen_random_uuid instead of gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_share_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_id IS NULL THEN
    -- Use first 12 chars of a UUID (after removing hyphens)
    NEW.share_id := replace(gen_random_uuid()::text, '-', '')::varchar(12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;