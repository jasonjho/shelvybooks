-- Create a trigger to automatically add the club owner as a member
-- This ensures the owner can immediately see the club after creation (SELECT policy requires membership)

CREATE OR REPLACE FUNCTION public.add_club_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically add the owner as an 'owner' role member
  INSERT INTO public.book_club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_club_created_add_owner
  AFTER INSERT ON public.book_clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.add_club_owner_as_member();