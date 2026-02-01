-- Make all existing shelves public
UPDATE public.shelf_settings SET is_public = true WHERE is_public = false;

-- Change the default for new shelf_settings to always be public
ALTER TABLE public.shelf_settings ALTER COLUMN is_public SET DEFAULT true;