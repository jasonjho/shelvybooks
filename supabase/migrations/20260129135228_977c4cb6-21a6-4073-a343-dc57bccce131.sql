-- Drop the overly permissive policy that exposes all club data
DROP POLICY IF EXISTS "Anyone can view club by invite code" ON public.book_clubs;

-- Create a secure function to lookup club by invite code
-- This only returns minimal info needed for joining (id and name)
CREATE OR REPLACE FUNCTION public.lookup_club_by_invite_code(_invite_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bc.id, bc.name
  FROM public.book_clubs bc
  WHERE bc.invite_code = _invite_code
  LIMIT 1;
$$;