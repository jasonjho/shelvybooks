-- Add SELECT policy to allow club owners to view their clubs
-- This is needed because the existing SELECT policy only checks membership,
-- but during INSERT with .select(), the membership hasn't been created yet
CREATE POLICY "Owners can view their clubs"
ON public.book_clubs
FOR SELECT
USING (auth.uid() = owner_id);