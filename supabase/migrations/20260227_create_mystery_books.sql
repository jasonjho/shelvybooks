-- Mystery Book feature
CREATE TABLE public.mystery_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  -- Clues (visible before unwrap)
  mood_tag TEXT NOT NULL,
  teaser TEXT NOT NULL,
  emoji_clue TEXT NOT NULL,
  -- Book data (hidden until unwrap)
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  isbn TEXT,
  description TEXT,
  categories TEXT[],
  page_count INTEGER,
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending',
  unwrapped_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  -- Reaction (post-unwrap)
  reaction_emoji TEXT,
  reaction_note TEXT,
  reacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.mystery_books ENABLE ROW LEVEL SECURITY;

-- Sender can see their own sent mystery books
CREATE POLICY "Sender can view own sent mystery books"
  ON public.mystery_books FOR SELECT
  USING (auth.uid() = from_user_id);

-- Sender can insert mystery books
CREATE POLICY "Sender can create mystery books"
  ON public.mystery_books FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Sender can delete pending mystery books only
CREATE POLICY "Sender can delete pending mystery books"
  ON public.mystery_books FOR DELETE
  USING (auth.uid() = from_user_id AND status = 'pending');

-- Recipient can see mystery books sent to them
CREATE POLICY "Recipient can view received mystery books"
  ON public.mystery_books FOR SELECT
  USING (auth.uid() = to_user_id);

-- Recipient can update mystery books sent to them (unwrap, accept, decline, react)
CREATE POLICY "Recipient can update received mystery books"
  ON public.mystery_books FOR UPDATE
  USING (auth.uid() = to_user_id);

-- Add last_seen_mystery_books_at to notification_settings
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS last_seen_mystery_books_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z';

-- Enable realtime for mystery_books
ALTER PUBLICATION supabase_realtime ADD TABLE public.mystery_books;
