-- Allow anyone to view public shelf settings (needed for public shelf pages)
CREATE POLICY "Anyone can view public shelf settings"
ON public.shelf_settings FOR SELECT
TO anon, authenticated
USING (is_public = true);