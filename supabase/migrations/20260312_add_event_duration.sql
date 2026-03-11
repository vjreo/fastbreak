-- Add duration_minutes to events (nullable, default 60)
ALTER TABLE events ADD COLUMN duration_minutes integer DEFAULT 60;
