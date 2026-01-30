-- Create a function to get owner username for a public shelf
CREATE OR REPLACE FUNCTION public.get_public_shelf_owner_username(_share_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username
  FROM public.profiles p
  INNER JOIN public.shelf_settings ss ON ss.user_id = p.user_id
  WHERE ss.share_id = _share_id AND ss.is_public = true
  LIMIT 1
$$;