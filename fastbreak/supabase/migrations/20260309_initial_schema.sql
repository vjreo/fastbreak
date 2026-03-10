-- Fastbreak Event Dashboard -- 

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- sport_types
CREATE TABLE sport_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

-- events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport_type_id uuid NOT NULL REFERENCES sport_types(id),
  date_time timestamptz NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- venues
CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  sort_order int DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX idx_events_sport_type_id_date_time ON events(sport_type_id, date_time);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_date_time ON events(date_time);
CREATE INDEX idx_venues_event_id_sort_order ON venues(event_id, sort_order);

-- =============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE sport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- sport_types: public read
CREATE POLICY "sport_types_select_all" ON sport_types
  FOR SELECT USING (true);

-- events: SELECT all, INSERT/UPDATE/DELETE only own
CREATE POLICY "events_select_all" ON events
  FOR SELECT USING (true);

CREATE POLICY "events_insert_own" ON events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "events_update_own" ON events
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "events_delete_own" ON events
  FOR DELETE USING (auth.uid() = created_by);

-- venues: same via event ownership (use subquery)
CREATE POLICY "venues_select_all" ON venues
  FOR SELECT USING (true);

CREATE POLICY "venues_insert_own_event" ON venues
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = venues.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "venues_update_own_event" ON venues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = venues.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "venues_delete_own_event" ON venues
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = venues.event_id
      AND events.created_by = auth.uid()
    )
  );

-- =============================================================================
-- 3. TRIGGER: updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. SEED DATA: sport_types
-- =============================================================================

INSERT INTO sport_types (name) VALUES
  ('Soccer'),
  ('Basketball'),
  ('Tennis'),
  ('Volleyball'),
  ('Baseball'),
  ('Football'),
  ('Hockey'),
  ('Swimming'),
  ('Track & Field'),
  ('Lacrosse'),
  ('Rugby'),
  ('Other');
