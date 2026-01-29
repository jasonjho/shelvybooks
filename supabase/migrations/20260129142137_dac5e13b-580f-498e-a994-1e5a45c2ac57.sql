-- Create a secure function to get public shelf info for a list of user IDs
-- This allows members to see other members' public shelf info without exposing user_id in the view
CREATE OR REPLACE FUNCTION public.get_public_shelf_info_for_users(_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  display_name text,
  share_id text,
  is_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ss.user_id,
    ss.display_name,
    ss.share_id,
    ss.is_public
  FROM public.shelf_settings ss
  WHERE ss.user_id = ANY(_user_ids)
    AND ss.is_public = true
$$;