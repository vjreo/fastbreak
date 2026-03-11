-- Restrict events and venues SELECT to the owning user only.
-- Previously "events_select_all" and "venues_select_all" allowed any
-- authenticated user to read every row. Replace with per-user policies.

-- events
DROP POLICY IF EXISTS "events_select_all" ON events;

CREATE POLICY "events_select_own" ON events
  FOR SELECT USING (auth.uid() = created_by);

-- venues (restrict via event ownership)
DROP POLICY IF EXISTS "venues_select_all" ON venues;

CREATE POLICY "venues_select_own_event" ON venues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = venues.event_id
        AND events.created_by = auth.uid()
    )
  );
