-- Add completed_at column to track when a book was finished
ALTER TABLE public.books
ADD COLUMN completed_at timestamp with time zone;