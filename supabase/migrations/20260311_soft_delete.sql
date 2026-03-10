-- Soft delete: add deleted_at to main tables
-- NULL = active, non-null = deleted at that timestamp

ALTER TABLE events ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE venue_catalog ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE sport_types ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE venues ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Partial indexes for active records (better query performance)
CREATE INDEX idx_events_active ON events(date_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_venue_catalog_active ON venue_catalog(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_active ON venues(event_id, sort_order) WHERE deleted_at IS NULL;

-- Update RLS: only expose non-deleted rows
DROP POLICY IF EXISTS "events_select_all" ON events;
CREATE POLICY "events_select_all" ON events
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "venue_catalog_select_all" ON venue_catalog;
CREATE POLICY "venue_catalog_select_all" ON venue_catalog
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "sport_types_select_all" ON sport_types;
CREATE POLICY "sport_types_select_all" ON sport_types
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "venues_select_all" ON venues;
CREATE POLICY "venues_select_all" ON venues
  FOR SELECT USING (deleted_at IS NULL);
