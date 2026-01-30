-- Add column to track ISBNdb backfill attempts separately from Google Books
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS isbndb_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;