-- Add server-side validation for comment content
-- This prevents bypassing client-side validation via direct API calls

-- Create validation function
CREATE OR REPLACE FUNCTION public.validate_comment_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim whitespace first
  NEW.content := trim(NEW.content);
  
  -- Check for empty content
  IF length(NEW.content) < 1 THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;
  
  -- Check for content exceeding max length
  IF length(NEW.content) > 500 THEN
    RAISE EXCEPTION 'Comment content cannot exceed 500 characters';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Create trigger for insert and update
CREATE TRIGGER validate_comment_before_insert
BEFORE INSERT OR UPDATE ON public.book_comments
FOR EACH ROW
EXECUTE FUNCTION public.validate_comment_content();