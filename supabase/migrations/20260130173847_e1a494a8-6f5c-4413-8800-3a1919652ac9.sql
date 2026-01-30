-- Add column to track when user last saw new followers
ALTER TABLE public.notification_settings 
ADD COLUMN last_seen_followers_at timestamp with time zone NOT NULL DEFAULT now();