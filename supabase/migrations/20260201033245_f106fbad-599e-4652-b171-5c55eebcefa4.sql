-- Create function to auto-create shelf_settings when a profile is created
CREATE OR REPLACE FUNCTION public.create_shelf_settings_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shelf_settings (user_id, is_public)
  VALUES (NEW.user_id, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_created_create_shelf_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_shelf_settings_for_profile();

-- Backfill: Create shelf_settings for existing profiles that don't have one
INSERT INTO public.shelf_settings (user_id, is_public)
SELECT p.user_id, true
FROM public.profiles p
LEFT JOIN public.shelf_settings ss ON ss.user_id = p.user_id
WHERE ss.id IS NULL
ON CONFLICT (user_id) DO NOTHING;