/*
  # Create itinerary_places table for normalized itinerary storage

  Each row represents a single place in a group's itinerary for a specific day.
*/

CREATE TABLE itinerary_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES travel_groups(group_id) ON DELETE CASCADE,
  day_number integer NOT NULL, -- Day of the itinerary (1-based)
  place_number integer NOT NULL, -- Order of the place within the day (1-based)
  place_name text NOT NULL,
  description text,
  time_spent text, -- e.g. '2 hours'
  type text, -- e.g. 'monument', 'food', etc.
  image_link text,
  visit_time text, -- e.g. '10:00 AM'
  coordinates jsonb, -- { lat: ..., lng: ... }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by group and day
CREATE INDEX idx_itinerary_places_group_day ON itinerary_places(group_id, day_number);

-- Index for fast lookup by group
CREATE INDEX idx_itinerary_places_group ON itinerary_places(group_id); 