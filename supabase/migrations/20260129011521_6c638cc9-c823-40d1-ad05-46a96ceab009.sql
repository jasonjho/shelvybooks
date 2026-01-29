-- Create book_clubs table
CREATE TABLE public.book_clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create book_club_members table
CREATE TABLE public.book_club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Create book_club_suggestions table
CREATE TABLE public.book_club_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  suggested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'reading', 'read')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create book_club_votes table
CREATE TABLE public.book_club_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.book_club_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(suggestion_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.book_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_votes ENABLE ROW LEVEL SECURITY;

-- Helper function to check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_club_members
    WHERE user_id = _user_id AND club_id = _club_id
  )
$$;

-- Helper function to check club ownership
CREATE OR REPLACE FUNCTION public.is_club_owner(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_club_members
    WHERE user_id = _user_id AND club_id = _club_id AND role = 'owner'
  )
$$;

-- RLS Policies for book_clubs
CREATE POLICY "Members can view their clubs"
  ON public.book_clubs FOR SELECT
  USING (public.is_club_member(auth.uid(), id));

CREATE POLICY "Anyone can view club by invite code"
  ON public.book_clubs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create clubs"
  ON public.book_clubs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their clubs"
  ON public.book_clubs FOR UPDATE
  USING (public.is_club_owner(auth.uid(), id));

CREATE POLICY "Owners can delete their clubs"
  ON public.book_clubs FOR DELETE
  USING (public.is_club_owner(auth.uid(), id));

-- RLS Policies for book_club_members
CREATE POLICY "Members can view club members"
  ON public.book_club_members FOR SELECT
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Users can join clubs"
  ON public.book_club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs"
  ON public.book_club_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can remove members"
  ON public.book_club_members FOR DELETE
  USING (public.is_club_owner(auth.uid(), club_id));

-- RLS Policies for book_club_suggestions
CREATE POLICY "Members can view suggestions"
  ON public.book_club_suggestions FOR SELECT
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Members can add suggestions"
  ON public.book_club_suggestions FOR INSERT
  WITH CHECK (public.is_club_member(auth.uid(), club_id) AND auth.uid() = suggested_by);

CREATE POLICY "Suggesters can delete their suggestions"
  ON public.book_club_suggestions FOR DELETE
  USING (auth.uid() = suggested_by);

CREATE POLICY "Owners can update suggestion status"
  ON public.book_club_suggestions FOR UPDATE
  USING (public.is_club_owner(auth.uid(), club_id));

-- RLS Policies for book_club_votes
CREATE POLICY "Members can view votes"
  ON public.book_club_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.book_club_suggestions s
    WHERE s.id = suggestion_id AND public.is_club_member(auth.uid(), s.club_id)
  ));

CREATE POLICY "Members can vote"
  ON public.book_club_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.book_club_suggestions s
      WHERE s.id = suggestion_id AND public.is_club_member(auth.uid(), s.club_id)
    )
  );

CREATE POLICY "Users can remove their votes"
  ON public.book_club_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_book_clubs_updated_at
  BEFORE UPDATE ON public.book_clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := replace(gen_random_uuid()::text, '-', '')::varchar(8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_club_invite_code
  BEFORE INSERT ON public.book_clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invite_code();