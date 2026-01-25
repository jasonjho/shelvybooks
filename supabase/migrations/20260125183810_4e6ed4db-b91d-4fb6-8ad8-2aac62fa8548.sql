-- Fix: Comments on Private Books Are Publicly Visible
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view book comments" ON public.book_comments;

-- Create new policy that respects shelf privacy
CREATE POLICY "Users can view comments on accessible books"
ON public.book_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.books
    JOIN public.shelf_settings ON shelf_settings.user_id = books.user_id
    WHERE books.id = book_comments.book_id
    AND (
      books.user_id = auth.uid() -- Own books
      OR shelf_settings.is_public = true -- Public shelves
    )
  )
);

-- Fix: User Reading Preferences Exposed to Anyone
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view book likes" ON public.book_likes;

-- Create new policy that respects shelf privacy
CREATE POLICY "Users can view likes on accessible books"
ON public.book_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.books
    JOIN public.shelf_settings ON shelf_settings.user_id = books.user_id
    WHERE books.id = book_likes.book_id
    AND (
      books.user_id = auth.uid() -- Own books
      OR shelf_settings.is_public = true -- Public shelves
    )
  )
);