-- Drop the unused shelf_settings_public view
-- We now use the get_public_shelf_info RPC function instead
DROP VIEW IF EXISTS public.shelf_settings_public;