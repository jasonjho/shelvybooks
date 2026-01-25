-- Add UPDATE policy to book_likes table
-- Since likes should never be updated (only created or deleted), 
-- we deny all updates with a false condition
CREATE POLICY "Likes cannot be updated" 
ON public.book_likes 
FOR UPDATE 
USING (false);