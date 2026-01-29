-- Update the generate_invite_code function to also handle empty strings, not just NULL
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Generate invite code if NULL or empty string
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := replace(gen_random_uuid()::text, '-', '')::varchar(8);
  END IF;
  RETURN NEW;
END;
$$;