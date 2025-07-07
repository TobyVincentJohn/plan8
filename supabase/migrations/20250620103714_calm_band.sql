/*
  # Add trip_name column and itinerary storage to travel_groups

  1. New Columns
    - `trip_name` (text) - Editable trip name, defaults to "Trip to {destination_display}"
    - `itinerary` (jsonb) - Store the generated itinerary data

  2. Purpose
    - Allow users to customize trip names
    - Store generated itinerary data for persistence
    - Enable real-time trip name updates across all users
*/

-- Add trip_name column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS trip_name TEXT,
ADD COLUMN IF NOT EXISTS itinerary JSONB;

-- Set default trip names for existing records
UPDATE travel_groups 
SET trip_name = CONCAT('Trip to ', destination_display) 
WHERE trip_name IS NULL;

-- Add index for trip name searches
CREATE INDEX IF NOT EXISTS idx_travel_groups_trip_name 
ON travel_groups(trip_name);

-- Add index for itinerary queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_itinerary 
ON travel_groups USING GIN(itinerary);