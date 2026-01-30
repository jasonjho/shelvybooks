-- Create a SECURITY DEFINER function to get public shelf info by share_id
-- This prevents bulk enumeration while still allowing lookup by share_id
CREATE OR REPLACE FUNCTION public.get_public_shelf_info(_share_id text)
RETURNS TABLE(display_name text, share_id text, is_public boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ss.display_name,
    ss.share_id,
    ss.is_public
  FROM public.shelf_settings ss
  WHERE ss.share_id = _share_id AND ss.is_public = true
  LIMIT 1
$$;

-- Drop the overly permissive policy that allows bulk enumeration
DROP POLICY IF EXISTS "Anyone can view public shelf settings" ON public.shelf_settings;