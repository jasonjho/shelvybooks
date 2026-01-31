-- Add appearance columns to shelf_settings for shareable visual customization
ALTER TABLE public.shelf_settings
ADD COLUMN IF NOT EXISTS shelf_skin text DEFAULT 'oak',
ADD COLUMN IF NOT EXISTS background_theme text DEFAULT 'office',
ADD COLUMN IF NOT EXISTS show_bookends boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_wood_grain boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_ambient_light boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_plant boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS decor_density text DEFAULT 'balanced';

-- Create RPC function to get public shelf appearance
CREATE OR REPLACE FUNCTION public.get_public_shelf_appearance(_share_id text)
RETURNS TABLE(
  shelf_skin text,
  background_theme text,
  show_bookends boolean,
  show_wood_grain boolean,
  show_ambient_light boolean,
  show_plant boolean,
  decor_density text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ss.shelf_skin,
    ss.background_theme,
    ss.show_bookends,
    ss.show_wood_grain,
    ss.show_ambient_light,
    ss.show_plant,
    ss.decor_density
  FROM public.shelf_settings ss
  WHERE ss.share_id = _share_id
    AND ss.is_public = true
  LIMIT 1
$$;