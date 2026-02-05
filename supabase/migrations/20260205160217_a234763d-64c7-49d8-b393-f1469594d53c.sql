-- Create table for book club reflections (post-read reviews)
CREATE TABLE public.book_club_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES public.book_club_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each member can only leave one reflection per book
  UNIQUE(suggestion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.book_club_reflections ENABLE ROW LEVEL SECURITY;

-- Members can view reflections for books in their clubs
CREATE POLICY "Members can view club reflections"
ON public.book_club_reflections
FOR SELECT
USING (is_club_member(auth.uid(), club_id));

-- Members can add reflections to books in their clubs
CREATE POLICY "Members can add reflections"
ON public.book_club_reflections
FOR INSERT
WITH CHECK (
  is_club_member(auth.uid(), club_id) 
  AND auth.uid() = user_id
);

-- Users can update their own reflections
CREATE POLICY "Users can update their reflections"
ON public.book_club_reflections
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reflections
CREATE POLICY "Users can delete their reflections"
ON public.book_club_reflections
FOR DELETE
USING (auth.uid() = user_id);

-- Validate content length
CREATE OR REPLACE FUNCTION public.validate_reflection_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content := trim(NEW.content);
  
  IF length(NEW.content) < 1 THEN
    RAISE EXCEPTION 'Reflection content cannot be empty';
  END IF;
  
  IF length(NEW.content) > 280 THEN
    RAISE EXCEPTION 'Reflection content cannot exceed 280 characters';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_reflection_content_trigger
BEFORE INSERT OR UPDATE ON public.book_club_reflections
FOR EACH ROW
EXECUTE FUNCTION public.validate_reflection_content();

-- Update timestamp trigger
CREATE TRIGGER update_reflections_updated_at
BEFORE UPDATE ON public.book_club_reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();