-- Add column to track when user last viewed followed-user books
ALTER TABLE public.notification_settings
ADD COLUMN last_seen_follows_at timestamp with time zone NOT NULL DEFAULT now();