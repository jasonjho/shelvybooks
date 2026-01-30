-- Add metadata columns to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS page_count integer,
ADD COLUMN IF NOT EXISTS isbn text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS categories text[];