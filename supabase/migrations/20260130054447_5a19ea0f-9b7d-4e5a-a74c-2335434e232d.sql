-- Add column to track when metadata was last attempted
ALTER TABLE public.books 
ADD COLUMN metadata_attempted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying of unattempted books
CREATE INDEX idx_books_metadata_attempted ON public.books (metadata_attempted_at) 
WHERE metadata_attempted_at IS NULL;