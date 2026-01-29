-- Create book_notes table for personal "staff pick" style notes
CREATE TABLE public.book_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- One note per book per user
  UNIQUE(book_id, user_id)
);

-- Enable RLS
ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;

-- Users can view their own notes
CREATE POLICY "Users can view their own notes"
ON public.book_notes
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can view notes on public shelves
CREATE POLICY "Anyone can view notes on public shelves"
ON public.book_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM books b
    JOIN shelf_settings ss ON ss.user_id = b.user_id
    WHERE b.id = book_notes.book_id
      AND ss.is_public = true
  )
);

-- Users can insert notes on their own books
CREATE POLICY "Users can insert notes on their own books"
ON public.book_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM books WHERE id = book_id AND user_id = auth.uid()
  )
);

-- Users can update their own notes
CREATE POLICY "Users can update their own notes"
ON public.book_notes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
ON public.book_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_book_notes_updated_at
  BEFORE UPDATE ON public.book_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validate note content length
CREATE OR REPLACE FUNCTION public.validate_note_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content := trim(NEW.content);
  
  IF length(NEW.content) < 1 THEN
    RAISE EXCEPTION 'Note content cannot be empty';
  END IF;
  
  IF length(NEW.content) > 200 THEN
    RAISE EXCEPTION 'Note content cannot exceed 200 characters';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_book_note_content
  BEFORE INSERT OR UPDATE ON public.book_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_note_content();