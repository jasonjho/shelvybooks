-- Add finished_at timestamp to track when a book was completed
ALTER TABLE public.book_club_suggestions
ADD COLUMN finished_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Backfill: Set finished_at for existing 'read' books to their created_at
UPDATE public.book_club_suggestions
SET finished_at = created_at
WHERE status = 'read' AND finished_at IS NULL;

-- Create a function to handle the lifecycle transition when a book is marked 'read':
-- 1. Set finished_at timestamp
-- 2. Delete all votes on remaining 'suggested' books in the same club
CREATE OR REPLACE FUNCTION public.handle_book_finished()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status transitions TO 'read'
  IF NEW.status = 'read' AND OLD.status != 'read' THEN
    -- Set the finished_at timestamp
    NEW.finished_at := now();

    -- Delete all votes on remaining 'suggested' books in this club
    DELETE FROM public.book_club_votes
    WHERE suggestion_id IN (
      SELECT id FROM public.book_club_suggestions
      WHERE club_id = NEW.club_id
        AND status = 'suggested'
        AND id != NEW.id
    );
  END IF;

  -- If a book is moved BACK from 'read' to another status, clear finished_at
  IF OLD.status = 'read' AND NEW.status != 'read' THEN
    NEW.finished_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_book_status_change
BEFORE UPDATE ON public.book_club_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.handle_book_finished();
