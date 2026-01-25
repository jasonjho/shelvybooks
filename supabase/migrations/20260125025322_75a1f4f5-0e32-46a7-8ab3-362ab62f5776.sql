-- Create book_likes table for heart/favorite functionality
CREATE TABLE public.book_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Create book_comments table for comments
CREATE TABLE public.book_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.book_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_comments ENABLE ROW LEVEL SECURITY;

-- Book likes policies (anyone authenticated can see likes, users manage their own)
CREATE POLICY "Anyone can view book likes" 
  ON public.book_likes FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can like books" 
  ON public.book_likes FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" 
  ON public.book_likes FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Book comments policies (anyone authenticated can see, users manage their own)
CREATE POLICY "Anyone can view book comments" 
  ON public.book_comments FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can add comments" 
  ON public.book_comments FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
  ON public.book_comments FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.book_comments FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger for updated_at on comments
CREATE TRIGGER update_book_comments_updated_at
  BEFORE UPDATE ON public.book_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_book_likes_book_id ON public.book_likes(book_id);
CREATE INDEX idx_book_comments_book_id ON public.book_comments(book_id);