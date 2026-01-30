-- Drop the overly permissive policy that allows anonymous access
DROP POLICY IF EXISTS "Anyone can view profiles with public shelves" ON public.profiles;

-- Create a more restrictive policy requiring authentication
-- Anonymous users can still see public shelf content via RPC functions
CREATE POLICY "Authenticated users can view profiles with public shelves"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND has_public_shelf(user_id));