/*
  # Add selected_flight column to travel_groups table

  1. New Column
    - `selected_flight` (jsonb) - Store the selected flight data from itinerary generation

  2. Purpose
    - Store selected flight information for booking process
    - Enable flight booking with specific flight option index
*/

-- Add selected_flight column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS selected_flight JSONB;

-- Add index for selected flight queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_selected_flight 
ON travel_groups USING GIN(selected_flight);