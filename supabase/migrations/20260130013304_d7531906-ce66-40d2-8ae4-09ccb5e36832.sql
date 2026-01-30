-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create a function to check if a user has a public shelf
CREATE OR REPLACE FUNCTION public.has_public_shelf(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shelf_settings
    WHERE user_id = _user_id AND is_public = true
  )
$$;

-- Create a function to check if two users share a book club
CREATE OR REPLACE FUNCTION public.shares_club_with(_viewer_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_club_members m1
    INNER JOIN public.book_club_members m2 ON m1.club_id = m2.club_id
    WHERE m1.user_id = _viewer_id AND m2.user_id = _profile_user_id
  )
$$;

-- Policy: Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Anyone can view profiles of users with public shelves
CREATE POLICY "Anyone can view profiles with public shelves"
ON public.profiles FOR SELECT
USING (public.has_public_shelf(user_id));

-- Policy: Authenticated users can view profiles of club members
CREATE POLICY "Club members can view each other profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.shares_club_with(auth.uid(), user_id));