-- Add reading_animation column to shelf_settings
ALTER TABLE shelf_settings
  ADD COLUMN IF NOT EXISTS reading_animation text DEFAULT 'pixie-dust';
