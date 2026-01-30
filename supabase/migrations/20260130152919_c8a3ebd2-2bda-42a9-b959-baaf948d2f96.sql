-- Create follows table
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  -- Prevent self-follows
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Users can view their own follows (who they follow)
CREATE POLICY "Users can view who they follow"
ON public.follows
FOR SELECT
USING (auth.uid() = follower_id);

-- Users can view their followers
CREATE POLICY "Users can view their followers"
ON public.follows
FOR SELECT
USING (auth.uid() = following_id);

-- Users can follow others
CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.follows
FOR DELETE
USING (auth.uid() = follower_id);

-- Follows cannot be updated
CREATE POLICY "Follows cannot be updated"
ON public.follows
FOR UPDATE
USING (false);

-- Admins can view all follows
CREATE POLICY "Admins can view all follows"
ON public.follows
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for efficient lookups
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);