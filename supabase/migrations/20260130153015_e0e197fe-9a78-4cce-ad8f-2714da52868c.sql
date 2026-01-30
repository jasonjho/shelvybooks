-- Create function to get public shelf owner user_id securely
CREATE OR REPLACE FUNCTION public.get_public_shelf_owner_id(_share_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ss.user_id
  FROM public.shelf_settings ss
  WHERE ss.share_id = _share_id AND ss.is_public = true
  LIMIT 1
$$;