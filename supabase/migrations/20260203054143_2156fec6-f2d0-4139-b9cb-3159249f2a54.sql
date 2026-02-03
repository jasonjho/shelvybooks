-- Create book_recommendations table for pending recommendations
CREATE TABLE public.book_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  message TEXT,
  isbn TEXT,
  description TEXT,
  categories TEXT[],
  page_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Add index for efficient queries
CREATE INDEX idx_book_recommendations_to_user ON public.book_recommendations(to_user_id, status);
CREATE INDEX idx_book_recommendations_from_user ON public.book_recommendations(from_user_id);

-- Enable RLS
ALTER TABLE public.book_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can view recommendations sent to them
CREATE POLICY "Users can view recommendations to them"
ON public.book_recommendations
FOR SELECT
USING (auth.uid() = to_user_id);

-- Users can view recommendations they sent
CREATE POLICY "Users can view recommendations they sent"
ON public.book_recommendations
FOR SELECT
USING (auth.uid() = from_user_id);

-- Authenticated users can send recommendations
CREATE POLICY "Users can send recommendations"
ON public.book_recommendations
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Recipients can update (accept/decline) recommendations sent to them
CREATE POLICY "Recipients can respond to recommendations"
ON public.book_recommendations
FOR UPDATE
USING (auth.uid() = to_user_id);

-- Senders can delete their pending recommendations
CREATE POLICY "Senders can delete pending recommendations"
ON public.book_recommendations
FOR DELETE
USING (auth.uid() = from_user_id AND status = 'pending');

-- Add last_seen timestamp for recommendation notifications
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS last_seen_recommendations_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();