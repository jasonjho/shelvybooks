-- Create a secure function to fetch books for a public shelf by share_id
-- This avoids exposing user_id to the client while still allowing book fetching

CREATE OR REPLACE FUNCTION public.get_public_shelf_books(_share_id text)
RETURNS TABLE(
  id uuid,
  title text,
  author text,
  color text,
  status text,
  cover_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    b.title,
    b.author,
    b.color,
    b.status,
    b.cover_url,
    b.created_at
  FROM public.books b
  INNER JOIN public.shelf_settings ss ON ss.user_id = b.user_id
  WHERE ss.share_id = _share_id
    AND ss.is_public = true
  ORDER BY b.created_at ASC;
$$;