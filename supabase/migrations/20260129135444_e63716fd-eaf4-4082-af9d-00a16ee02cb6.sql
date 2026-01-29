-- Create a public view for shelf_settings that excludes user_id
-- This allows public access to public shelves without exposing internal user IDs

CREATE VIEW public.shelf_settings_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    is_public,
    share_id,
    display_name,
    created_at,
    updated_at
  FROM public.shelf_settings
  WHERE is_public = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.shelf_settings_public TO anon;
GRANT SELECT ON public.shelf_settings_public TO authenticated;

-- Drop the old permissive public policy that exposes user_id
DROP POLICY IF EXISTS "Anyone can view public shelves" ON public.shelf_settings;

-- Add a comment explaining the security design
COMMENT ON VIEW public.shelf_settings_public IS 'Public view of shelf_settings that excludes user_id for privacy. Use this view for unauthenticated public shelf access.';