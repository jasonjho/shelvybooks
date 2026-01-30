-- Allow authenticated users to view public shelf settings
-- This is needed for book_likes/book_comments policies that join on shelf_settings
CREATE POLICY "Authenticated users can view public shelf settings"
ON public.shelf_settings FOR SELECT
USING (auth.uid() IS NOT NULL AND is_public = true);