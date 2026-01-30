-- Add DELETE policy for shelf_settings
CREATE POLICY "Users can delete their own shelf settings"
ON public.shelf_settings FOR DELETE
USING (auth.uid() = user_id);