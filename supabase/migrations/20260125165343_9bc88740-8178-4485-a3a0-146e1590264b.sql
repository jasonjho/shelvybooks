-- Create shelf_settings table for public sharing
CREATE TABLE public.shelf_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_id TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shelf_settings ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own settings
CREATE POLICY "Users can view their own shelf settings"
ON public.shelf_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shelf settings"
ON public.shelf_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shelf settings"
ON public.shelf_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Anyone can view public shelf settings (to look up by share_id)
CREATE POLICY "Anyone can view public shelves"
ON public.shelf_settings FOR SELECT
USING (is_public = true);

-- Allow anyone to view books on public shelves
CREATE POLICY "Anyone can view books on public shelves"
ON public.books FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shelf_settings
    WHERE shelf_settings.user_id = books.user_id
    AND shelf_settings.is_public = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_shelf_settings_updated_at
BEFORE UPDATE ON public.shelf_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Generate unique share_id function
CREATE OR REPLACE FUNCTION public.generate_share_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_id IS NULL THEN
    NEW.share_id := encode(gen_random_bytes(6), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-generate share_id on insert
CREATE TRIGGER generate_shelf_share_id
BEFORE INSERT ON public.shelf_settings
FOR EACH ROW
EXECUTE FUNCTION public.generate_share_id();