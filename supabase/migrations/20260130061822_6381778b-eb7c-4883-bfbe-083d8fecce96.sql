-- Drop and recreate get_public_shelf_books with metadata fields
DROP FUNCTION IF EXISTS public.get_public_shelf_books(text);

CREATE FUNCTION public.get_public_shelf_books(_share_id text)
 RETURNS TABLE(id uuid, title text, author text, color text, status text, cover_url text, created_at timestamp with time zone, page_count integer, isbn text, description text, categories text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    b.id,
    b.title,
    b.author,
    b.color,
    b.status,
    b.cover_url,
    b.created_at,
    b.page_count,
    b.isbn,
    b.description,
    b.categories
  FROM public.books b
  INNER JOIN public.shelf_settings ss ON ss.user_id = b.user_id
  WHERE ss.share_id = _share_id
    AND ss.is_public = true
  ORDER BY b.created_at ASC;
$function$