-- Venue catalog: reusable venues users can select from
CREATE TABLE venue_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Add venue_catalog_id to venues (nullable for backward compat and custom venues)
ALTER TABLE venues
  ADD COLUMN venue_catalog_id uuid REFERENCES venue_catalog(id) ON DELETE SET NULL;

CREATE INDEX idx_venue_catalog_name ON venue_catalog(name);
CREATE INDEX idx_venues_venue_catalog_id ON venues(venue_catalog_id);

-- RLS for venue_catalog
ALTER TABLE venue_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_catalog_select_all" ON venue_catalog
  FOR SELECT USING (true);

CREATE POLICY "venue_catalog_insert_authenticated" ON venue_catalog
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Migrate existing venues into catalog and link them
INSERT INTO venue_catalog (name, address)
SELECT DISTINCT name, address FROM venues;

-- Note: PostgreSQL doesn't have unique on (name, address) by default.
-- Link venues to catalog by matching name and address
UPDATE venues v
SET venue_catalog_id = vc.id
FROM venue_catalog vc
WHERE v.name = vc.name
  AND (v.address IS NOT DISTINCT FROM vc.address)
  AND v.venue_catalog_id IS NULL;
