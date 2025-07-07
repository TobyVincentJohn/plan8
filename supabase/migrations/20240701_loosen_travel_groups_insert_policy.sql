/*
  # Loosen RLS policy for inserting into travel_groups (debugging)
  Allows any authenticated user to insert rows into travel_groups.
*/

DROP POLICY IF EXISTS "Users can create travel groups" ON travel_groups;

CREATE POLICY "Allow all authenticated to create travel groups"
  ON travel_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true); 