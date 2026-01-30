-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all comments for moderation
CREATE POLICY "Admins can view all comments"
ON public.book_comments
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete any comment for moderation
CREATE POLICY "Admins can delete any comment"
ON public.book_comments
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all books for stats
CREATE POLICY "Admins can view all books"
ON public.books
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all shelf settings
CREATE POLICY "Admins can view all shelf settings"
ON public.shelf_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all likes for stats
CREATE POLICY "Admins can view all likes"
ON public.book_likes
FOR SELECT
USING (has_role(auth.uid(), 'admin'));